/**
 * @file This file is the single source of truth for all database interactions.
 * It abstracts the Firestore logic away from the main application logic.
 */
import { getDb } from './services';
import { FieldValue } from 'firebase-admin/firestore';


// --- TYPES ---
export type ProjectSettings = {
    projectName: string;
    admins?: number[];
    welcomeMessage: string;
    timeout: number;
    retries: number;
    rules?: string;
    blacklistedWords?: string[];
    warnings: number;
    muteDuration: number;
    logChannelId?: string;
    schemaVersion?: number; // Added for migrations
};

export type GroupSettingOverride = {
    projectId: string;
    welcomeMessage?: string;
    rules?: string;
};

export type EffectiveSettings = ProjectSettings & Partial<GroupSettingOverride>;

export type UserSession = {
    action: string;
    projectId?: string; 
    chatId?: number;
    messageId?: number;
    correctEmoji?: string;
    originalChatId?: number;
};

export type BanInfo = {
    bannedAt: Date;
    bannedFrom: number;
};

export type GroupInfo = {
    projectId: string;
    groupName: string;
    chatId: number;
}

export type UserData = {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    firstSeenAt?: FieldValue;
    lastSeenAt?: FieldValue;
}

// --- COLLECTION REFERENCES ---
const getCollection = (name: string) => getDb().collection(name);
const getProjectSubCollection = (projectId: string, subCollection: string) => getDb().collection('projects').doc(projectId).collection(subCollection);


// --- USER FUNCTIONS ---

export async function createOrUpdateUser(userData: Omit<UserData, 'firstSeenAt' | 'lastSeenAt'>): Promise<void> {
    const usersCol = getCollection('users');
    const userRef = usersCol.doc(String(userData.id));
    // Set the last seen timestamp on every update.
    // Use a transaction to safely set `firstSeenAt` only once.
    await getDb().runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
            // Document doesn't exist, this is a new user.
            transaction.set(userRef, {
                ...userData,
                firstSeenAt: FieldValue.serverTimestamp(),
                lastSeenAt: FieldValue.serverTimestamp(),
            });
        } else {
            // Document exists, just update lastSeenAt.
            transaction.update(userRef, {
                ...userData,
                lastSeenAt: FieldValue.serverTimestamp(),
            });
        }
    });
}


// --- PROJECT & GROUP FUNCTIONS ---

export async function isUserAdminOfAnyProject(userId: number): Promise<boolean> {
    const projectsCol = getCollection('projects');
    const snapshot = await projectsCol.where('admins', 'array-contains', userId).limit(1).get();
    return !snapshot.empty;
}

export async function getProjectByChatId(chatId: string): Promise<string | undefined> {
    const groupsCol = getCollection('groups');
    const snapshot = await groupsCol.where('chatId', '==', Number(chatId)).limit(1).get();
    if (snapshot.empty) return undefined;
    return snapshot.docs[0].data().projectId;
}

export async function getProjectSettings(projectId: string): Promise<ProjectSettings | undefined> {
    const projectsCol = getCollection('projects');
    const doc = await projectsCol.doc(projectId).get();
    if (!doc.exists) return undefined;
    return doc.data() as ProjectSettings;
}

export async function updateProjectSettings(projectId: string, settings: Partial<ProjectSettings>): Promise<void> {
    const projectsCol = getCollection('projects');
    await projectsCol.doc(projectId).set(settings, { merge: true });
}

export async function createNewProject(chatId: number, groupName: string, adminId: number): Promise<string> {
    const projectsCol = getCollection('projects');
    const groupsCol = getCollection('groups');
    const projectRef = projectsCol.doc();
    const groupRef = groupsCol.doc(String(chatId));

    await getDb().runTransaction(async (transaction) => {
        transaction.set(projectRef, {
            projectName: groupName,
            admins: [adminId], // Add the creator as the first admin
            welcomeMessage: `Welcome, {username}! Please solve the CAPTCHA to get access to ${groupName}.`,
            timeout: 120,
            retries: 3,
            rules: '1. Be respectful.\n2. No spam or self-promotion.',
            blacklistedWords: [],
            warnings: 3,
            muteDuration: 14,
            schemaVersion: 1, // Set initial schema version
        });
        transaction.set(groupRef, {
            projectId: projectRef.id,
            groupName: groupName,
            chatId: chatId,
        });
    });

    return projectRef.id;
}

export async function getGroupsForProject(projectId: string): Promise<GroupInfo[]> {
    const groupsCol = getCollection('groups');
    const snapshot = await groupsCol.where('projectId', '==', projectId).get();
    return snapshot.docs.map(doc => doc.data() as GroupInfo);
}

export async function addGroupToProject(projectId: string, chatId: string, groupName: string): Promise<void> {
    const groupsCol = getCollection('groups');
    const groupRef = groupsCol.doc(chatId);
    await groupRef.set({
        projectId,
        groupName,
        chatId: Number(chatId)
    });
}

// --- SETTINGS OVERRIDE FUNCTIONS ---

export async function getGroupSettingOverride(chatId: number): Promise<Partial<GroupSettingOverride> | undefined> {
    const groupOverridesCol = getCollection('group_settings_overrides');
    const doc = await groupOverridesCol.doc(String(chatId)).get();
    if (!doc.exists) return undefined;
    return doc.data();
}

export async function updateGroupSettingOverride(chatId: number, settings: Partial<Omit<GroupSettingOverride, 'projectId'>>): Promise<void> {
    const groupOverridesCol = getCollection('group_settings_overrides');
    const projectId = await getProjectByChatId(String(chatId));
    if (!projectId) throw new Error("Group is not linked to a project.");
    await groupOverridesCol.doc(String(chatId)).set({ ...settings, projectId }, { merge: true });
}

export async function getEffectiveSettings(projectId: string, chatId: number): Promise<EffectiveSettings | undefined> {
    const projectSettings = await getProjectSettings(projectId);
    if (!projectSettings) return undefined;

    const groupOverrides = await getGroupSettingOverride(chatId);

    return { ...projectSettings, ...groupOverrides };
}

// --- USER SESSION & VERIFICATION FUNCTIONS ---

export async function getUserSession(userId: number): Promise<UserSession | undefined> {
    const sessionsCol = getCollection('user_sessions');
    const doc = await sessionsCol.doc(String(userId)).get();
    if (!doc.exists) return undefined;
    return doc.data() as UserSession;
}

export async function setUserSession(userId: number, session: UserSession): Promise<void> {
    const sessionsCol = getCollection('user_sessions');
    await sessionsCol.doc(String(userId)).set(session);
}

export async function clearUserSession(userId: number): Promise<void> {
    const sessionsCol = getCollection('user_sessions');
    await sessionsCol.doc(String(userId)).delete();
}

export async function isUserVerified(projectId: string, userId: number): Promise<boolean> {
    const verifiedUsersCol = getProjectSubCollection(projectId, 'verified_users');
    const doc = await verifiedUsersCol.doc(String(userId)).get();
    return doc.exists;
}

export async function setUserAsVerified(projectId: string, userId: number): Promise<void> {
    const verifiedUsersCol = getProjectSubCollection(projectId, 'verified_users');
    await verifiedUsersCol.doc(String(userId)).set({ verifiedAt: new Date() });
}

export async function unverifyUser(projectId: string, userId: number): Promise<boolean> {
    const verifiedUsersCol = getProjectSubCollection(projectId, 'verified_users');
    const docRef = verifiedUsersCol.doc(String(userId));
    const doc = await docRef.get();
    if (doc.exists) {
        await docRef.delete();
        return true;
    }
    return false;
}

export async function incrementVerificationAttempts(projectId: string, userId: number): Promise<number> {
    const verificationAttemptsCol = getProjectSubCollection(projectId, 'verification_attempts');
    const ref = verificationAttemptsCol.doc(String(userId));
    const doc = await ref.get();
    const currentAttempts = doc.exists ? doc.data()!.count : 0;
    const newAttempts = currentAttempts + 1;
    await ref.set({ count: newAttempts });
    return newAttempts;
}

export async function clearVerificationAttempts(projectId: string, userId: number): Promise<void> {
    const verificationAttemptsCol = getProjectSubCollection(projectId, 'verification_attempts');
    await verificationAttemptsCol.doc(String(userId)).delete();
}


// --- BAN & MODERATION FUNCTIONS ---

export async function getBanInfo(projectId: string, userId: number): Promise<BanInfo | undefined> {
    const bannedUsersCol = getProjectSubCollection(projectId, 'banned_users');
    const doc = await bannedUsersCol.doc(String(userId)).get();
    if (!doc.exists) return undefined;
    const data = doc.data() as { bannedAt: FirebaseFirestore.Timestamp, bannedFrom: number };
    return { bannedAt: data.bannedAt.toDate(), bannedFrom: data.bannedFrom };
}

export async function banUser(projectId: string, userId: number, chatId: number): Promise<void> {
    const bannedUsersCol = getProjectSubCollection(projectId, 'banned_users');
    await bannedUsersCol.doc(String(userId)).set({
        bannedAt: new Date(),
        bannedFrom: chatId,
    });
}

export async function unbanUser(projectId: string, userId: number): Promise<boolean> {
    const bannedUsersCol = getProjectSubCollection(projectId, 'banned_users');
    const docRef = bannedUsersCol.doc(String(userId));
    const doc = await docRef.get();
    if (doc.exists) {
        await docRef.delete();
        return true;
    }
    return false;
}

export async function addBlacklistedWord(projectId: string, word: string): Promise<void> {
    const projectsCol = getCollection('projects');
    await projectsCol.doc(projectId).update({
        blacklistedWords: FieldValue.arrayUnion(word.toLowerCase())
    });
}

export async function removeBlacklistedWord(projectId: string, word: string): Promise<boolean> {
    const projectsCol = getCollection('projects');
    const projectRef = projectsCol.doc(projectId);
    const projectDoc = await projectRef.get();
    const currentWords = projectDoc.data()?.blacklistedWords || [];

    if (currentWords.includes(word.toLowerCase())) {
        await projectRef.update({
            blacklistedWords: FieldValue.arrayRemove(word.toLowerCase())
        });
        return true;
    }
    return false;
}

export async function incrementBlacklistWarnings(projectId: string, userId: number): Promise<number> {
    const blacklistWarningsCol = getProjectSubCollection(projectId, 'blacklist_warnings');
    const ref = blacklistWarningsCol.doc(String(userId));
    const newCount = await getDb().runTransaction(async (t) => {
        const doc = await t.get(ref);
        const currentCount = doc.exists ? doc.data()!.count : 0;
        const newCount = currentCount + 1;
        t.set(ref, { count: newCount, lastWarning: new Date() });
        return newCount;
    });
    return newCount;
}

export async function resetBlacklistWarnings(projectId: string, userId: number): Promise<void> {
    const blacklistWarningsCol = getProjectSubCollection(projectId, 'blacklist_warnings');
    await blacklistWarningsCol.doc(String(userId)).delete();
}

export async function incrementWarningCount(projectId: string, userId: number): Promise<number> {
    const warningCountsCol = getProjectSubCollection(projectId, 'warning_counts');
    const ref = warningCountsCol.doc(String(userId));
    const newCount = await getDb().runTransaction(async (t) => {
        const doc = await t.get(ref);
        const currentCount = doc.exists ? doc.data()!.count : 0;
        const newCount = currentCount + 1;
        t.set(ref, { count: newCount, lastWarning: new Date() });
        return newCount;
    });
    return newCount;
}

// --- LOCKING FUNCTIONS ---

export async function isProjectCreationLocked(chatId: number): Promise<boolean> {
    const locksCol = getCollection('group_locks');
    const doc = await locksCol.doc(String(chatId)).get();
    return doc.exists;
}

export async function lockProjectCreation(chatId: number): Promise<void> {
    const locksCol = getCollection('group_locks');
    const expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 5);
    await locksCol.doc(String(chatId)).set({ lockedAt: new Date(), expireAt });
}

export async function clearProjectCreationLock(chatId: number): Promise<void> {
    const locksCol = getCollection('group_locks');
    await locksCol.doc(String(chatId)).delete();
}

// --- DATA PRIVACY & DELETION ---
export async function deleteUserData(projectId: string, userId: number): Promise<void> {
    const sessionsCol = getCollection('user_sessions');
    const userIdStr = String(userId);
    const batch = getDb().batch();

    // List of collections to delete the user's document from
    const collectionsToDeleteFrom = [
        getProjectSubCollection(projectId, 'verified_users'),
        getProjectSubCollection(projectId, 'banned_users'),
        getProjectSubCollection(projectId, 'warning_counts'),
        getProjectSubCollection(projectId, 'blacklist_warnings'),
        getProjectSubCollection(projectId, 'verification_attempts')
    ];

    for (const collection of collectionsToDeleteFrom) {
        batch.delete(collection.doc(userIdStr));
    }
    
    // Also delete the user's session if it exists
    batch.delete(sessionsCol.doc(userIdStr));
    
    await batch.commit();
}

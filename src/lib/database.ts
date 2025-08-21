/**
 * @file This file is the single source of truth for all database interactions.
 * It abstracts the Firestore logic away from the main application logic.
 */
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from './services';


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

// --- PROJECT & GROUP FUNCTIONS ---

export async function isUserAdminOfAnyProject(userId: number): Promise<boolean> {
    const db = await getDb();
    const projectsCol = db.collection('projects');
    const snapshot = await projectsCol.where('admins', 'array-contains', userId).limit(1).get();
    return !snapshot.empty;
}

export async function getProjectByChatId(chatId: string): Promise<string | undefined> {
    const db = await getDb();
    const groupsCol = db.collection('groups');
    const snapshot = await groupsCol.where('chatId', '==', Number(chatId)).limit(1).get();
    if (snapshot.empty) return undefined;
    return snapshot.docs[0].data().projectId;
}

export async function getProjectSettings(projectId: string): Promise<ProjectSettings | undefined> {
    const db = await getDb();
    const projectsCol = db.collection('projects');
    const doc = await projectsCol.doc(projectId).get();
    if (!doc.exists) return undefined;
    return doc.data() as ProjectSettings;
}

export async function updateProjectSettings(projectId: string, settings: Partial<ProjectSettings>): Promise<void> {
    const db = await getDb();
    const projectsCol = db.collection('projects');
    await projectsCol.doc(projectId).set(settings, { merge: true });
}

export async function createNewProject(chatId: number, groupName: string, adminId: number): Promise<string> {
    const db = await getDb();
    const projectsCol = db.collection('projects');
    const groupsCol = db.collection('groups');
    const projectRef = projectsCol.doc();
    const groupRef = groupsCol.doc(String(chatId));

    await db.runTransaction(async (transaction) => {
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
    const db = await getDb();
    const groupsCol = db.collection('groups');
    const snapshot = await groupsCol.where('projectId', '==', projectId).get();
    return snapshot.docs.map(doc => doc.data() as GroupInfo);
}

export async function addGroupToProject(projectId: string, chatId: string, groupName: string): Promise<void> {
    const db = await getDb();
    const groupsCol = db.collection('groups');
    const groupRef = groupsCol.doc(chatId);
    await groupRef.set({
        projectId,
        groupName,
        chatId: Number(chatId)
    });
}

// --- SETTINGS OVERRIDE FUNCTIONS ---

export async function getGroupSettingOverride(chatId: number): Promise<Partial<GroupSettingOverride> | undefined> {
    const db = await getDb();
    const groupOverridesCol = db.collection('group_settings_overrides');
    const doc = await groupOverridesCol.doc(String(chatId)).get();
    if (!doc.exists) return undefined;
    return doc.data();
}

export async function updateGroupSettingOverride(chatId: number, settings: Partial<Omit<GroupSettingOverride, 'projectId'>>): Promise<void> {
    const db = await getDb();
    const groupOverridesCol = db.collection('group_settings_overrides');
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
    const db = await getDb();
    const sessionsCol = db.collection('user_sessions');
    const doc = await sessionsCol.doc(String(userId)).get();
    if (!doc.exists) return undefined;
    return doc.data() as UserSession;
}

export async function setUserSession(userId: number, session: UserSession): Promise<void> {
    const db = await getDb();
    const sessionsCol = db.collection('user_sessions');
    await sessionsCol.doc(String(userId)).set(session);
}

export async function clearUserSession(userId: number): Promise<void> {
    const db = await getDb();
    const sessionsCol = db.collection('user_sessions');
    await sessionsCol.doc(String(userId)).delete();
}

export async function isUserVerified(projectId: string, userId: number): Promise<boolean> {
    const db = await getDb();
    const projectsCol = db.collection('projects');
    const verifiedUsersCol = (projectId: string) => projectsCol.doc(projectId).collection('verified_users');
    const doc = await verifiedUsersCol(projectId).doc(String(userId)).get();
    return doc.exists;
}

export async function setUserAsVerified(projectId: string, userId: number): Promise<void> {
    const db = await getDb();
    const projectsCol = db.collection('projects');
    const verifiedUsersCol = (projectId: string) => projectsCol.doc(projectId).collection('verified_users');
    await verifiedUsersCol(projectId).doc(String(userId)).set({ verifiedAt: new Date() });
}

export async function unverifyUser(projectId: string, userId: number): Promise<boolean> {
    const db = await getDb();
    const projectsCol = db.collection('projects');
    const verifiedUsersCol = (projectId: string) => projectsCol.doc(projectId).collection('verified_users');
    const docRef = verifiedUsersCol(projectId).doc(String(userId));
    const doc = await docRef.get();
    if (doc.exists) {
        await docRef.delete();
        return true;
    }
    return false;
}

export async function incrementVerificationAttempts(projectId: string, userId: number): Promise<number> {
    const db = await getDb();
    const projectsCol = db.collection('projects');
    const verificationAttemptsCol = (projectId: string) => projectsCol.doc(projectId).collection('verification_attempts');
    const ref = verificationAttemptsCol(projectId).doc(String(userId));
    const doc = await ref.get();
    const currentAttempts = doc.exists ? doc.data()!.count : 0;
    const newAttempts = currentAttempts + 1;
    await ref.set({ count: newAttempts });
    return newAttempts;
}

export async function clearVerificationAttempts(projectId: string, userId: number): Promise<void> {
    const db = await getDb();
    const projectsCol = db.collection('projects');
    const verificationAttemptsCol = (projectId: string) => projectsCol.doc(projectId).collection('verification_attempts');
    await verificationAttemptsCol(projectId).doc(String(userId)).delete();
}


// --- BAN & MODERATION FUNCTIONS ---

export async function getBanInfo(projectId: string, userId: number): Promise<BanInfo | undefined> {
    const db = await getDb();
    const projectsCol = db.collection('projects');
    const bannedUsersCol = (projectId: string) => projectsCol.doc(projectId).collection('banned_users');
    const doc = await bannedUsersCol(projectId).doc(String(userId)).get();
    if (!doc.exists) return undefined;
    const data = doc.data() as { bannedAt: FirebaseFirestore.Timestamp, bannedFrom: number };
    return { bannedAt: data.bannedAt.toDate(), bannedFrom: data.bannedFrom };
}

export async function banUser(projectId: string, userId: number, chatId: number): Promise<void> {
    const db = await getDb();
    const projectsCol = db.collection('projects');
    const bannedUsersCol = (projectId: string) => projectsCol.doc(projectId).collection('banned_users');
    await bannedUsersCol(projectId).doc(String(userId)).set({
        bannedAt: new Date(),
        bannedFrom: chatId,
    });
}

export async function unbanUser(projectId: string, userId: number): Promise<boolean> {
    const db = await getDb();
    const projectsCol = db.collection('projects');
    const bannedUsersCol = (projectId: string) => projectsCol.doc(projectId).collection('banned_users');
    const docRef = bannedUsersCol(projectId).doc(String(userId));
    const doc = await docRef.get();
    if (doc.exists) {
        await docRef.delete();
        return true;
    }
    return false;
}

export async function addBlacklistedWord(projectId: string, word: string): Promise<void> {
    const db = await getDb();
    const projectsCol = db.collection('projects');
    await projectsCol.doc(projectId).update({
        blacklistedWords: FieldValue.arrayUnion(word.toLowerCase())
    });
}

export async function removeBlacklistedWord(projectId: string, word: string): Promise<boolean> {
    const db = await getDb();
    const projectsCol = db.collection('projects');
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
    const db = await getDb();
    const projectsCol = db.collection('projects');
    const blacklistWarningsCol = (projectId: string) => projectsCol.doc(projectId).collection('blacklist_warnings');
    const ref = blacklistWarningsCol(projectId).doc(String(userId));
    const newCount = await db.runTransaction(async (t) => {
        const doc = await t.get(ref);
        const currentCount = doc.exists ? doc.data()!.count : 0;
        const newCount = currentCount + 1;
        t.set(ref, { count: newCount, lastWarning: new Date() });
        return newCount;
    });
    return newCount;
}

export async function resetBlacklistWarnings(projectId: string, userId: number): Promise<void> {
    const db = await getDb();
    const projectsCol = db.collection('projects');
    const blacklistWarningsCol = (projectId: string) => projectsCol.doc(projectId).collection('blacklist_warnings');
    await blacklistWarningsCol(projectId).doc(String(userId)).delete();
}

export async function incrementWarningCount(projectId: string, userId: number): Promise<number> {
    const db = await getDb();
    const projectsCol = db.collection('projects');
    const warningCountsCol = (projectId: string) => projectsCol.doc(projectId).collection('warning_counts');
    const ref = warningCountsCol(projectId).doc(String(userId));
    const newCount = await db.runTransaction(async (t) => {
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
    const db = await getDb();
    const locksCol = db.collection('group_locks');
    const doc = await locksCol.doc(String(chatId)).get();
    return doc.exists;
}

export async function lockProjectCreation(chatId: number): Promise<void> {
    const db = await getDb();
    const locksCol = db.collection('group_locks');
    const expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 5);
    await locksCol.doc(String(chatId)).set({ lockedAt: new Date(), expireAt });
}

export async function clearProjectCreationLock(chatId: number): Promise<void> {
    const db = await getDb();
    const locksCol = db.collection('group_locks');
    await locksCol.doc(String(chatId)).delete();
}

// --- DATA PRIVACY & DELETION ---
export async function deleteUserData(projectId: string, userId: number): Promise<void> {
    const db = await getDb();
    const projectsCol = db.collection('projects');
    const sessionsCol = db.collection('user_sessions');
    const verifiedUsersCol = (projectId: string) => projectsCol.doc(projectId).collection('verified_users');
    const bannedUsersCol = (projectId: string) => projectsCol.doc(projectId).collection('banned_users');
    const warningCountsCol = (projectId: string) => projectsCol.doc(projectId).collection('warning_counts');
    const blacklistWarningsCol = (projectId: string) => projectsCol.doc(projectId).collection('blacklist_warnings');
    const verificationAttemptsCol = (projectId: string) => projectsCol.doc(projectId).collection('verification_attempts');
    const userIdStr = String(userId);
    const batch = db.batch();

    // List of collections to delete the user's document from
    const collectionsToDeleteFrom = [
        verifiedUsersCol(projectId),
        bannedUsersCol(projectId),
        warningCountsCol(projectId),
        blacklistWarningsCol(projectId),
        verificationAttemptsCol(projectId)
    ];

    for (const collection of collectionsToDeleteFrom) {
        batch.delete(collection.doc(userIdStr));
    }
    
    // Also delete the user's session if it exists
    batch.delete(sessionsCol.doc(userIdStr));
    
    await batch.commit();
}


/**
 * @file This file is a dedicated data logging service.
 * It is responsible for capturing structured event data for analytics and reporting.
 */
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// --- TYPES ---

export type ModerationEvent = {
    projectId: string;
    chatId: number;
    eventType: 'ban' | 'kick' | 'mute' | 'unmute' | 'warn' | 'unban' | 'blacklist_delete' | 'blacklist_mute';
    actorUserId: number; // The admin or bot who performed the action
    targetUserId: number; // The user who was the subject of the action
    timestamp?: Date; // Firestore will set this
    details?: string; // e.g., "Muted for 1h"
};

// --- INITIALIZATION ---

if (!getApps().length) {
    // This check is redundant if database.ts is always imported first,
    // but it provides safety if this module is used independently.
    initializeApp();
}
const db = getFirestore();
const logsCol = db.collection('moderation_logs');

/**
 * Logs a moderation event to a persistent data store (e.g., Firestore).
 * This data can be used for generating reports, creating audit trails,
 * and understanding community health.
 *
 * @param event The structured moderation event to log.
 */
export async function logModerationEvent(event: Omit<ModerationEvent, 'timestamp'>): Promise<void> {
    const logEntry = {
        ...event,
        timestamp: new Date(), // Set timestamp at the time of logging
    };
    
    try {
        await logsCol.add(logEntry);
        console.log('Logged moderation event to Firestore:', JSON.stringify(logEntry, null, 2));
    } catch (error) {
        console.error("Failed to log moderation event:", error);
    }
}

/**
 * Retrieves logs for a specific project within a given date range.
 * @param projectId The ID of the project to retrieve logs for.
 * @param since The start date to retrieve logs from.
 * @returns A promise that resolves to an array of moderation events.
 */
export async function getLogsForProject(projectId: string, since: Date): Promise<ModerationEvent[]> {
    const snapshot = await logsCol
      .where('projectId', '==', projectId)
      .where('timestamp', '>=', since)
      .orderBy('timestamp', 'desc')
      .get();
      
    if (snapshot.empty) {
        return [];
    }
    
    // Ensure data conforms to ModerationEvent type, especially the timestamp
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            timestamp: (data.timestamp as FirebaseFirestore.Timestamp).toDate(),
        } as ModerationEvent;
    });
}


'use server';

import * as db from '@/lib/database';
import * as datalogger from '@/lib/datalogger';
import type { ProjectSettings, ModerationEvent } from '@/lib/types';

/**
 * Fetches the project for the log page.
 * @param projectId The ID of the project to fetch data for.
 * @returns A promise that resolves to the project settings or null.
 */
export async function getLogPageData(projectId: string): Promise<ProjectSettings | null> {
    try {
        const project = await db.getProjectSettings(projectId);
        return project;
    } catch (error) {
        console.error(`Error in getLogPageData server action for project ${projectId}:`, error);
        return null;
    }
}

/**
 * Fetches all logs for a project since the beginning of time.
 * @param projectId The ID of the project to fetch logs for.
 * @returns A promise that resolves to an array of moderation events.
 */
export async function getAllProjectLogs(projectId: string): Promise<ModerationEvent[]> {
     try {
        // Passing a date of 0 fetches all logs from the beginning.
        const logs = await datalogger.getLogsForProject(projectId, new Date(0));
        // Ensure that the returned objects are plain and serializable for the client
        return logs.map(log => ({
            ...log,
            timestamp: log.timestamp?.toISOString() as any, // Convert Date to string
        }));
    } catch (error) {
        console.error(`Error fetching all logs for project ${projectId}:`, error);
        return [];
    }
}

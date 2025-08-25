
'use server';

import * as db from '@/lib/database';
import * as datalogger from '@/lib/datalogger';
import type { ProjectSettings, ModerationEvent } from '@/lib/types';

/**
 * Fetches the project data for the dashboard for a specific project.
 * This is a server action that can be called from client components.
 * @param projectId The ID of the project to fetch data for.
 * @returns A promise that resolves to the project settings.
 */
export async function getDashboardData(projectId: string): Promise<ProjectSettings | null> {
    try {
        const project = await db.getProjectSettings(projectId);
        return project || null;
    } catch (error) {
        console.error(`Error fetching dashboard data for project ${projectId}:`, error);
        return null;
    }
}

/**
 * Fetches recent logs for a specific project.
 * @param projectId The ID of the project to fetch logs for.
 * @param days The number of days of logs to retrieve.
 * @returns A promise that resolves to an array of moderation events.
 */
export async function getProjectLogs(projectId: string, days: number): Promise<ModerationEvent[]> {
     try {
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - days);
        const logs = await datalogger.getLogsForProject(projectId, sinceDate);
        // Ensure that the returned objects are plain and serializable
        return logs.map(log => ({
            ...log,
            timestamp: log.timestamp?.toISOString() as any, // Convert Date to string
        }));
    } catch (error) {
        console.error(`Error fetching logs for project ${projectId}:`, error);
        return [];
    }
}

/**
 * Fetches the list of all projects a user is an admin of.
 * @param userId The ID of the user.
 * @returns A promise that resolves to an array of project settings.
 */
export async function getProjectsForUser(userId: number): Promise<ProjectSettings[]> {
    try {
        const projects = await db.getProjectsForUser(userId);
        return projects;
    } catch (error) {
        console.error(`Error fetching projects for user ${userId}:`, error);
        return [];
    }
}

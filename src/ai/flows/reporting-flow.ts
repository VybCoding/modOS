
'use server';
/**
 * @fileOverview A flow for generating weekly moderation reports.
 * This flow is designed to be triggered by a scheduler (e.g., Google Cloud Scheduler).
 *
 * - generateWeeklyReport - A function that generates and (conceptually) sends a report.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as datalogger from '@/lib/datalogger';

const ReportingInputSchema = z.object({
  projectId: z.string(),
});
type ReportingInput = z.infer<typeof ReportingInputSchema>;

const ReportingOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  reportContent: z.string().optional(),
});


export async function generateWeeklyReport(input: ReportingInput) {
  return reportingFlow(input);
}

const reportingFlow = ai.defineFlow(
  {
    name: 'reportingFlow',
    inputSchema: ReportingInputSchema,
    outputSchema: ReportingOutputSchema,
  },
  async ({ projectId }) => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // In a real implementation, this would query Firestore.
      // For now, it uses the simulated data from the datalogger.
      const recentLogs = await datalogger.getLogsForProject(projectId, sevenDaysAgo);

      if (recentLogs.length === 0) {
        return { success: true, message: "No moderation events recorded in the last 7 days." };
      }

      // Aggregate the logs
      const summary = recentLogs.reduce((acc, log) => {
        acc[log.eventType] = (acc[log.eventType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Format the report
      let reportContent = `📊 Weekly Moderation Report for Project: ${projectId}\n\n`;
      reportContent += "Here is a summary of all moderation actions from the past 7 days:\n\n";

      for (const [eventType, count] of Object.entries(summary)) {
        reportContent += `• ${eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${count}\n`;
      }
      
      reportContent += "\nThis report was generated automatically by modOS.";

      // TODO: In a real implementation, you would:
      // 1. Get the list of project administrators.
      // 2. Send this `reportContent` string to each administrator via a Telegram DM.
      console.log(`Generated Report for ${projectId}:\n${reportContent}`);

      return { success: true, message: "Report generated successfully.", reportContent };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error(`Failed to generate report for project ${projectId}:`, errorMessage);
      return { success: false, message: `Failed to generate report: ${errorMessage}` };
    }
  }
);

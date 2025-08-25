
'use server';
/**
 * @fileOverview A flow for deleting all data associated with a specific user.
 * This is used to handle "Right to be Forgotten" requests.
 *
 * - deleteUserData - Deletes all data for a given user in a project.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as db from '@/lib/database';

const DeleteUserDataInputSchema = z.object({
  projectId: z.string().describe('The ID of the project the user belongs to.'),
  userId: z.number().describe('The Telegram User ID to delete.'),
});
type DeleteUserDataInput = z.infer<typeof DeleteUserDataInputSchema>;

const DeleteUserDataOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export async function deleteUserData(input: DeleteUserDataInput) {
  return deleteUserDataFlow(input);
}

const deleteUserDataFlow = ai.defineFlow(
  {
    name: 'deleteUserDataFlow',
    inputSchema: DeleteUserDataInputSchema,
    outputSchema: DeleteUserDataOutputSchema,
  },
  async ({ projectId, userId }) => {
    try {
      // In a real application, you would add an authorization check here
      // to ensure only project admins can trigger this flow.

      console.log(`Starting data deletion for user ${userId} in project ${projectId}.`);

      await db.deleteUserData(projectId, userId);

      console.log(`Successfully deleted all data for user ${userId} in project ${projectId}.`);

      return { success: true, message: 'User data successfully deleted.' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error(`Failed to delete user data for ${userId} in project ${projectId}:`, errorMessage);
      return { success: false, message: `Failed to delete user data: ${errorMessage}` };
    }
  }
);

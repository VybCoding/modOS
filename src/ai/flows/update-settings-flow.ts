
'use server';
/**
 * @fileOverview A flow for updating bot settings.
 *
 * - updateBotSettings - A function that handles updating the bot configuration.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as db from '@/lib/database';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const UpdateSettingsInputSchema = z.object({
  projectId: z.string(), // Added projectId
  settings: z.object({
    telegramBotToken: z.string().optional(), // Token is optional
    welcomeMessage: z.string(),
    timeout: z.number(),
    retries: z.number(),
    logChannelId: z.string(),
    spammerDb: z.boolean(),
    silentKicks: z.boolean(),
    rules: z.string().optional(),
    blacklist: z.array(z.string()).optional(),
    warnings: z.coerce.number().min(1).max(10),
    muteDuration: z.coerce.number().min(1),
    projectName: z.string().min(3), // Added from form
  }),
});
type UpdateSettingsInput = z.infer<typeof UpdateSettingsInputSchema>;

const UpdateSettingsOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

// Helper function to store the bot token in Google Secret Manager
async function storeBotToken(projectId: string, token: string) {
  const client = new SecretManagerServiceClient();
  // Ensure a consistent naming convention for secrets
  const secretId = `telegram-bot-token-${projectId}`;
  const parent = `projects/${process.env.GOOGLE_CLOUD_PROJECT || 'default-project'}`;
  const secretName = `${parent}/secrets/${secretId}`;
  
  try {
    // Try to get the secret first to see if it exists
    await client.getSecret({ name: secretName });
  } catch (error: any) {
    if (error.code === 5) { // NOT_FOUND
      // Secret does not exist, create it
      await client.createSecret({
        parent,
        secretId: secretId,
        secret: {
          replication: {
            automatic: {},
          },
        },
      });
    } else {
      // Re-throw other errors
      console.error("Error checking for secret:", error);
      throw new Error(`Could not check for secret: ${error.message}`);
    }
  }

  // Add the new secret version
  await client.addSecretVersion({
    parent: secretName,
    payload: {
      data: Buffer.from(token, 'utf8'),
    },
  });
}

export async function updateBotSettings(input: UpdateSettingsInput) {
  return updateBotSettingsFlow(input);
}

const updateBotSettingsFlow = ai.defineFlow(
  {
    name: 'updateBotSettingsFlow',
    inputSchema: UpdateSettingsInputSchema,
    outputSchema: UpdateSettingsOutputSchema,
  },
  async ({ projectId, settings }) => {
    try {
      // 1. If a new token is provided, store it securely in Secret Manager.
      if (settings.telegramBotToken && settings.telegramBotToken.trim() !== '') {
        await storeBotToken(projectId, settings.telegramBotToken);
        console.log(`Successfully stored new bot token for project ${projectId} in Secret Manager.`);
      }

      // 2. Save all other non-sensitive settings to Firestore.
      // We don't want to store the token in Firestore, so we create a new object without it.
      const { telegramBotToken, blacklist, ...firestoreSettings } = settings;
      
      const settingsToSave: Partial<db.ProjectSettings> = {
          ...firestoreSettings,
          blacklistedWords: blacklist || [] // Ensure blacklistedWords is an array
      };

      await db.updateProjectSettings(projectId, settingsToSave);
      
      console.log(`Successfully updated project settings for ${projectId} in Firestore.`);

      return { success: true, message: 'Settings updated successfully.' };
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
       console.error(`Failed to update settings for project ${projectId}:`, errorMessage);
       return { success: false, message: `Failed to update settings: ${errorMessage}` };
    }
  }
);

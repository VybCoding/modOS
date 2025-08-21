
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { updateBotSettings } from '@/ai/flows/update-settings-flow';
import { setWebhook } from '@/ai/flows/set-webhook-flow';

const settingsFormSchema = z.object({
  appUrl: z.string().url({ message: 'Please enter a valid URL.' }),
  projectId: z.string().min(1, { message: 'Project ID is missing.' }),
  projectName: z.string().min(3, { message: 'Project name is required.' }),
  telegramBotToken: z.string().optional(), // Token is optional
  welcomeMessage: z
    .string()
    .min(10, {
      message: 'Welcome message must be at least 10 characters.',
    })
    .max(500, {
      message: 'Welcome message must not be longer than 500 characters.',
    }),
  timeout: z.coerce.number().min(15).max(300),
  retries: z.coerce.number().min(1).max(5),
  logChannelId: z
    .string()
    .startsWith('-100', { message: 'Must be a valid channel ID' })
    .or(z.literal('')),
  spammerDb: z.boolean().default(false),
  silentKicks: z.boolean().default(true),
  rules: z
    .string()
    .max(4096, { message: 'Rules must not be longer than 4096 characters.' })
    .optional(),
  blacklist: z.array(z.string()).optional(),
  warnings: z.coerce.number().min(1).max(10),
  muteDuration: z.coerce.number().min(1),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export async function saveSettings(data: SettingsFormValues) {
  const validation = settingsFormSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.flatten().fieldErrors,
    };
  }

  try {
    const { projectId, appUrl, ...settingsData } = validation.data;
    
    const settingsResult = await updateBotSettings({
        projectId: projectId,
        settings: settingsData,
    });

    if (!settingsResult.success) {
         return {
            success: false,
            error: { _form: [settingsResult.message || "Failed to save the bot settings."] },
         };
    }

    let webhookMessage = '';
    // Set the webhook ONLY if a new token was provided.
    if (settingsData.telegramBotToken) {
        const webhookResult = await setWebhook({ 
            url: appUrl,
            botToken: settingsData.telegramBotToken,
        });

        if (!webhookResult.success) {
          // If webhook fails, we still return success=false but inform the user that settings were saved.
          return {
            success: false,
            error: { _form: [`Settings were saved, but we failed to set the new webhook: ${webhookResult.message}`] },
          };
        }
        webhookMessage = ` and ${webhookResult.message}`;
    }


    revalidatePath('/settings');
    return {
      success: true,
      message: `Settings saved${webhookMessage} successfully!`,
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'An unknown error occurred.';
    return {
      success: false,
      error: { _form: [error] },
    };
  }
}

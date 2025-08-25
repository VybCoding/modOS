
'use server';
/**
 * @fileOverview A flow for setting the Telegram bot webhook.
 *
 * - setWebhook - A function that sets the webhook for the Telegram bot.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import TelegramBot from 'node-telegram-bot-api';


const SetWebhookInputSchema = z.object({
  url: z.string().url({ message: "Invalid URL provided." }),
  botToken: z.string().min(1, {message: "Bot token must be provided."}),
});

const SetWebhookOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export async function setWebhook(input: z.infer<typeof SetWebhookInputSchema>) {
  return setWebhookFlow(input);
}

const setWebhookFlow = ai.defineFlow(
  {
    name: 'setWebhookFlow',
    inputSchema: SetWebhookInputSchema,
    outputSchema: SetWebhookOutputSchema,
  },
  async ({ url, botToken }) => {

    if (!botToken) {
      return { success: false, message: "TG_BOT_TOKEN is not set." };
    }

    try {
      const bot = new TelegramBot(botToken);
      // The full webhook URL will be the provided URL + the api route
      const webhookUrl = `${url}/api/telegram/webhook`;
      await bot.setWebHook(webhookUrl);
      const botInfo = await bot.getMe();
      return { success: true, message: `Webhook successfully set for @${botInfo.username} to ${webhookUrl}` };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error("Failed to set webhook:", errorMessage);
      return { success: false, message: `Failed to set webhook: ${errorMessage}` };
    }
  }
);

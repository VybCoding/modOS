'use server';
/**
 * @fileOverview A flow for handling new users joining the Telegram group.
 * This acts as a "Bouncer", checking if a user is verified and restricting
 * them if they are not, guiding them to verify via DM.
 *
 * - handleNewUser - A function that handles the new user logic.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getBot } from '@/lib/telegram';
import { sendAndDelete } from '@/lib/bot-utils';
import * as db from '@/lib/database';

// Zod schema for a Telegram user
const TelegramUserSchema = z.object({
  id: z.number(),
  is_bot: z.boolean(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
});

// Zod schema for the input message, now including an optional 'isVerified' field
const HandleNewUserInputSchema = z.object({
  chat: z.object({
    id: z.number(),
    title: z.string().optional(),
  }),
  new_chat_members: z.array(TelegramUserSchema),
  isVerified: z.boolean(), // This will be determined by the webhook route
  projectId: z.string(), // The project this group belongs to
});
type HandleNewUserInput = z.infer<typeof HandleNewUserInputSchema>;

export async function handleNewUser(input: HandleNewUserInput) {
  return handleNewUserFlow(input);
}

const handleNewUserFlow = ai.defineFlow(
  {
    name: 'handleNewUserFlow',
    inputSchema: HandleNewUserInputSchema,
    outputSchema: z.void(),
  },
  async ({ chat, new_chat_members, isVerified, projectId }) => {
    const bot = await getBot();
    const botUsername = process.env.BOT_USERNAME;
    if (!bot) {
        console.error("Cannot handle new user: TelegramBot instance was not provided to the flow.");
        return;
    }
     if (!botUsername) {
      console.error('BOT_USERNAME is not set in environment.');
      return;
    }

    const chatId = chat.id;
    const groupName = chat.title || 'this group';

    for (const user of new_chat_members) {
      if (user.is_bot) continue;

      const username = user.username || user.first_name;

      if (isVerified) {
        // Scenario 1: User is already verified, just welcome them.
        try {
          const welcomeMessage = `Welcome, @${username}!\n\n— Powered by modOS`;
          await bot.sendMessage(chatId, welcomeMessage);
          console.log(`Welcomed pre-verified user @${username} to chat ${chatId}`);
        } catch (error) {
          console.error(`Failed to welcome pre-verified user @${username}:`, error);
        }
      } else if (projectId === 'default' && chat.title === undefined) {
          // Scenario 2: This is a /start command in a private chat.
          // The user data will be saved by the webhook handler before this flow is called.
          await bot.sendMessage(chatId, "Welcome to modOS! I'm ready to help you manage your groups.");
      } else {
        // Scenario 3: User is NOT verified in a group. Restrict, then DM.
        try {
          // 1. Instantly restrict permissions (jail the user)
          await bot.restrictChatMember(chatId, user.id, {
            permissions: {
                can_send_messages: false,
                can_send_audios: false,
                can_send_documents: false,
                can_send_photos: false,
                can_send_videos: false,
                can_send_video_notes: false,
                can_send_voice_notes: false,
                can_send_polls: false,
                can_send_other_messages: false,
                can_add_web_page_previews: false,
                can_change_info: false,
                can_invite_users: false,
                can_pin_messages: false,
            }
          });
          console.log(`Restricted new user @${username} in chat ${chatId}`);

          // 2. Send a private verification DM
          const verificationLink = `https://t.me/${botUsername}?start=verify_${projectId}_${user.id}_${chatId}`;
          const dmText = `Welcome! To unlock chat access in "${groupName}", you must first verify you are human. Please complete the CAPTCHA below.`;
          
          await bot.sendMessage(user.id, dmText, {
            reply_markup: {
              inline_keyboard: [
                [{ text: '➡️ Verify Now', url: verificationLink }]
              ]
            }
          });
          console.log(`Sent verification DM to user ${user.id}`);

          // 3. Post a temporary public message
          const publicMessage = `Welcome, @${username}! I've sent you a private message to complete verification before you can chat.`;
          await sendAndDelete(bot, chatId, publicMessage);

        } catch (error) {
          console.error(`Failed to process unverified new user @${username}:`, error);
          // If we fail to DM, post a public fallback.
          const fallbackMessage = `I couldn't send you a private message, @${username}. Please check your privacy settings and click the button below to verify.`;
          const verificationLink = `https://t.me/${botUsername}?start=verify_${projectId}_${user.id}_${chatId}`;
          await bot.sendMessage(chatId, fallbackMessage, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '➡️ Verify Now', url: verificationLink }]
                    ]
                }
          });
          await sendAndDelete(bot, chatId, `Welcome, @${username}! Please check your DMs to verify.`, 300);
        }
      }
    }
  }
);


'use server';

import { NextRequest, NextResponse } from 'next/server';
import { handleNewUser } from '@/ai/flows/handle-new-user-flow';
import type TelegramBot from 'node-telegram-bot-api';
import * as db from '@/lib/database';
import * as logger from '@/lib/datalogger';
import { getBot } from '@/lib/telegram';
import { sendAndDelete } from '@/lib/bot-utils';


const MAX_RETRIES = 2; // Default, can be overridden by settings
const EMOJI_OPTIONS = ['✅', '🤖', '🎉', '👍', '🔥', '🤔', '😎', '🚀'];


// --- NEW: Request Context ---
// This object will be created for each incoming webhook request.
// It will hold all the necessary data, fetched once, to avoid redundant DB reads.
type RequestContext = {
    chatId: number;
    userId: number; // The user initiating the action (e.g., sending a message or command)
    isPrivateChat: boolean;
    projectId?: string;
    effectiveSettings?: db.EffectiveSettings; // Changed from projectSettings to effectiveSettings
};


function generateCaptcha() {
  const shuffled = EMOJI_OPTIONS.sort(() => 0.5 - Math.random());
  const correctEmoji = shuffled[0];
  const options = shuffled.slice(0, 5);
  const inlineOptions = options.sort(() => 0.5 - Math.random());
  return { correctEmoji, inlineOptions };
}

async function handleCallbackQuery(bot: TelegramBot, callbackQuery: TelegramBot.CallbackQuery, ctx: RequestContext) {
    const { data, message, from } = callbackQuery;

    // Use context's chatId which is now reliably set
    const callbackChatId = ctx.chatId;
    const callbackUserId = from.id;

    if (!data || !message) return;
    
    const messageId = message.message_id;

    try {
        const [type, ...params] = data.split('_');

        if (type === 'project' && params[0] === 'create') {
            const newChatId = params[1];

            await db.clearProjectCreationLock(Number(newChatId));
            const chatInfo = await bot.getChat(newChatId);
            const groupName = chatInfo.title || `Group ${newChatId}`;
            const newProjectId = await db.createNewProject(Number(newChatId), groupName, callbackUserId);

            await bot.deleteMessage(callbackChatId, messageId.toString());
            // **FIX**: We must refetch the settings and update the context *after* creating the project.
            const newEffectiveSettings = await db.getEffectiveSettings(newProjectId, callbackChatId);
            const newCtx: RequestContext = { ...ctx, chatId: callbackChatId, projectId: newProjectId, effectiveSettings: newEffectiveSettings };
            await showMainMenu(bot, newCtx, "✅ Project created successfully! This group has been added. You can now configure your project settings.");
            return;
        }
        if (type === 'project' && params[0] === 'cancel' && params[1] === 'creation') {
            const newChatId = params[2];
            await db.clearProjectCreationLock(Number(newChatId));

            await bot.deleteMessage(callbackChatId, messageId.toString());
            await bot.sendMessage(callbackChatId, "No problem. If you change your mind, just type /settings again.");
            return;
        }
        
        const session = await db.getUserSession(callbackUserId);
        // If we are not creating a project, and there's no project ID in context, we can't continue.
        if (!ctx.projectId && !session?.projectId) {
             await bot.answerCallbackQuery(callbackQuery.id, { text: "This project context is missing. Please start over.", show_alert: true });
             await bot.deleteMessage(callbackChatId, messageId.toString()).catch(() => {});
             return;
        }


        if (type === 'settings') {
            const action = params[0];
            const actionParams = params.slice(1);
            
            if (!ctx.isPrivateChat) {
                const member = await bot.getChatMember(ctx.chatId, String(ctx.userId));
                const isAdmin = ['creator', 'administrator'].includes(member.status);
                if (!isAdmin) {
                    await bot.answerCallbackQuery(callbackQuery.id, { text: "You must be an admin to change settings.", show_alert: true });
                    return;
                }
            }


            if (!ctx.projectId) {
                await bot.answerCallbackQuery(callbackQuery.id, { text: "Project not found. Please use /settings to start.", show_alert: true });
                return;
            }
            
            const sessionCtx = { ...ctx, chatId: callbackChatId };

            if (action === 'welcome') {
                const text = 'Configure Welcome & Verification settings for the entire project:';
                const reply_markup = {
                    inline_keyboard: [
                        [{ text: 'Edit Project Welcome Message', callback_data: `settings_edit_welcome_message` }],
                        [{ text: 'Set Project Verification Timeout', callback_data: `settings_set_timeout` }],
                        [{ text: 'Set Project Max Retries', callback_data: `settings_set_retries` }],
                        [{ text: '⬅️ Back', callback_data: `settings_back_to_main_menu` }],
                    ],
                };
                await bot.editMessageText(text, { chat_id: callbackChatId, message_id: messageId, reply_markup });
            } else if (action === 'edit' && actionParams.join('_') === 'welcome_message') {
                const text = "Please send the new welcome message for the *entire project*.\nYou can use `{username}` as a placeholder.\n\nSend /cancel to abort.";
                await db.setUserSession(ctx.userId, { action: 'awaiting_project_welcome_message', chatId: callbackChatId, messageId: messageId, projectId: ctx.projectId });
                await bot.editMessageText(text, { chat_id: callbackChatId, message_id: messageId, parse_mode: 'Markdown'});
            } else if(action === 'edit' && actionParams.join('_') === 'rules') {
                const text = "Please send the new community rules for the *entire project*.\n\nSend /cancel to abort.";
                await db.setUserSession(ctx.userId, { action: 'awaiting_project_rules_message', chatId: callbackChatId, messageId: messageId, projectId: ctx.projectId });
                await bot.editMessageText(text, { chat_id: callbackChatId, message_id: messageId, parse_mode: 'Markdown'});
            } else if (action === 'set' && actionParams[0] === 'timeout') {
                const text = "Please enter the new timeout in seconds for the *entire project* (e.g., 60). Value must be between 15 and 300.\n\nSend /cancel to abort.";
                await db.setUserSession(ctx.userId, { action: 'awaiting_project_timeout_value', chatId: callbackChatId, messageId: messageId, projectId: ctx.projectId });
                await bot.editMessageText(text, { chat_id: callbackChatId, message_id: messageId, parse_mode: 'Markdown' });
            } else if (action === 'set' && actionParams[0] === 'retries') {
                const text = "Please enter the max CAPTCHA retries for the *entire project* (e.g., 3). Value must be between 1 and 5.\n\nSend /cancel to abort.";
                await db.setUserSession(ctx.userId, { action: 'awaiting_project_retries_value', chatId: callbackChatId, messageId: messageId, projectId: ctx.projectId });
                await bot.editMessageText(text, { chat_id: callbackChatId, message_id: messageId, parse_mode: 'Markdown' });
            } else if (action === 'manage' && actionParams[0] === 'groups') {
                const projectGroups = await db.getGroupsForProject(ctx.projectId);
                const currentGroups = projectGroups
                                            .map(g => `• ${g.groupName} (${g.chatId})`)
                                            .join('\n');
                
                const groupList = currentGroups.length > 0 ? currentGroups : 'No groups are currently linked to this project.';
                
                const text = `Manage the groups and channels for this project.\n\n**Current Groups:**\n${groupList}`;
                const reply_markup = {
                    inline_keyboard: [
                        [{ text: 'Add a Group', callback_data: `settings_add_group` }],
                        [{ text: 'Remove a Group', callback_data: `settings_remove_group` }],
                        [{ text: '⬅️ Back', callback_data: `settings_back_to_main_menu` }],
                    ]
                };
                await bot.editMessageText(text, { chat_id: callbackChatId, message_id: messageId, reply_markup, parse_mode: 'Markdown' });
            } else if (action === 'add' && actionParams[0] === 'group') {
                await db.setUserSession(ctx.userId, { action: 'awaiting_addgroup_command', projectId: ctx.projectId });
                const text = "To add a new group to this project, please go to that group, add me as an administrator with 'Invite Users' permission, and then type `/addgroup` there.";
                await bot.editMessageText(text, { chat_id: callbackChatId, message_id: messageId, reply_markup: {
                    inline_keyboard: [[{ text: '⬅️ Back', callback_data: 'settings_manage_groups' }]]
                }});
            } else if (action === 'remove' && actionParams[0] === 'group') {
                await bot.answerCallbackQuery(callbackQuery.id, { text: "Remove Group functionality coming soon.", show_alert: true });
            } else if (action === 'health') {
                await bot.answerCallbackQuery(callbackQuery.id, { text: "Running health check..." });
                const botId = (await bot.getMe()).id;
                const chatMember = await bot.getChatMember(ctx.chatId, String(botId));

                let statusReport = "🩺 **Bot Health Status**\n\n";
                let allOk = true;

                if (chatMember.status === 'administrator') {
                    statusReport += "Admin Status: ✅ OK\n";
                    if ('can_invite_users' in chatMember && chatMember.can_invite_users) {
                        statusReport += "Invite Link Permission: ✅ OK\n";
                    } else {
                        statusReport += "Invite Link Permission: ❌ NOT GRANTED (for gatekeeper invites)\n";
                    }
                } else {
                    statusReport += "Admin Status: ❌ NOT AN ADMIN\n";
                    allOk = false;
                }
                
                statusReport += "\n";
                statusReport += allOk ? "*All systems are operational.*" : "*Please resolve the issues above to ensure the bot functions correctly.*";

                const reply_markup = { inline_keyboard: [[{ text: '⬅️ Back', callback_data: 'settings_back_to_main_menu' }]] };
                await bot.editMessageText(statusReport, { chat_id: callbackChatId, message_id: messageId, parse_mode: 'Markdown', reply_markup });
            } else if (action === 'blacklist') {
                 const text = 'Manage the project-wide list of forbidden words.';
                 const reply_markup = {
                     inline_keyboard: [
                         [{ text: '➕ Add Word', callback_data: 'settings_blacklist_add' }],
                         [{ text: '➖ Remove Word', callback_data: 'settings_blacklist_remove' }],
                         [{ text: '📄 View List', callback_data: 'settings_blacklist_view' }],
                         [{ text: '⬅️ Back', callback_data: `settings_back_to_main_menu` }],
                     ],
                 };
                 await bot.editMessageText(text, { chat_id: callbackChatId, message_id: messageId, reply_markup });
            } else if (action === 'blacklist' && actionParams[0] === 'add') {
                 await db.setUserSession(ctx.userId, { action: 'awaiting_project_blacklist_add', chatId: callbackChatId, messageId: messageId, projectId: ctx.projectId });
                 await bot.editMessageText("Please send the word or phrase to add to the project-wide blacklist.\n\nSend /cancel to abort.", { chat_id: callbackChatId, message_id: messageId });
            } else if (action === 'blacklist' && actionParams[0] === 'remove') {
                 await db.setUserSession(ctx.userId, { action: 'awaiting_project_blacklist_remove', chatId: callbackChatId, messageId: messageId, projectId: ctx.projectId });
                 await bot.editMessageText("Please send the exact word or phrase to remove from the project-wide blacklist.\n\nSend /cancel to abort.", { chat_id: callbackChatId, message_id: messageId });
            } else if (action === 'blacklist' && actionParams[0] === 'view') {
                if (!ctx.projectId) return;
                const projectSettings = await db.getProjectSettings(ctx.projectId);
                const blacklist = projectSettings?.blacklistedWords || [];
                const listText = blacklist.length > 0 ? `• ${blacklist.join('\n• ')}` : "The project-wide blacklist is currently empty.";
                const text = `**Project Blacklisted Words:**\n\n${listText}`;
                const reply_markup = { inline_keyboard: [[{ text: '⬅️ Back', callback_data: 'settings_blacklist' }]] };
                await bot.editMessageText(text, { chat_id: callbackChatId, message_id: messageId, reply_markup, parse_mode: 'Markdown' });
            } else if (action === 'overrides') {
                const chatInfo = await bot.getChat(ctx.chatId);
                const text = `Here you can override project-level settings for this specific group: *${chatInfo.title}*.`;
                const reply_markup = {
                     inline_keyboard: [
                         [{ text: 'Override Welcome Message', callback_data: `settings_override_welcome` }],
                         [{ text: 'Override Rules', callback_data: 'settings_override_rules' }],
                         [{ text: '⬅️ Back', callback_data: `settings_back_to_main_menu` }],
                     ],
                 };
                 await bot.editMessageText(text, { chat_id: callbackChatId, message_id: messageId, reply_markup, parse_mode: 'Markdown' });
            } else if (action === 'override' && actionParams[0] === 'welcome') {
                const text = "Please send the new welcome message for *this group only*.\nThis will not affect other groups in the project.\n\nSend /cancel to abort.";
                await db.setUserSession(ctx.userId, { action: 'awaiting_group_welcome_message', chatId: callbackChatId, messageId: messageId, projectId: ctx.projectId });
                await bot.editMessageText(text, { chat_id: callbackChatId, message_id: messageId, parse_mode: 'Markdown' });
            } else if (action === 'override' && actionParams[0] === 'rules') {
                const text = "Please send the new rules for *this group only*.\nThis will not affect other groups in the project.\n\nSend /cancel to abort.";
                await db.setUserSession(ctx.userId, { action: 'awaiting_group_rules_message', chatId: callbackChatId, messageId: messageId, projectId: ctx.projectId });
                await bot.editMessageText(text, { chat_id: callbackChatId, message_id: messageId, parse_mode: 'Markdown' });
            } else if (action === 'done') {
                await bot.deleteMessage(callbackChatId, messageId.toString());
            } else if (action === 'back' && actionParams.join('_') === 'to_main_menu') {
                await showMainMenu(bot, { ...ctx, chatId: callbackChatId }, 'Configure your project settings:', messageId);
            }
            await bot.answerCallbackQuery(callbackQuery.id);
            return;
        }

        if (type === 'captcha') {
            const session = await db.getUserSession(callbackUserId);
            if (!session || !session.projectId || !session.correctEmoji) {
                await bot.answerCallbackQuery(callbackQuery.id, { text: "This CAPTCHA has expired or is invalid.", show_alert: true });
                return;
            }

            const chosenEmoji = params[0];
            const { projectId, correctEmoji, originalChatId } = session;

            if (chosenEmoji === correctEmoji) {
                await bot.answerCallbackQuery(callbackQuery.id, { text: '✅ Success!', show_alert: false });
                await db.setUserAsVerified(projectId, callbackUserId);
                
                if (session.action === 'awaiting_bouncer_captcha' && originalChatId) {
                    await bot.restrictChatMember(originalChatId, callbackUserId, {
                        can_send_messages: true, can_send_media_messages: true,
                        can_send_polls: true, can_send_other_messages: true,
                        can_add_web_page_previews: true,
                    });
                    await bot.editMessageText("✅ Verification complete! You can now chat in the group.", { chat_id: callbackChatId, message_id: messageId, reply_markup: undefined });
                } else { // Gatekeeper Flow
                    await bot.editMessageText(`✅ Verification successful! Generating your invite links...`, { chat_id: callbackChatId, message_id: messageId, reply_markup: undefined });

                    const projectGroups = await db.getGroupsForProject(projectId);
                    
                    if (projectGroups.length === 1) {
                        const group = projectGroups[0];
                        const expireDate = new Date();
                        expireDate.setMinutes(expireDate.getMinutes() + 5);
                        try {
                            const link = await bot.createChatInviteLink(group.chatId, { expire_date: Math.floor(expireDate.getTime() / 1000), member_limit: 1 });
                             await bot.sendMessage(callbackChatId, `Welcome! Here is your link to join the community:\n\n[Join ${group.groupName}](${link.invite_link})`, { parse_mode: 'Markdown' });
                        } catch (err) {
                            console.error(JSON.stringify({
                                level: 'ERROR', message: 'Telegram API call failed: createChatInviteLink',
                                chatId: group.chatId, userId: callbackUserId, error: err instanceof Error ? err.message : String(err)
                            }));
                             await bot.sendMessage(callbackChatId, `Failed to create an invite link for ${group.groupName}. Please contact an admin.`);
                        }
                    } else if (projectGroups.length > 1) {
                        const expireDate = new Date();
                        expireDate.setMinutes(expireDate.getMinutes() + 5);
                        const linkPromises = projectGroups.map(group =>
                            bot.createChatInviteLink(group.chatId, { expire_date: Math.floor(expireDate.getTime() / 1000), member_limit: 1 })
                                .catch(err => { console.error(`Failed to create invite link for ${group.groupName} (${group.chatId})`, err); return null; })
                        );
                        const results = await Promise.all(linkPromises);
                        const validLinks = results.filter(link => link !== null) as TelegramBot.ChatInviteLink[];
                        if (validLinks.length > 0) {
                            const slugs = validLinks.map(link => link.invite_link.split('/').pop()).join('&slug=');
                            const folderUrl = `https://t.me/addlist?slug=${slugs}`;
                            const projectSettings = await db.getProjectSettings(projectId);
                            const projectName = projectSettings?.projectName || "the project";
                            const messageText = `✅ Verification successful!\n\nThis project contains multiple communities. We recommend adding them all into a dedicated chat folder.`;
                            const reply_markup = { inline_keyboard: [[{ text: `Create "${projectName}" Folder & Join All`, url: folderUrl }]] };
                            await bot.sendMessage(callbackChatId, messageText, { reply_markup });
                        } else {
                             await bot.sendMessage(callbackChatId, "Verification complete, but I couldn't create any invite links. Please contact an admin.");
                        }

                    } else {
                         await bot.sendMessage(callbackChatId, "Verification complete, but no groups are configured for this project yet. Please contact an admin.");
                    }
                }
                
                await db.clearVerificationAttempts(projectId, callbackUserId);
                // Finally, clear the session.
                await db.clearUserSession(callbackUserId);

            } else {
                if (!projectId) return;
                const projectSettings = await db.getProjectSettings(projectId);
                const maxRetries = projectSettings?.retries || MAX_RETRIES;
                const currentAttempts = await db.incrementVerificationAttempts(projectId, callbackUserId);
                const attemptsLeft = maxRetries - currentAttempts;

                if (attemptsLeft > 0) {
                    await bot.answerCallbackQuery(callbackQuery.id, { text: `That's not it, try again! You have ${attemptsLeft} attempt(s) left.`, show_alert: true });
                } else {
                    await bot.editMessageText("❌ You have failed the verification process.", { chat_id: callbackChatId, message_id: messageId, reply_markup: undefined });
                    await db.clearUserSession(callbackUserId);
                    await db.clearVerificationAttempts(projectId, callbackUserId);
                }
            }
            return;
        }
    } catch (error) {
        console.error(JSON.stringify({
            level: 'ERROR', message: 'Error in handleCallbackQuery',
            chatId: callbackChatId, userId: callbackUserId, callbackData: data,
            error: error instanceof Error ? error.message : String(error)
        }));
        try {
            await bot.sendMessage(callbackChatId, "❌ An unexpected error occurred. Please try again or contact support if the issue persists.");
        } catch (sendError) {
            console.error(JSON.stringify({
                level: 'ERROR', message: 'Failed to send error message to user',
                chatId: callbackChatId, userId: callbackUserId,
                error: sendError instanceof Error ? sendError.message : String(sendError)
            }));
        }
    }
}

function isCommand(text: string, command: string): boolean {
    const botUsername = process.env.BOT_USERNAME;
    if (!text || !botUsername) return false;
    const commandPart = text.split(' ')[0];
    const parts = commandPart.split('@');
    const baseCommand = parts[0]; 
    const targetBot = parts[1];

    if (baseCommand !== command) return false;
    if (targetBot && targetBot !== botUsername) return false;

    return true;
}

async function getTargetUser(bot: TelegramBot, message: TelegramBot.Message): Promise<TelegramBot.User | null> {
    if (message.reply_to_message && message.reply_to_message.from) {
        return message.reply_to_message.from;
    }
    if (message.entities && message.text) {
        for (const entity of message.entities) {
            if (entity.type === 'text_mention' && entity.user) {
                return entity.user;
            }
             if (entity.type === 'mention') {
                const username = message.text.substring(entity.offset + 1, entity.offset + entity.length);
                // This is a simplification. A robust solution would involve searching
                // a database of known users in the chat for a matching username.
                // For this project, we'll assume we can't get the ID from a simple @mention
                // and ask the admin to reply instead. This prevents crashes.
                return null;
            }
        }
    }
    return null;
}


async function handleMessage(bot: TelegramBot, message: TelegramBot.Message, ctx: RequestContext) {
    const { from, text } = message;
    if (!from || !text) return;

    try {
        // --- 1. Handle user input awaiting a response (e.g., settings update) ---
        const session = await db.getUserSession(ctx.userId);
        if (session && session.action) {
            const { action, chatId: sessionChatId, messageId: sessionMessageId, projectId: sessionProjectId } = session;

            if (isCommand(text, '/cancel')) {
                await db.clearUserSession(ctx.userId);
                if (sessionChatId && sessionMessageId) {
                    await bot.deleteMessage(sessionChatId, message.message_id.toString()).catch(() => {});
                    await showMainMenu(bot, { ...ctx, chatId: sessionChatId }, "Operation cancelled. What would you like to do next?", sessionMessageId);
                } else if (sessionChatId) {
                    await sendAndDelete(bot, sessionChatId, "Operation cancelled.");
                }
                return;
            }
            
            if (!sessionProjectId) return; // Should not happen if session is well-formed

            let successMessage = '';
            let settingUpdated = false;

            switch (action) {
                case 'awaiting_project_welcome_message':
                    await db.updateProjectSettings(sessionProjectId, { welcomeMessage: text });
                    successMessage = `✅ Project welcome message updated successfully!`;
                    settingUpdated = true;
                    break;
                case 'awaiting_group_welcome_message':
                    if (sessionChatId) {
                        await db.updateGroupSettingOverride(sessionChatId, { welcomeMessage: text });
                        successMessage = `✅ Welcome message for this group has been overridden.`;
                        settingUpdated = true;
                    }
                    break;
                case 'awaiting_project_rules_message':
                    await db.updateProjectSettings(sessionProjectId, { rules: text });
                    successMessage = `✅ Project rules updated successfully!`;
                    settingUpdated = true;
                    break;
                case 'awaiting_group_rules_message':
                     if (sessionChatId) {
                        await db.updateGroupSettingOverride(sessionChatId, { rules: text });
                        successMessage = `✅ Rules for this group have been overridden.`;
                        settingUpdated = true;
                    }
                    break;
                case 'awaiting_project_timeout_value':
                    const timeout = parseInt(text, 10);
                    if (isNaN(timeout) || timeout < 15 || timeout > 300) {
                        if (sessionChatId) await sendAndDelete(bot, sessionChatId, "❌ Invalid input. Please enter a number between 15 and 300.");
                        return; 
                    }
                    await db.updateProjectSettings(sessionProjectId, { timeout });
                    successMessage = `✅ Project timeout updated to ${timeout} seconds.`;
                    settingUpdated = true;
                    break;
                case 'awaiting_project_retries_value':
                    const retries = parseInt(text, 10);
                    if (isNaN(retries) || retries < 1 || retries > 5) {
                        if (sessionChatId) await sendAndDelete(bot, sessionChatId, "❌ Invalid input. Please enter a number between 1 and 5.");
                        return; 
                    }
                    await db.updateProjectSettings(sessionProjectId, { retries });
                    successMessage = `✅ Project max retries updated to ${retries}.`;
                    settingUpdated = true;
                    break;
                case 'awaiting_project_blacklist_add':
                    const wordToAdd = text.trim().toLowerCase();
                    await db.addBlacklistedWord(sessionProjectId, wordToAdd);
                    successMessage = `✅ The word "${wordToAdd}" has been added to the project-wide blacklist.`;
                    settingUpdated = true;
                    break;
                case 'awaiting_project_blacklist_remove':
                    const wordToRemove = text.trim().toLowerCase();
                    const success = await db.removeBlacklistedWord(sessionProjectId, wordToRemove);
                    if (success) {
                        successMessage = `✅ The word "${wordToRemove}" has been removed from the project-wide blacklist.`;
                    } else {
                        successMessage = `⚠️ The word "${wordToRemove}" was not found on the project-wide blacklist.`;
                    }
                    settingUpdated = true;
                    break;
            }

            if (settingUpdated) {
                await db.clearUserSession(ctx.userId);
                try {
                     if (ctx.isPrivateChat && message.message_id) {
                       await bot.deleteMessage(ctx.chatId, message.message_id.toString());
                    }
                } catch (e) { console.warn("Could not delete user message after setting update.") }
                
                if(sessionChatId && sessionMessageId) {
                   await showMainMenu(bot, { ...ctx, chatId: sessionChatId }, successMessage, sessionMessageId);
                } else if (sessionChatId) {
                    await sendAndDelete(bot, sessionChatId, successMessage);
                }
            }
            return; // Important: End execution here if we handled a session action
        }

        // --- 2. Handle /start command in private chat ---
        if (isCommand(text, '/start')) {
            if (!ctx.isPrivateChat) return;
            
            const startParam = text.split(' ')[1];
            if (!startParam) {
                await bot.sendMessage(ctx.chatId, "Welcome! To join a project, you need a special invite link.");
                return;
            }

            const [type, ...params] = startParam.split('_');
            
            let targetProjectId: string | undefined;
            if (type === 'verify') {
                targetProjectId = params[0];
            } else {
                targetProjectId = startParam;
            }
            
            if (!targetProjectId) {
                await bot.sendMessage(ctx.chatId, "This link seems to be invalid or expired.");
                return;
            }

            const banInfo = await db.getBanInfo(targetProjectId, ctx.userId);
            if (banInfo) {
                const thirtyDaysInMillis = 30 * 24 * 60 * 60 * 1000;
                const timeSinceBan = new Date().getTime() - banInfo.bannedAt.getTime();
                if (timeSinceBan < thirtyDaysInMillis) {
                    await bot.sendMessage(ctx.chatId, "❌ Your account is temporarily suspended from this project.");
                    return;
                } else {
                    await db.unbanUser(targetProjectId, ctx.userId);
                }
            }

            if (type === 'verify') {
                const [projectId, targetUserId, originalChatId] = params;
                if (!projectId || !targetUserId || !originalChatId) {
                     await bot.sendMessage(ctx.chatId, "This verification link is invalid or expired.");
                     return;
                }
                const { correctEmoji, inlineOptions } = generateCaptcha();
                const captchaMessage = `Please select the ${correctEmoji} emoji to prove you're not a bot.`;
                const keyboard = { inline_keyboard: [inlineOptions.map(emoji => ({ text: emoji, callback_data: `captcha_${emoji}` }))] };
                
                await db.setUserSession(ctx.userId, { action: 'awaiting_bouncer_captcha', projectId: projectId, correctEmoji, originalChatId: Number(originalChatId) });
                await bot.sendMessage(ctx.chatId, captchaMessage, { reply_markup: keyboard });

            } else { // Gatekeeper Flow
                const projectSettings = await db.getProjectSettings(targetProjectId);
                if (!projectSettings) {
                    await bot.sendMessage(ctx.chatId, "This project does not seem to exist.");
                    return;
                }
                const { correctEmoji, inlineOptions } = generateCaptcha();
                const welcomeText = (projectSettings.welcomeMessage || "Welcome! Please solve the CAPTCHA to get invite links.").split('.')[0];
                const captchaMessage = `${welcomeText}\n\nPlease select the ${correctEmoji} emoji to prove you're not a bot.`;
                const keyboard = { inline_keyboard: [inlineOptions.map(emoji => ({ text: emoji, callback_data: `captcha_${emoji}`}))] };
                await db.setUserSession(ctx.userId, { action: 'awaiting_gatekeeper_captcha', projectId: targetProjectId, correctEmoji });
                await bot.sendMessage(ctx.chatId, captchaMessage, { reply_markup: keyboard });
            }
            return;
        }

        // --- 3. From here on, we are only dealing with group messages ---
        if (ctx.isPrivateChat) return;

        // --- 4. If group isn't part of a project, only allow /settings and /addgroup commands ---
        if (!ctx.projectId) {
            if (isCommand(text, '/settings') || isCommand(text, '/addgroup')) {
                // Let these commands fall through to be handled below
            } else {
                console.log(`Ignoring message in unlinked group ${ctx.chatId}.`);
                return;
            }
        }
        
        // --- 5. Handle admin commands ---
        const member = await bot.getChatMember(ctx.chatId, String(ctx.userId));
        const isAdmin = ['creator', 'administrator'].includes(member.status);
        if (isAdmin) {
            const targetUser = await getTargetUser(bot, message);
            const commandNeedsUser = ['/kick', '/ban', '/mute', '/unmute', '/warn', '/unverify'].some(cmd => isCommand(text, cmd));

            if (commandNeedsUser && !targetUser) {
                return sendAndDelete(bot, ctx.chatId, 'Please reply to a user or @mention them to use this command.', 10);
            }

            if (isCommand(text, '/kick')) {
                if (!targetUser) return; 
                try {
                    await bot.kickChatMember(ctx.chatId, targetUser.id);
                    await sendAndDelete(bot, ctx.chatId, `✅ @${targetUser.username || targetUser.first_name} has been kicked.`, 15);
                     if (ctx.projectId) await logger.logModerationEvent({
                        projectId: ctx.projectId,
                        chatId: ctx.chatId,
                        eventType: 'kick',
                        actorUserId: ctx.userId,
                        targetUserId: targetUser.id,
                    });
                } catch (e) {
                    await sendAndDelete(bot, ctx.chatId, '❌ Failed to kick user. I may not have permission.', 10);
                }
                return;
            } else if (isCommand(text, '/ban')) {
                if (!targetUser) return;
                try {
                    await bot.banChatMember(ctx.chatId, targetUser.id);
                    await sendAndDelete(bot, ctx.chatId, `✅ @${targetUser.username || targetUser.first_name} has been banned.`, 15);
                    // The chat_member handler will log this event.
                } catch (e) {
                    await sendAndDelete(bot, ctx.chatId, '❌ Failed to ban user. I may not have permission.', 10);
                }
                return;
            } else if (isCommand(text, '/mute')) {
                if (!targetUser || !ctx.projectId) return;
                const parts = text.split(' ');
                const timeArg = parts.length > 1 ? parts[parts.length -1] : '0';
                let untilDate = 0; // 0 means permanently
                let durationStr = "permanently";

                if (timeArg.endsWith('m')) {
                    const minutes = parseInt(timeArg.replace('m', ''));
                    if (!isNaN(minutes)) {
                        untilDate = Math.floor(Date.now() / 1000) + minutes * 60;
                        durationStr = `${minutes} minute(s)`;
                    }
                } else if (timeArg.endsWith('h')) {
                    const hours = parseInt(timeArg.replace('h', ''));
                    if (!isNaN(hours)) {
                        untilDate = Math.floor(Date.now() / 1000) + hours * 3600;
                        durationStr = `${hours} hour(s)`;
                    }
                } else if (timeArg.endsWith('d')) {
                    const days = parseInt(timeArg.replace('d', ''));
                    if (!isNaN(days)) {
                        untilDate = Math.floor(Date.now() / 1000) + days * 86400;
                        durationStr = `${days} day(s)`;
                    }
                }

                try {
                    await bot.restrictChatMember(ctx.chatId, targetUser.id, { can_send_messages: false }, { until_date: untilDate });
                    await sendAndDelete(bot, ctx.chatId, `✅ @${targetUser.username || targetUser.first_name} has been muted for ${durationStr}.`, 15);
                    await logger.logModerationEvent({
                        projectId: ctx.projectId,
                        chatId: ctx.chatId,
                        eventType: 'mute',
                        actorUserId: ctx.userId,
                        targetUserId: targetUser.id,
                        details: `Muted for ${durationStr}`
                    });
                } catch (e) {
                    await sendAndDelete(bot, ctx.chatId, '❌ Failed to mute user. I may not have permission.', 10);
                }
                return;
            } else if (isCommand(text, '/unmute')) {
                if (!targetUser || !ctx.projectId) return;
                try {
                    await bot.restrictChatMember(ctx.chatId, targetUser.id, { can_send_messages: true, can_send_media_messages: true, can_send_other_messages: true, can_add_web_page_previews: true, can_send_polls: true });
                    await sendAndDelete(bot, ctx.chatId, `✅ @${targetUser.username || targetUser.first_name} has been unmuted.`, 15);
                    await logger.logModerationEvent({
                        projectId: ctx.projectId,
                        chatId: ctx.chatId,
                        eventType: 'unmute',
                        actorUserId: ctx.userId,
                        targetUserId: targetUser.id,
                    });
                } catch (e) {
                    await sendAndDelete(bot, ctx.chatId, '❌ Failed to unmute user. I may not have permission.', 10);
                }
                return;
            } else if (isCommand(text, '/purge')) {
                if (!message.reply_to_message) return sendAndDelete(bot, ctx.chatId, "Please reply to a message to start purging from there.", 10);
                
                const fromId = message.reply_to_message.message_id;
                const toId = message.message_id;
                let count = 0;
                for (let i = fromId; i <= toId; i++) {
                    try { await bot.deleteMessage(ctx.chatId, i.toString()); count++; } catch(e) {}
                }
                await sendAndDelete(bot, ctx.chatId, `✅ Purged ${count} messages.`, 10);
                return;
            } else if (isCommand(text, '/warn')) {
                if (!targetUser || !ctx.projectId) return;
                const newWarningCount = await db.incrementWarningCount(ctx.projectId, targetUser.id);
                await sendAndDelete(bot, ctx.chatId, `⚠️ @${targetUser.username || targetUser.first_name} has received a warning. They now have ${newWarningCount}/3 warnings.`, 20);
                await logger.logModerationEvent({
                    projectId: ctx.projectId,
                    chatId: ctx.chatId,
                    eventType: 'warn',
                    actorUserId: ctx.userId,
                    targetUserId: targetUser.id,
                    details: `Warning ${newWarningCount}/3`
                });
                return;
            } else if (isCommand(text, '/rules')) {
                if(!ctx.effectiveSettings) return;
                const rules = ctx.effectiveSettings.rules;
                if (rules) {
                    await bot.sendMessage(ctx.chatId, rules);
                } else {
                    await sendAndDelete(bot, ctx.chatId, "No community rules have been configured.", 15);
                }
                return;
            } else if (isCommand(text, '/addgroup')) {
                const session = await db.getUserSession(ctx.userId);
                if (!session || session.action !== 'awaiting_addgroup_command' || !session.projectId) {
                    await sendAndDelete(bot, ctx.chatId, "You need to start this process from the /settings menu.", 10);
                    return;
                }
                const botMember = await bot.getChatMember(ctx.chatId, (await bot.getMe()).id.toString());
                if (botMember.status !== 'administrator') {
                    await sendAndDelete(bot, ctx.chatId, "I must be an admin in this group to manage it.", 10);
                    return;
                }
                const chatInfo = await bot.getChat(ctx.chatId);
                await db.addGroupToProject(session.projectId, String(ctx.chatId), chatInfo.title || `Group ${ctx.chatId}`);
                await sendAndDelete(bot, ctx.chatId, `✅ This group has been successfully added to your project.`, 15);
                await db.clearUserSession(ctx.userId);
                return;
            } else if (isCommand(text, '/unverify')) {
                if (!ctx.projectId) {
                    await sendAndDelete(bot, ctx.chatId, "This group is not part of a project.", 10);
                    return;
                }
                if (!targetUser) return;
                const wasVerified = await db.unverifyUser(ctx.projectId, targetUser.id);
                if (wasVerified) {
                    await sendAndDelete(bot, ctx.chatId, `✅ @${targetUser.username || targetUser.first_name} has been un-verified.`, 20);
                } else {
                    await sendAndDelete(bot, ctx.chatId, `User @${targetUser.username || targetUser.first_name} was not on the verified list.`, 15);
                }
                return;
            } else if (isCommand(text, '/settings')) {
                if (ctx.projectId) {
                    await showMainMenu(bot, ctx, 'Configure your project settings:');
                } else {
                    if (await db.isProjectCreationLocked(ctx.chatId)) {
                        await sendAndDelete(bot, ctx.chatId, "A project creation is already in progress for this group.", 20);
                        return;
                    }
                    await db.lockProjectCreation(ctx.chatId);

                    const text = "This group isn't part of a project yet. A 'Project' lets you manage settings for multiple groups at once. Would you like to create a new project?";
                    const reply_markup = {
                        inline_keyboard: [
                            [{ text: "Yes, Create Project", callback_data: `project_create_${ctx.chatId}` }],
                            [{ text: "Not Now", callback_data: `project_cancel_creation_${ctx.chatId}` }]
                        ]
                    };
                    await bot.sendMessage(ctx.chatId, text, { reply_markup });
                }
                return;
            }
        }
        
        // --- 6. Handle non-admin messages (e.g., blacklist check) ---
        if (!isAdmin && ctx.projectId && ctx.effectiveSettings && Array.isArray(ctx.effectiveSettings.blacklistedWords) && ctx.effectiveSettings.blacklistedWords.length > 0) {
            const blacklist = ctx.effectiveSettings.blacklistedWords;
            const lowerCaseText = text.toLowerCase();
            
            for (const bannedWord of blacklist) {
                if (lowerCaseText.includes(bannedWord)) {
                    await bot.deleteMessage(ctx.chatId, message.message_id.toString());
                    const newWarningCount = await db.incrementBlacklistWarnings(ctx.projectId, ctx.userId);
                    
                    await logger.logModerationEvent({
                        projectId: ctx.projectId,
                        chatId: ctx.chatId,
                        eventType: 'blacklist_delete',
                        actorUserId: (await bot.getMe()).id,
                        targetUserId: ctx.userId,
                        details: `Message deleted containing word: ${bannedWord}`
                    });

                    if (newWarningCount < 3) {
                        await sendAndDelete(bot, ctx.chatId, `⚠️ @${from.username || from.first_name}, your message was removed. This is warning [${newWarningCount}/3].`);
                    } else {
                        await db.resetBlacklistWarnings(ctx.projectId, ctx.userId);
                        const muteDuration = Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60); // 14 days
                        await bot.restrictChatMember(ctx.chatId, ctx.userId, { can_send_messages: false }, { until_date: muteDuration });
                        await sendAndDelete(bot, ctx.chatId, `🔇 @${from.username || from.first_name} has been muted for 14 days after a third warning for using forbidden words.`);
                        
                        await logger.logModerationEvent({
                            projectId: ctx.projectId,
                            chatId: ctx.chatId,
                            eventType: 'blacklist_mute',
                            actorUserId: (await bot.getMe()).id,
                            targetUserId: ctx.userId,
                            details: `Muted for 14 days after 3 blacklist warnings.`
                        });
                    }
                    return; // Message handled, stop processing.
                }
            }
        }

    } catch (error) {
        console.error(JSON.stringify({
            level: 'ERROR', message: 'Error in handleMessage',
            chatId: ctx.chatId, userId: ctx.userId, text: text,
            error: error instanceof Error ? error.message : String(error)
        }));
        try {
            // Avoid sending error messages in group chats to reduce noise
            if(ctx.isPrivateChat) {
               await bot.sendMessage(ctx.chatId, "❌ An error occurred. I've logged the issue.");
            }
        } catch (sendError) {
             console.error(JSON.stringify({
                level: 'ERROR', message: 'Failed to send error message in handleMessage',
                chatId: ctx.chatId, userId: ctx.userId,
                error: sendError instanceof Error ? sendError.message : String(sendError)
            }));
        }
    }
}


async function showMainMenu(bot: TelegramBot, ctx: RequestContext, text: string, messageId?: number) {
    const reply_markup = {
        inline_keyboard: [
          [{ text: 'Project Welcome & Verification', callback_data: 'settings_welcome' }],
          [{ text: 'Override Group Settings', callback_data: 'settings_overrides' }],
          [{ text: 'Manage Groups', callback_data: 'settings_manage_groups' }],
          [{ text: 'Project Community Rules', callback_data: 'settings_edit_rules' }],
          [{ text: '🚫 Project Word Blacklist', callback_data: 'settings_blacklist' }],
          [{ text: '🩺 Health Check', callback_data: 'settings_health' }],
          [{ text: '✅ Done', callback_data: 'settings_done' }]
        ]
    };

    try {
        if (messageId) {
            await bot.editMessageText(text, { chat_id: ctx.chatId, message_id: messageId, reply_markup });
        } else {
            await bot.sendMessage(ctx.chatId, text, { reply_markup });
        }
    } catch (error) {
        console.error(JSON.stringify({
            level: 'ERROR', message: 'Error in showMainMenu',
            action: messageId ? 'editMessageText' : 'sendMessage',
            chatId: ctx.chatId, messageId: messageId,
            error: error instanceof Error ? error.message : String(error)
        }));
        // Avoid crashing if the original message was deleted.
        if (!messageId || (error instanceof Error && error.message.includes('message to edit not found'))) {
             try {
                await bot.sendMessage(ctx.chatId, text, { reply_markup });
             } catch (fallbackError) {
                console.error(JSON.stringify({
                    level: 'ERROR', message: 'Error in showMainMenu fallback',
                    action: 'sendMessage', chatId: ctx.chatId,
                    error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
                }));
             }
        }
    }
}

async function handleChatMemberUpdate(bot: TelegramBot, chatMember: TelegramBot.ChatMemberUpdated) {
    const { chat, new_chat_member, from } = chatMember;
    
    const projectId = await db.getProjectByChatId(String(chat.id));

    if (!projectId) return;

    const userId = new_chat_member.user.id;

    if (new_chat_member.status === 'kicked') {
        console.log(`User ${userId} was banned from chat ${chat.id}. Logging ban.`);
        await db.banUser(projectId, userId, chat.id);
        await logger.logModerationEvent({
            projectId,
            chatId: chat.id,
            eventType: 'ban',
            actorUserId: from.id, // The admin who performed the action
            targetUserId: userId
        });
    }

    if ((new_chat_member.status === 'member' || new_chat_member.status === 'restricted') && new_chat_member.old_chat_member.status === 'kicked') {
         const wasBanned = await db.unbanUser(projectId, userId);
         if (wasBanned) {
             console.log(`User ${userId} was unbanned from chat ${chat.id}. Removing from ban list.`);
             await logger.logModerationEvent({
                projectId,
                chatId: chat.id,
                eventType: 'unban',
                actorUserId: from.id,
                targetUserId: userId
             });
         }
    }
}

async function processNewUser(bot: TelegramBot, user: TelegramBot.User, ctx: RequestContext) {
    if (user.is_bot || !ctx.projectId) return;

    // Check if the user is banned.
    const banInfo = await db.getBanInfo(ctx.projectId, user.id);
    if (banInfo) {
        const thirtyDaysInMillis = 30 * 24 * 60 * 60 * 1000;
        const timeSinceBan = new Date().getTime() - banInfo.bannedAt.getTime();
        
        if (timeSinceBan < thirtyDaysInMillis) {
            try {
                await bot.kickChatMember(ctx.chatId, user.id);
                console.log(`Kicked user ${user.id} from chat ${ctx.chatId} due to active ban.`);
            } catch (kickError) {
                console.error(JSON.stringify({
                    level: 'ERROR', message: 'Failed to kick banned user', chatId: ctx.chatId, userId: user.id,
                    error: kickError instanceof Error ? kickError.message : String(kickError)
                }));
            }
            return;
        } else {
            // If the ban has expired, unban them.
            await db.unbanUser(ctx.projectId, user.id);
        }
    }

    // If we've reached this point, the user is not actively banned.
    // Proceed with the normal verification flow.
    const isVerified = await db.isUserVerified(ctx.projectId, user.id);
    const chatInfo = await bot.getChat(ctx.chatId);

    await handleNewUser({
        chat: { id: ctx.chatId, title: chatInfo.title || "the group" }, 
        new_chat_members: [user],
        isVerified: isVerified,
        projectId: ctx.projectId
    }, bot);
}

export async function POST(req: NextRequest) {
  // CORRECTED: Initialize the bot inside the request handler.
  const bot = await getBot();

  // If the bot fails to initialize (e.g., missing token), exit gracefully for this request.
  if (!bot) {
    console.error("FATAL: Bot initialization failed for this request. Check TG_BOT_TOKEN secret.");
    return NextResponse.json({ status: 'error', message: 'Bot initialization failed.' }, { status: 500 });
  }

  try {
    const body = await req.json();
    console.log('Telegram Update:', JSON.stringify(body, null, 2));

    // Delete "user joined" / "user left" service messages automatically
    if (body.message && (body.message.new_chat_members || body.message.left_chat_member || body.message.new_chat_title)) {
        setTimeout(() => {
            bot.deleteMessage(body.message.chat.id, body.message.message_id.toString()).catch(err => {
                 if (!String(err).includes('message to delete not found')) {
                     console.warn(JSON.stringify({
                        level: 'WARN', message: 'Failed to auto-delete service message',
                        chatId: body.message.chat.id, messageId: body.message.message_id,
                        error: err instanceof Error ? err.message : String(err)
                    }));
                 }
            });
        }, 10 * 1000); 
    }
    
    // --- Robustly determine the context of the incoming request ---
    let chatId: number | undefined;
    let userId: number | undefined; // The user who *caused* the event.
    let isPrivateChat = false;

    if (body.message) {
        chatId = body.message.chat?.id;
        userId = body.message.from?.id;
        isPrivateChat = body.message.chat?.type === 'private';
    } else if (body.callback_query) {
        chatId = body.callback_query.message?.chat?.id || body.callback_query.from.id;
        userId = body.callback_query.from?.id;
        isPrivateChat = body.callback_query.message?.chat?.type === 'private' || !body.callback_query.message?.chat?.id;
    } else if (body.chat_member) {
        chatId = body.chat_member.chat?.id;
        userId = body.chat_member.from?.id; // The user who performed the action (e.g., the admin)
        isPrivateChat = body.chat_member.chat.type === 'private';
    }

    // If we can't determine the fundamental context, we can't proceed.
    if (!chatId || !userId) {
        console.log("Could not determine chat or user ID from the update. Ignoring.", body);
        return NextResponse.json({ status: 'ok - ignored, no context' });
    }

    const projectId = await db.getProjectByChatId(String(chatId));
    
    const effectiveSettings = projectId ? await db.getEffectiveSettings(projectId, chatId) : undefined;

    const ctx: RequestContext = {
        chatId,
        userId,
        isPrivateChat,
        projectId,
        effectiveSettings,
    };

    // --- Route the update to the correct handler ---
    if (body.callback_query) {
      await handleCallbackQuery(bot, body.callback_query, ctx);
    } else if (body.chat_member) {
        await handleChatMemberUpdate(bot, body.chat_member);
    } else if (body.message) {
      // Auto-delete slash commands in group chats to keep things clean.
      if (body.message.text && body.message.text.startsWith('/') && !isPrivateChat) {
        setTimeout(() => {
            bot.deleteMessage(body.message.chat.id, body.message.message_id.toString()).catch((err) => {
              if (!String(err).includes('message to delete not found')) {
                console.warn(JSON.stringify({
                  level: 'WARN', message: 'Failed to delete user command message',
                  error: err instanceof Error ? err.message : String(err)
                }));
              }
            });
        }, 10 * 1000);
      }

      if (body.message.new_chat_members && body.message.new_chat_members.length > 0) {
        if (!ctx.projectId) {
            console.warn(`New user in chat ${ctx.chatId}, but no project is linked. Ignoring.`);
        } else {
            for (const user of body.message.new_chat_members) {
                await processNewUser(bot, user, ctx);
            }
        }
      } else {
        await handleMessage(bot, body.message, ctx);
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    const rawBody = await req.text().catch(() => 'Could not read body');
    console.error(JSON.stringify({
        level: 'FATAL', message: 'Top-level error in webhook POST handler',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        requestBody: rawBody
    }));
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to process update', details: errorMessage }, { status: 500 });
  }
}

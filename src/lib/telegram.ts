
/**
 * @file This file is the single source of truth for the Telegram Bot instance.
 * It ensures the bot is initialized only once and reuses the central Firebase instance.
 */
import TelegramBot from 'node-telegram-bot-api';
import { getSecret } from './secrets';

let botInstance: TelegramBot | null = null;

/**
 * Asynchronously gets the singleton instance of the TelegramBot.
 * It fetches the bot token from Secret Manager.
 * @returns A Promise that resolves to the TelegramBot instance, or null if the token is missing.
 */
export async function getBot(): Promise<TelegramBot | null> {
    if (botInstance) {
        return botInstance;
    }

    const token = await getSecret('TG_BOT_TOKEN');

    if (token) {
        botInstance = new TelegramBot(token);
        return botInstance;
    } else {
        console.error('CRITICAL: TG_BOT_TOKEN secret could not be retrieved. The Telegram bot cannot be initialized.');
        return null;
    }
}


import type TelegramBot from 'node-telegram-bot-api';

/**
 * Sends a message to a chat and automatically deletes it after a specified delay.
 * This is a utility function to keep chats clean from temporary bot messages.
 * @param bot The TelegramBot instance.
 * @param chatId The ID of the chat to send the message to.
 * @param text The text of the message to send.
 * @param delaySeconds The number of seconds to wait before deleting the message. Defaults to 15.
 */
export async function sendAndDelete(bot: TelegramBot, chatId: number, text: string, delaySeconds: number = 15) {
    try {
        const sentMessage = await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
        setTimeout(() => {
            bot.deleteMessage(chatId, sentMessage.message_id).catch(err => {
                // It's common for a message to be deleted by an admin before the timeout, so we only log other errors.
                if (!String(err).includes('message to delete not found')) {
                    console.error(JSON.stringify({
                        level: 'ERROR',
                        message: 'Error auto-deleting message',
                        action: 'deleteMessage',
                        chatId: chatId,
                        messageId: sentMessage.message_id,
                        error: err instanceof Error ? err.message : String(err)
                    }));
                }
            });
        }, delaySeconds * 1000);
    } catch (error) {
        console.error(JSON.stringify({
            level: 'ERROR',
            message: 'Error in sendAndDelete',
            action: 'sendMessage',
            chatId: chatId,
            error: error instanceof Error ? error.message : String(error)
        }));
    }
}

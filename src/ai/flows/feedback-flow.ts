
'use server';
/**
 * @fileOverview A flow for sending feedback emails.
 *
 * - sendFeedbackEmail - A function that handles sending feedback via email.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import nodemailer from 'nodemailer';

const FeedbackInputSchema = z.object({
  feedbackText: z.string(),
});
type FeedbackInput = z.infer<typeof FeedbackInputSchema>;

const FeedbackOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export async function sendFeedbackEmail(input: FeedbackInput) {
  return feedbackFlow(input);
}

const feedbackFlow = ai.defineFlow(
  {
    name: 'feedbackFlow',
    inputSchema: FeedbackInputSchema,
    outputSchema: FeedbackOutputSchema,
  },
  async ({ feedbackText }) => {
    const {
      FEEDBACK_RECIPIENT_EMAIL,
      SENDER_EMAIL_HOST,
      SENDER_EMAIL_PORT,
      SENDER_EMAIL_USER,
      SENDER_EMAIL_APP_PASSWORD,
    } = process.env;

    if (!FEEDBACK_RECIPIENT_EMAIL || !SENDER_EMAIL_HOST || !SENDER_EMAIL_PORT || !SENDER_EMAIL_USER || !SENDER_EMAIL_APP_PASSWORD) {
      const message = "Email configuration is incomplete. Please set all required environment variables for the sender email account.";
      console.error(message);
      return { success: false, message };
    }

    const transporter = nodemailer.createTransport({
      host: SENDER_EMAIL_HOST,
      port: Number(SENDER_EMAIL_PORT),
      secure: Number(SENDER_EMAIL_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: SENDER_EMAIL_USER,
        pass: SENDER_EMAIL_APP_PASSWORD,
      },
    });

    try {
      await transporter.sendMail({
        from: `"modOS" <${SENDER_EMAIL_USER}>`,
        to: FEEDBACK_RECIPIENT_EMAIL,
        subject: 'New Feedback from modOS Dashboard',
        text: feedbackText,
        html: `<p>${feedbackText.replace(/\n/g, '<br>')}</p>`,
      });
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while sending email.';
      console.error('Nodemailer error:', errorMessage);
      // Return the specific error message to the front-end for better debugging.
      return { success: false, message: `Failed to send email: ${errorMessage}` };
    }
  }
);

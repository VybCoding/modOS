
'use server';

import { z } from 'zod';
import { sendFeedbackEmail } from '@/ai/flows/feedback-flow';

const feedbackFormSchema = z.object({
  feedbackText: z
    .string()
    .min(10, {
      message: 'Feedback must be at least 10 characters.',
    })
    .max(2000, {
      message: 'Feedback must not be longer than 2000 characters.',
    }),
});

type FeedbackFormValues = z.infer<typeof feedbackFormSchema>;

export async function submitFeedback(data: FeedbackFormValues) {
  const validation = feedbackFormSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await sendFeedbackEmail(validation.data);
    if (!result.success) {
      // Pass the more specific error message from the flow
      throw new Error(result.message || 'The email flow failed without a specific message.');
    }
    return {
      success: true,
      message: 'Feedback submitted successfully!',
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'An unknown error occurred.';
    return {
      success: false,
      error: { _form: [error] },
    };
  }
}


'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { submitFeedback } from './actions';
import { Github } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

export default function FeedbackPage() {
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      feedbackText: '',
    },
    mode: 'onChange',
  });

  async function onSubmit(data: FeedbackFormValues) {
    const result = await submitFeedback(data);
    if (result.success) {
      toast({
        title: 'Feedback Submitted',
        description: 'Thank you for your feedback!',
      });
      form.reset();
    } else {
      toast({
        title: 'Error',
        description: (result.error as any)?._form?.[0] ?? 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Feedback & Community</CardTitle>
          <CardDescription>
            We're building modOS in the open, and your feedback is the most
            valuable part of our development process. Whether you have an idea, a
            bug report, or a general comment, we'd love to hear it. This
            project is for the community, by the community.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild className="w-full sm:w-auto">
                <Link href="https://github.com/vybteam" target="_blank" rel="noopener noreferrer">
                    <Github className="mr-2 h-4 w-4" /> View Our Code on GitHub
                </Link>
            </Button>
            <Button disabled className="w-full sm:w-auto">
              Build with us (Coming Soon)
            </Button>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="feedbackText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Feedback</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Type your feedback here..."
                        className="resize-y min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

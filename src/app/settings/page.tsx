
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useEffect } from 'react';
import { Rocket, List, PlusCircle, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { saveSettings } from './actions';
import { useRouter } from 'next/navigation';

const settingsFormSchema = z.object({
  appUrl: z.string().url({ message: 'Please enter a valid URL.' }),
  // The projectId will be hardcoded or fetched for the form, not a user input
  projectId: z.string().min(1, { message: 'Project ID is missing.' }),
  projectName: z.string().min(3, { message: 'Project name is required.' }),
  telegramBotToken: z.string().optional(), // Token is now optional
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

// In a real app, these would come from a database call based on user auth
const defaultValues: Partial<SettingsFormValues> = {
  appUrl: '',
  projectId: 'vyb-project-001', // Example Project ID
  projectName: 'My Telegram Project',
  telegramBotToken: '',
  welcomeMessage:
    'Welcome, {username}! Please solve the CAPTCHA to get access to the chat.',
  timeout: 120,
  retries: 2,
  logChannelId: '',
  spammerDb: true,
  silentKicks: true,
  rules: '1. Be respectful.\n2. No spam or self-promotion.',
  blacklist: ['spam word', 'bad word'],
  warnings: 3,
  muteDuration: 14,
};

export default function SetupBotPage() {
  const { toast } = useToast();
  const router = useRouter();
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      form.setValue('appUrl', window.location.origin);
    }
  }, [form]);

  async function onSubmit(data: SettingsFormValues) {
    const result = await saveSettings(data);
    if (result.success) {
      toast({
        title: (
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <span className="font-bold">Project Settings Saved!</span>
          </div>
        ),
        description: result.message || 'Your settings have been saved and the bot is active.',
      });
      // Clear the token field after successful submission for security
      form.reset({ ...data, telegramBotToken: '' });
    } else {
      const errorMessage =
        result.error?._form?.[0] ?? 'An unexpected error occurred.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }

  const managedGroups = [
    { id: '1', name: 'DeekFi Main Chat', members: 1204 },
    { id: '2', name: 'DeekFi Announcements', members: 980 },
  ];
  
  const blacklistedWords = form.watch('blacklist') || [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Tabs defaultValue="general" className="space-y-6">
          <div className="flex items-center">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="verification">Verification & Welcome</TabsTrigger>
              <TabsTrigger value="moderation">Moderation</TabsTrigger>
              <TabsTrigger value="content">Content & Commands</TabsTrigger>
            </TabsList>
            <div className="ml-auto">
               <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Project'}
              </Button>
            </div>
          </div>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Project Settings</CardTitle>
                <CardDescription>
                  Manage the core settings for your project workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <FormField
                  control={form.control}
                  name="projectName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your Community Project" {...field} />
                      </FormControl>
                      <FormDescription>
                        A name for your project workspace in this dashboard.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="telegramBotToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telegram Bot Token</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter new token to update" {...field} />
                      </FormControl>
                      <FormDescription>
                        Leave blank if you are not updating the token. Your token is stored securely.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <Label>Managed Groups</Label>
                   <Card className="mt-2">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Group Name</TableHead>
                                <TableHead>Members</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {managedGroups.map(group => (
                                <TableRow key={group.id}>
                                    <TableCell className="font-medium">{group.name}</TableCell>
                                    <TableCell>{group.members}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" disabled>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                     <CardFooter className="justify-between border-t p-4">
                        <p className="text-sm text-muted-foreground">Add or remove groups using bot commands.</p>
                        <Button disabled><PlusCircle className="mr-2 h-4 w-4"/>Add Group</Button>
                    </CardFooter>
                   </Card>
                </div>
                 <FormField
                    control={form.control}
                    name="logChannelId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admin Log Channel ID</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="-100... (optional)" />
                        </FormControl>
                        <FormDescription>
                           The ID of the private channel for event logging.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="verification">
            <Card>
              <CardHeader>
                <CardTitle>Verification & Welcome</CardTitle>
                <CardDescription>
                  Configure how new users are verified when they join a group in your project.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                 <FormField
                  control={form.control}
                  name="welcomeMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Welcome Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., Welcome, {username}!"
                          className="resize-y"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        This is the message sent to new users. Use <code>{"{username}"}</code> to tag them.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="timeout"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verification Timeout (seconds)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Time a user has to solve the CAPTCHA.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="retries"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CAPTCHA Retries</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Number of attempts a user gets for the CAPTCHA.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

           <TabsContent value="moderation">
            <Card>
              <CardHeader>
                <CardTitle>Automated Moderation</CardTitle>
                <CardDescription>
                  Set up rules for automatically managing your community.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                 <div>
                    <FormLabel>Word Blacklist</FormLabel>
                    <Card className="mt-2">
                         <CardContent className="p-4">
                            <div className="flex gap-2">
                                <Input placeholder="Add a forbidden word..." id="new-blacklist-word"/>
                                <Button type="button" onClick={() => {
                                    const input = document.getElementById('new-blacklist-word') as HTMLInputElement;
                                    if (input && input.value) {
                                        form.setValue('blacklist', [...blacklistedWords, input.value.trim().toLowerCase()]);
                                        input.value = '';
                                    }
                                }}>Add Word</Button>
                            </div>
                         </CardContent>
                        {blacklistedWords.length > 0 ? (
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Word</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {blacklistedWords.map((word, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-mono">{word}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" type="button" onClick={() => {
                                                    form.setValue('blacklist', blacklistedWords.filter(w => w !== word));
                                                }}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                             <p className="p-4 text-sm text-muted-foreground">No blacklisted words yet.</p>
                        )}
                   </Card>
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="warnings"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Warnings Before Mute</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Number of blacklist violations before a user is muted.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="muteDuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mute Duration (days)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          How long a user is muted after final warning.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                 <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="spammerDb"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Spammer Database Integration</FormLabel>
                          <FormDescription>
                            Automatically ban known spammers on sight.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="silentKicks"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Silent Kicks</FormLabel>
                          <FormDescription>
                            Prevent "User was kicked" messages in the chat.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content">
            <Card>
              <CardHeader>
                <CardTitle>Content & Commands</CardTitle>
                <CardDescription>
                    Define the content for commands like `/rules`.
                </CardDescription>
              </CardHeader>
              <CardContent>
                 <FormField
                    control={form.control}
                    name="rules"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Community Rules</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter the rules for your community, one per line."
                            className="resize-y min-h-[250px] font-mono"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          This text will be displayed when an admin uses the `/rules` command. Supports Markdown.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </form>
    </Form>
  );
}

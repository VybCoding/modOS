'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { StatCards } from '@/components/dashboard/StatCards';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { HistoricalChart } from '@/components/dashboard/HistoricalChart';
import { Leaderboard } from '@/components/dashboard/Leaderboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SettingsProvider, useSettings } from '@/components/dashboard/SettingsProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion } from 'framer-motion';

function TimeFrameSelector() {
    const { timeFrame, setTimeFrame } = useSettings();
    return (
        <Select onValueChange={(value) => setTimeFrame(value as any)} defaultValue={timeFrame}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time frame" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
        </Select>
    )
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

function Dashboard({ projectId }: { projectId: string }) {
    return (
        <Tabs defaultValue="overview" className="space-y-4">
            <div className="flex justify-between">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="leaderboards">Advanced Leaderboards</TabsTrigger>
                    <TabsTrigger value="reports">User Reports</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                <TimeFrameSelector />
            </div>
            <TabsContent value="overview" className="space-y-4">
                <motion.div
                    className="space-y-6"
                    initial="hidden"
                    animate="visible"
                    variants={{
                        visible: { transition: { staggerChildren: 0.1 } }
                    }}
                >
                    <motion.div variants={cardVariants}><StatCards projectId={projectId} /></motion.div>
                    <motion.div variants={cardVariants}><Leaderboard projectId={projectId} isOverview /></motion.div>
                    <motion.div variants={cardVariants}>
                        <Card>
                            <CardHeader>
                                <CardTitle>Activity Over Time</CardTitle>
                                <CardDescription>
                                    A summary of new members and moderation actions over the last 30 days.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <HistoricalChart projectId={projectId} />
                            </CardContent>
                        </Card>
                    </motion.div>
                    <motion.div variants={cardVariants}>
                        <Card>
                            <CardHeader>
                            <CardTitle>Activity Feed</CardTitle>
                            <CardDescription>
                                A live feed of the most recent moderation actions taken by the bot.
                            </Description>
                            </CardHeader>
                            <CardContent>
                            <ActivityFeed projectId={projectId} />
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            </TabsContent>
            <TabsContent value="leaderboards" className="space-y-4">
                 <motion.div initial="hidden" animate="visible" variants={cardVariants}>
                    <Leaderboard projectId={projectId} />
                 </motion.div>
            </TabsContent>
            <TabsContent value="reports">
                <motion.div initial="hidden" animate="visible" variants={cardVariants}>
                    <Card>
                        <CardHeader>
                            <CardTitle>User Reports</CardTitle>
                            <CardDescription>
                                Coming soon: Detailed reports for individual users.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p>This section is under construction.</p>
                        </CardContent>
                    </Card>
                </motion.div>
            </TabsContent>
            <TabsContent value="settings">
                 <motion.div initial="hidden" animate="visible" variants={cardVariants}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Reporting Settings</CardTitle>
                            <CardDescription>
                               Customize your reporting experience.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p>This section is under construction, but you can already use the time frame selector in the top right.</p>
                        </CardContent>
                    </Card>
                 </motion.div>
            </TabsContent>
        </Tabs>
    )
}


export default function DashboardPage({
  params,
}: {
  params: { projectId: string };
}) {
  const { projectId } = params;

  return (
    <SettingsProvider>
        <Dashboard projectId={projectId} />
    </SettingsProvider>
  );
}

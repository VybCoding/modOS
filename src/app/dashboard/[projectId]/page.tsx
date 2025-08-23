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
                <div className="space-y-6">
                    <StatCards projectId={projectId} />
                    <Leaderboard projectId={projectId} isOverview />
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
                </div>
            </TabsContent>
            <TabsContent value="leaderboards" className="space-y-4">
                <Leaderboard projectId={projectId} />
            </TabsContent>
            <TabsContent value="reports">
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
            </TabsContent>
            <TabsContent value="settings">
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

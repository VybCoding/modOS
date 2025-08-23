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

export default function DashboardPage({
  params,
}: {
  params: { projectId: string };
}) {
  const { projectId } = params;

  return (
    <div className="space-y-6">
      <StatCards projectId={projectId} />
      <Leaderboard projectId={projectId} />
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
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityFeed projectId={projectId} />
        </CardContent>
      </Card>
    </div>
  );
}

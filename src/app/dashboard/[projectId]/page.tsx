
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  UserX,
  Trash2,
  ShieldX,
  UserCheck,
  Ban,
  MessageCircleWarning,
} from 'lucide-react';
import type { StatCard, Log } from '@/lib/types';
import { logs } from '@/lib/data';
import { RelativeTime } from '@/components/relative-time';

const StatCard = ({
  icon: Icon,
  title,
  value,
  change,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  change?: string;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {change && (
        <p className="text-xs text-muted-foreground">{change} from last month</p>
      )}
    </CardContent>
  </Card>
);

const logIcons: Record<Log['type'], React.ElementType> = {
  join: Users,
  verified: UserCheck,
  failed: ShieldX,
  kicked: UserX,
  banned: Ban,
  admin_verify: UserCheck,
  warn: MessageCircleWarning,
  'blacklist-delete': Trash2,
};

const getLogMessage = (log: Log) => {
  const Icon = logIcons[log.type] || ShieldX;
  return (
    <div className="flex items-center gap-4">
      <div className="hidden h-9 w-9 items-center justify-center rounded-lg bg-muted sm:flex">
        <Icon className="h-5 w-5" />
      </div>
      <div className="grid gap-1">
        <p className="text-sm font-medium">{log.message}</p>
        <p className="text-sm text-muted-foreground">
          <RelativeTime timestamp={log.timestamp} />
        </p>
      </div>
    </div>
  );
};

export default function DashboardPage({ params }: { params: { projectId: string } }) {
    console.log("Project ID:", params.projectId);

  // The static data will be replaced with data fetched based on the projectId.
  // For now, we can leave the UI structure with the static data.
  const stats: StatCard[] = [
    {
      title: 'New Members Verified',
      value: '1,284',
      change: '+20.1%',
      icon: Users,
    },
    {
      title: 'Users Banned/Kicked',
      value: '82',
      change: '-2.5%',
      icon: UserX,
    },
    {
      title: 'Messages Deleted (Blacklist)',
      value: '431',
      change: '+12.1%',
      icon: Trash2,
    },
    {
      title: 'Warnings Issued',
      value: '57',
      change: '+5.0%',
      icon: ShieldX,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            icon={stat.icon}
            title={stat.title}
            value={stat.value}
            change={stat.change}
          />
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Activity Feed</CardTitle>
          <CardDescription>
            A live feed of the most recent moderation actions taken by the bot.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Activity feed coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}

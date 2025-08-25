'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Users, UserX, Trash2, ShieldX } from 'lucide-react';
import useSWR from 'swr';
import { useAuth } from '@/components/auth-provider';
import { useState, useEffect } from 'react';

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

const fetcher = async ([url, token]: [string, string]) => {
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
        throw new Error('An error occurred while fetching the data.');
    }
    return res.json();
};

export function StatCards({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      user.getIdToken().then(setToken);
    }
  }, [user]);

  const { data, error } = useSWR(token ? [`/api/projects/${projectId}/stats`, token] : null, fetcher);

  if (error) return <div>Failed to load stats</div>;
  if (!data) return <div>Loading...</div>;

  const stats = [
    {
      title: 'New Members Verified',
      value: data.newMembers,
      icon: Users,
    },
    {
      title: 'Users Banned/Kicked',
      value: data.usersBanned,
      icon: UserX,
    },
    {
      title: 'Messages Deleted (Blacklist)',
      value: data.messagesDeleted,
      icon: Trash2,
    },
    {
      title: 'Warnings Issued',
      value: data.warningsIssued,
      icon: ShieldX,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard
          key={stat.title}
          icon={stat.icon}
          title={stat.title}
          value={stat.value}
        />
      ))}
    </div>
  );
}

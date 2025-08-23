'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useSWR from 'swr';
import { useAuth } from '@/components/auth-provider';
import { useState, useEffect } from 'react';

const fetcher = async ([url, token]: [string, string]) => {
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
        throw new Error('An error occurred while fetching the data.');
    }
    return res.json();
};

export function HistoricalChart({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      user.getIdToken().then(setToken);
    }
  }, [user]);

  const { data, error } = useSWR(token ? [`/api/projects/${projectId}/charts/activity-over-time`, token] : null, fetcher);

  if (error) return <div>Failed to load chart</div>;
  if (!data) return <div>Loading...</div>;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip
            contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
            }}
        />
        <Legend />
        <Line type="monotone" dataKey="newMembers" stroke="hsl(var(--primary))" name="New Members" />
        <Line type="monotone" dataKey="moderationActions" stroke="hsl(var(--destructive))" name="Moderation Actions" />
      </LineChart>
    </ResponsiveContainer>
  );
}

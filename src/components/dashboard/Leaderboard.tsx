'use client';

import useSWR from 'swr';
import { useAuth } from '@/components/auth-provider';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const fetcher = async ([url, token]: [string, string]) => {
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
        throw new Error('An error occurred while fetching the data.');
    }
    return res.json();
};

function LeaderboardTable({ title, data }: { title: string, data: { username: string, count: number }[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item) => (
                            <TableRow key={item.username}>
                                <TableCell>{item.username}</TableCell>
                                <TableCell className="text-right">{item.count}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}


export function Leaderboard({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      user.getIdToken().then(setToken);
    }
  }, [user]);

  const { data, error } = useSWR(token ? [`/api/projects/${projectId}/leaderboards`, token] : null, fetcher);

  if (error) return <div>Failed to load leaderboards</div>;
  if (!data) return (
    <div className="grid gap-4 md:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Top Moderators</CardTitle>
            </CardHeader>
            <CardContent>
                <div>Loading...</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Top Warned Users</CardTitle>
            </CardHeader>
            <CardContent>
                <div>Loading...</div>
            </CardContent>
        </Card>
    </div>
  )

  return (
    <div className="grid gap-4 md:grid-cols-2">
        <LeaderboardTable title="Top Moderators" data={data.topModerators} />
        <LeaderboardTable title="Top Warned Users" data={data.topWarnedUsers} />
    </div>
  );
}

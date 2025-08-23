'use client';

import useSWR from 'swr';
import { useAuth } from '@/components/auth-provider';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSettings } from './SettingsProvider';
import { motion } from 'framer-motion';

const fetcher = async ([url, token]: [string, string]) => {
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
        throw new Error('An error occurred while fetching the data.');
    }
    return res.json();
};

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const MotionTableRow = motion(TableRow);

function SimpleLeaderboardTable({ title, data }: { title: string, data: { username: string, count: number }[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }}>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead className="text-right">Count</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((item) => (
                                <MotionTableRow key={item.username} variants={rowVariants}>
                                    <TableCell>{item.username}</TableCell>
                                    <TableCell className="text-right">{item.count}</TableCell>
                                </MotionTableRow>
                            ))}
                        </TableBody>
                    </Table>
                </motion.div>
            </CardContent>
        </Card>
    )
}

function ModeratorLeaderboardTable({ data }: { data: { username: string, total: number, banned: number, kicked: number, warnings: number, deletions: number }[] }) {
    return (
        <Card className="col-span-1 md:col-span-2">
            <CardHeader>
                <CardTitle>Top Moderators</CardTitle>
                <CardDescription>By total moderation actions</CardDescription>
            </CardHeader>
            <CardContent>
                 <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }}>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-right">Bans</TableHead>
                                <TableHead className="text-right">Kicks</TableHead>
                                <TableHead className="text-right">Warnings</TableHead>
                                <TableHead className="text-right">Deletions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((item) => (
                                <MotionTableRow key={item.username} variants={rowVariants}>
                                    <TableCell>{item.username}</TableCell>
                                    <TableCell className="text-right">{item.total}</TableCell>
                                    <TableCell className="text-right">{item.banned}</TableCell>
                                    <TableCell className="text-right">{item.kicked}</TableCell>
                                    <TableCell className="text-right">{item.warnings}</TableCell>
                                    <TableCell className="text-right">{item.deletions}</TableCell>
                                </MotionTableRow>
                            ))}
                        </TableBody>
                    </Table>
                 </motion.div>
            </CardContent>
        </Card>
    )
}


export function Leaderboard({ projectId, isOverview }: { projectId: string, isOverview?: boolean }) {
  const { user } = useAuth();
  const { timeFrame } = useSettings();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      user.getIdToken().then(setToken);
    }
  }, [user]);

  const { data, error } = useSWR(token ? [`/api/projects/${projectId}/leaderboards?timeFrame=${timeFrame}`, token] : null, fetcher);

  if (error) return <div>Failed to load leaderboards</div>;
  if (!data) return <div>Loading...</div>;

  if (isOverview) {
      return (
        <div className="grid gap-4 md:grid-cols-2">
            <SimpleLeaderboardTable title="Top Moderators" data={data.topModerators.map((d: any) => ({username: d.username, count: d.total}))} />
            <SimpleLeaderboardTable title="Top Warned Users" data={data.topWarnedUsers} />
        </div>
      )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
        <ModeratorLeaderboardTable data={data.topModerators} />
        <SimpleLeaderboardTable title="Top Banned Users" data={data.topBannedUsers} />
        <SimpleLeaderboardTable title="Top Kicked Users" data={data.topKickedUsers} />
        <SimpleLeaderboardTable title="Top Warned Users" data={data.topWarnedUsers} />
    </div>
  );
}

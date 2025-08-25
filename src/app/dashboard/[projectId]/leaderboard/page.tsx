'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { useVirtual } from '@tanstack/react-virtual';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProjectUser } from '@/lib/xp-types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

// This is a placeholder for the actual hook that would handle theme changes and haptics.
// In a real implementation, this would interact with the Telegram Mini App SDK.
const useTelegram = () => {
    useEffect(() => {
        // Placeholder for theme change listener
        // window.Telegram.WebApp.onEvent('themeChanged', () => { ... });
        console.log("Telegram Mini App hooks would be initialized here.");
    }, []);

    const triggerHapticFeedback = (type: 'impact' | 'notification' | 'selection') => {
        // window.Telegram.WebApp.HapticFeedback[type]();
        console.log(`Haptic feedback triggered: ${type}`);
    };

    return { triggerHapticFeedback };
};


export default function LeaderboardPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const { user } = useAuth();
  const { triggerHapticFeedback } = useTelegram();
  const [leaderboard, setLeaderboard] = useState<ProjectUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tableContainerRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtual({
    count: leaderboard.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 64, // Estimate row height
  });

  // Placeholder for the current user's rank
  const myRank = { rank: 101, username: 'You', xp: 42, level: 1 };

  useEffect(() => {
    async function fetchLeaderboard() {
      if (!user) return;

      try {
        const idToken = await user.getIdToken();
        const response = await fetch(`/api/projects/${projectId}/leaderboard`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard');
        }

        const data: ProjectUser[] = await response.json();
        setLeaderboard(data);
        triggerHapticFeedback('notification');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, [user, projectId, triggerHapticFeedback]);

  const getPodiumStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-400/20 border-yellow-500';
      case 2:
        return 'bg-gray-400/20 border-gray-500';
      case 3:
        return 'bg-orange-400/20 border-orange-500';
      default:
        return '';
    }
  };

  const requiredXpForNextLevel = (level: number) => 150 * Math.pow(level, 1.5);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground">See who's leading the community engagement.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Top 100 Users</CardTitle>
        </CardHeader>
        <CardContent ref={tableContainerRef} className="h-[500px] overflow-auto">
          <div style={{ height: `${rowVirtualizer.totalSize}px`, width: '100%', position: 'relative' }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Rank</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>XP</TableHead>
                  <TableHead className="w-[200px]">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowVirtualizer.virtualItems.map((virtualRow) => {
                  const u = leaderboard[virtualRow.index];
                  const rank = virtualRow.index + 1;
                  const nextLevelXp = Math.floor(requiredXpForNextLevel(u.level));
                  const prevLevelXp = u.level > 1 ? Math.floor(requiredXpForNextLevel(u.level - 1)) : 0;
                  const xpForLevel = nextLevelXp - prevLevelXp;
                  const xpProgress = u.xp - prevLevelXp;
                  const percentage = xpForLevel > 0 ? Math.floor((xpProgress / xpForLevel) * 100) : 100;

                  return (
                    <TableRow
                      key={u.username}
                      className={getPodiumStyle(rank)}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <TableCell className="font-bold text-lg">{rank}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={`https://robohash.org/${u.username}.png`} />
                            <AvatarFallback>{u.username?.[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{u.username || 'Anonymous'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{u.level}</TableCell>
                      <TableCell>{Math.floor(u.xp)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={percentage} className="w-[60%]" />
                          <span className="text-xs text-muted-foreground">{percentage}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
       <div className="sticky bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t">
          <div className="flex justify-between items-center max-w-4xl mx-auto">
              <div className="flex items-center gap-3">
                  <span className="font-bold text-lg">#{myRank.rank}</span>
                  <Avatar>
                      <AvatarImage src={`https://robohash.org/${myRank.username}.png`} />
                      <AvatarFallback>{myRank.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{myRank.username}</span>
              </div>
              <div>
                  <span className="font-bold">{myRank.xp} XP</span>
                  <span className="text-muted-foreground"> (Level {myRank.level})</span>
              </div>
          </div>
       </div>
    </div>
  );
}

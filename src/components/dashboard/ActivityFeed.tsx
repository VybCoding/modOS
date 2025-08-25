'use client';

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
  UserCheck,
  ShieldX,
  Ban,
  MessageCircleWarning,
  Trash2,
} from 'lucide-react';
import { RelativeTime } from '@/components/relative-time';
import { useEffect, useState } from 'react';
import { getFirestore, collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { ActivityLog } from '@/lib/types';
import { useAuth } from '@/components/auth-provider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const logIcons: Record<ActivityLog['eventType'], React.ElementType> = {
  MEMBER_VERIFIED: UserCheck,
  USER_BANNED: Ban,
  MESSAGE_DELETED: Trash2,
  WARNING_ISSUED: MessageCircleWarning,
};

const getLogMessage = (log: ActivityLog) => {
  const Icon = logIcons[log.eventType] || ShieldX;
  const target = log.targetUserId.substring(0, 6);
  const actor = log.actorUid.substring(0, 6);

  const messages = {
    MEMBER_VERIFIED: `User ...${target} was verified by ...${actor}`,
    USER_BANNED: `User ...${target} was banned by ...${actor}`,
    MESSAGE_DELETED: `A message from ...${target} was deleted by ...${actor}`,
    WARNING_ISSUED: `User ...${target} was warned by ...${actor}`,
  }

  return (
    <div className="flex items-center gap-4">
      <div className="hidden h-9 w-9 items-center justify-center rounded-lg bg-muted sm:flex">
        <Icon className="h-5 w-5" />
      </div>
      <div className="grid gap-1">
        <p className="text-sm font-medium">{messages[log.eventType]}</p>
        <p className="text-sm text-muted-foreground">
          <RelativeTime timestamp={log.timestamp.toDate()} />
        </p>
      </div>
    </div>
  );
};

export function ActivityFeed({ projectId }: { projectId: string }) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [filter, setFilter] = useState<ActivityLog['eventType'] | 'ALL'>('ALL');
  const { auth } = useAuth();

  useEffect(() => {
    if (!projectId || !auth) return;
    const db = getFirestore(auth.app);

    let q;
    if (filter !== 'ALL') {
        q = query(
          collection(db, 'activity_logs'),
          where('projectId', '==', projectId),
          where('eventType', '==', filter),
          orderBy('timestamp', 'desc'),
          limit(50)
        );
    } else {
        q = query(
          collection(db, 'activity_logs'),
          where('projectId', '==', projectId),
          orderBy('timestamp', 'desc'),
          limit(50)
        );
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const newActivities: ActivityLog[] = [];
      querySnapshot.forEach((doc) => {
        newActivities.push({ id: doc.id, ...doc.data() } as ActivityLog);
      });
      setActivities(newActivities);
    });

    return () => unsubscribe();
  }, [projectId, auth, filter]);

  return (
    <div>
        <div className="flex justify-end mb-4">
            <Select onValueChange={(value) => setFilter(value as any)} defaultValue="ALL">
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">All Events</SelectItem>
                    <SelectItem value="MEMBER_VERIFIED">Member Verified</SelectItem>
                    <SelectItem value="USER_BANNED">User Banned</SelectItem>
                    <SelectItem value="MESSAGE_DELETED">Message Deleted</SelectItem>
                    <SelectItem value="WARNING_ISSUED">Warning Issued</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Event</TableHead>
                <TableHead className="hidden sm:table-cell">Type</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {activities.map((log) => (
                <TableRow key={log.id}>
                    <TableCell>{getLogMessage(log)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline">{log.eventType.replace(/_/g, ' ')}</Badge>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
  );
}

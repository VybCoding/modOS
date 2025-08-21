
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
  UserCheck,
  ShieldX,
  UserX,
  Ban,
  MessageCircleWarning,
  Trash2,
} from 'lucide-react';
import type { Log } from '@/lib/types';
import { logs } from '@/lib/data';
import { useRouter } from 'next/navigation';
import { RelativeTime } from '@/components/relative-time';

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

export default function ActivityLogPage() {
  const router = useRouter();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Log</CardTitle>
        <CardDescription>
          A detailed, reverse-chronological log of every action the bot has
          taken across the project.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead className="hidden sm:table-cell">Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{getLogMessage(log)}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant="outline">{log.type.replace('-', ' ')}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

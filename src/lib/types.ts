
export type User = {
  id: string;
  username: string;
  avatar: string;
  joinDate: Date;
  status: 'pending' | 'verified' | 'banned';
  warnings?: number;
};

import { Timestamp } from 'firebase/firestore';

export type ActivityLog = {
  id?: string; // Firestore document ID
  timestamp: Timestamp;
  eventType:
    | 'MEMBER_VERIFIED'
    | 'USER_BANNED'
    | 'MESSAGE_DELETED'
    | 'WARNING_ISSUED';
  actorUid: string;
  targetUserId: string;
  projectId: string;
  [key: string]: any; // Allow for other properties
};

export type StatCard = {
  title: string;
  value: string;
  change?: string;
  icon: React.ElementType;
};

export type ChartData = {
  date: string;
  verified: number;
  kicked: number;
};

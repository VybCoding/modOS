import { FieldValue } from 'firebase-admin/firestore';

export type ProjectUser = {
  xp: number;
  level: number;
  messageCount: number;
  lastMessageTimestamp: FieldValue;
  username?: string;
  firstName?: string;
  lastName?: string;
};

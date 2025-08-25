
import type { User, Log, ChartData } from './types';
import { subDays, subHours, subMinutes } from 'date-fns';

export const allUsers: User[] = [
  {
    id: 'deek',
    username: 'Deek',
    avatar: 'https://placehold.co/100x100.png',
    joinDate: new Date(),
    status: 'verified',
    warnings: 0,
  },
  {
    id: 'crypto_king',
    username: 'CryptoKing',
    avatar: 'https://placehold.co/100x100.png',
    joinDate: subDays(new Date(), 1),
    status: 'verified',
    warnings: 1,
  },
  {
    id: 'nft_queen',
    username: 'NFTQueen',
    avatar: 'https://placehold.co/100x100.png',
    joinDate: subDays(new Date(), 2),
    status: 'pending',
    warnings: 0,
  },
  {
    id: 'john_doe',
    username: 'John Doe',
    avatar: 'https://placehold.co/100x100.png',
    joinDate: subDays(new Date(), 3),
    status: 'pending',
    warnings: 2,
  },
  {
    id: 'spammer_01',
    username: 'Spammer01',
    avatar: 'https://placehold.co/100x100.png',
    joinDate: subDays(new Date(), 4),
    status: 'banned',
    warnings: 3,
  },
  {
    id: 'jane_smith',
    username: 'Jane Smith',
    avatar: 'https://placehold.co/100x100.png',
    joinDate: subDays(new Date(), 5),
    status: 'verified',
    warnings: 0,
  },
  {
    id: 'bot_hunter',
    username: 'BotHunter',
    avatar: 'https://placehold.co/100x100.png',
    joinDate: subDays(new Date(), 6),
    status: 'banned',
    warnings: 3,
  },
];

export const pendingUsers = allUsers.filter((user) => user.status === 'pending');

export const logs: Log[] = [
  {
    id: '1',
    type: 'admin_verify',
    message: 'Admin manually verified @crypto_king.',
    timestamp: subMinutes(new Date(), 5),
  },
  {
    id: '2',
    type: 'kicked',
    message: '@Spammer01 kicked for failing CAPTCHA.',
    timestamp: subHours(new Date(), 1),
  },
  {
    id: '6',
    type: 'warn',
    message: '@john_doe received warning 2/3.',
    timestamp: subHours(new Date(), 2),
  },
  {
    id: '3',
    type: 'verified',
    message: '@deek successfully verified.',
    timestamp: subHours(new Date(), 4),
  },
   {
    id: '7',
    type: 'blacklist-delete',
    message: 'Message from @crypto_king deleted (blacklist).',
    timestamp: subDays(new Date(), 1),
  },
  {
    id: '4',
    type: 'join',
    message: '@deek joined the channel.',
    timestamp: subDays(new Date(), 1),
  },
  {
    id: '5',
    type: 'banned',
    message: '@BotHunter banned by spammer database.',
    timestamp: subDays(new Date(), 2),
  },
];

export const chartData: ChartData[] = [
  { date: '7 days ago', verified: 120, kicked: 10 },
  { date: '6 days ago', verified: 150, kicked: 15 },
  { date: '5 days ago', verified: 175, kicked: 8 },
  { date: '4 days ago', verified: 130, kicked: 12 },
  { date: '3 days ago', verified: 190, kicked: 20 },
  { date: '2 days ago', verified: 210, kicked: 5 },
  { date: 'Yesterday', verified: 180, kicked: 11 },
  { date: 'Today', verified: 201, kicked: 12 },
];

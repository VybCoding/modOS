import { NextResponse } from 'next/server';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getSecret } from '../../../../../../lib/secrets';
import { subDays } from 'date-fns';

async function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    const serviceAccountJson = await getSecret('FIREBASE_SERVICE_ACCOUNT');
    if (!serviceAccountJson) {
      console.error("FIREBASE_SERVICE_ACCOUNT secret not found.");
      throw new Error('Internal Server Error: Missing service account');
    }
    const serviceAccount = JSON.parse(serviceAccountJson);
    initializeApp({
      credential: cert(serviceAccount),
    });
  }
}

async function getUsernames(db: FirebaseFirestore.Firestore, uids: string[]) {
    const users: { [key: string]: string } = {};
    if (uids.length === 0) return users;

    const usersRef = db.collection('users');
    const chunks = [];
    for (let i = 0; i < uids.length; i += 10) {
        chunks.push(uids.slice(i, i + 10));
    }

    for (const chunk of chunks) {
        const snapshot = await usersRef.where('__name__', 'in', chunk).get();
        snapshot.forEach(doc => {
            users[doc.id] = doc.data()?.username || `...${doc.id.substring(doc.id.length - 4)}`;
        });
    }

    for (const uid of uids) {
        if (!users[uid]) {
            users[uid] = `...${uid.substring(uid.length - 4)}`;
        }
    }

    return users;
}

export async function GET(request: Request, { params }: { params: { projectId: string } }) {
  try {
    await initializeFirebaseAdmin();
    const db = getFirestore();
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const timeFrame = searchParams.get('timeFrame') || '30d';

    const days = parseInt(timeFrame.replace('d', ''));
    const startDate = subDays(new Date(), days);
    const startDateTimestamp = Timestamp.fromDate(startDate);

    const activityLogsRef = db.collection('activity_logs');
    const q = activityLogsRef
        .where('projectId', '==', projectId)
        .where('timestamp', '>=', startDateTimestamp);

    const snapshot = await q.get();

    const moderatorStats: { [key: string]: { total: number, banned: number, kicked: number, warnings: number, deletions: number } } = {};
    const warnedUsers: { [key: string]: number } = {};
    const bannedUsers: { [key: string]: number } = {};
    const kickedUsers: { [key: string]: number } = {};

    snapshot.docs.forEach(doc => {
      const log = doc.data();
      const actor = log.actorUid;
      const target = log.targetUserId;

      if (actor) {
        if (!moderatorStats[actor]) {
            moderatorStats[actor] = { total: 0, banned: 0, kicked: 0, warnings: 0, deletions: 0 };
        }
        moderatorStats[actor].total++;
      }

      if (log.eventType === 'USER_BANNED') {
        if (actor) moderatorStats[actor].banned++;
        if (target) bannedUsers[target] = (bannedUsers[target] || 0) + 1;
      } else if (log.eventType === 'USER_KICKED') {
        if (actor) moderatorStats[actor].kicked++;
        if (target) kickedUsers[target] = (kickedUsers[target] || 0) + 1;
      } else if (log.eventType === 'WARNING_ISSUED') {
        if (actor) moderatorStats[actor].warnings++;
        if (target) warnedUsers[target] = (warnedUsers[target] || 0) + 1;
      } else if (log.eventType === 'MESSAGE_DELETED') {
        if (actor) moderatorStats[actor].deletions++;
      }
    });

    const topModerators = Object.entries(moderatorStats)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 5);

    const topWarnedUsers = Object.entries(warnedUsers).sort(([, a], [, b]) => b - a).slice(0, 5);
    const topBannedUsers = Object.entries(bannedUsers).sort(([, a], [, b]) => b - a).slice(0, 5);
    const topKickedUsers = Object.entries(kickedUsers).sort(([, a], [, b]) => b - a).slice(0, 5);

    const uids = [...new Set([
        ...topModerators.map(([uid]) => uid),
        ...topWarnedUsers.map(([uid]) => uid),
        ...topBannedUsers.map(([uid]) => uid),
        ...topKickedUsers.map(([uid]) => uid),
    ])];

    const usernames = await getUsernames(db, uids);

    const leaderboards = {
      topModerators: topModerators.map(([uid, stats]) => ({ username: usernames[uid], ...stats })),
      topWarnedUsers: topWarnedUsers.map(([uid, count]) => ({ username: usernames[uid], count })),
      topBannedUsers: topBannedUsers.map(([uid, count]) => ({ username: usernames[uid], count })),
      topKickedUsers: topKickedUsers.map(([uid, count]) => ({ username: usernames[uid], count })),
    };

    return NextResponse.json(leaderboards);
  } catch (error) {
    console.error('Error getting leaderboards:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

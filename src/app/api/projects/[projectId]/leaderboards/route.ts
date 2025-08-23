import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getSecret } from '../../../../../../lib/secrets';

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
    // Firestore 'in' queries are limited to 10 items.
    // We can chunk the uids array if we expect more than 10.
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

    // For any UIDs not found, use a placeholder
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

    const activityLogsRef = db.collection('activity_logs');
    const q = activityLogsRef.where('projectId', '==', projectId);
    const snapshot = await q.get();

    const moderatorStats: { [key: string]: number } = {};
    const warnedUsers: { [key: string]: number } = {};

    snapshot.docs.forEach(doc => {
      const log = doc.data();

      if (log.actorUid) {
          moderatorStats[log.actorUid] = (moderatorStats[log.actorUid] || 0) + 1;
      }

      if (log.eventType === 'WARNING_ISSUED' && log.targetUserId) {
        warnedUsers[log.targetUserId] = (warnedUsers[log.targetUserId] || 0) + 1;
      }
    });

    const topModerators = Object.entries(moderatorStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const topWarnedUsers = Object.entries(warnedUsers)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const moderatorUids = topModerators.map(([uid]) => uid);
    const warnedUserUids = topWarnedUsers.map(([uid]) => uid);

    const [moderatorUsernames, warnedUserUsernames] = await Promise.all([
        getUsernames(db, moderatorUids),
        getUsernames(db, warnedUserUids)
    ]);

    const leaderboards = {
      topModerators: topModerators.map(([uid, count]) => ({ username: moderatorUsernames[uid], count })),
      topWarnedUsers: topWarnedUsers.map(([uid, count]) => ({ username: warnedUserUsernames[uid], count })),
    };

    return NextResponse.json(leaderboards);
  } catch (error) {
    console.error('Error getting leaderboards:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

import { NextResponse } from 'next/server';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getSecret } from '../../../../../../lib/secrets';
import { subDays, format, startOfDay, parseISO } from 'date-fns';

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

export async function GET(request: Request, { params }: { params: { projectId: string } }) {
  try {
    await initializeFirebaseAdmin();
    const db = getFirestore();
    const { projectId } = params;

    const thirtyDaysAgo = subDays(new Date(), 30);
    const thirtyDaysAgoTimestamp = Timestamp.fromDate(thirtyDaysAgo);

    const activityLogsRef = db.collection('activity_logs');
    const q = activityLogsRef
      .where('projectId', '==', projectId)
      .where('timestamp', '>=', thirtyDaysAgoTimestamp);

    const snapshot = await q.get();

    const dailyData: { [key: string]: { date: string; newMembers: number; moderationActions: number } } = {};

    // Initialize data for the last 30 days
    for (let i = 0; i < 30; i++) {
        const date = startOfDay(subDays(new Date(), i));
        const formattedDateKey = format(date, 'yyyy-MM-dd');
        dailyData[formattedDateKey] = {
            date: format(date, 'MMM d'),
            newMembers: 0,
            moderationActions: 0
        };
    }

    snapshot.docs.forEach(doc => {
      const log = doc.data();
      const dateKey = format(log.timestamp.toDate(), 'yyyy-M-d');
      const formattedDateKey = format(startOfDay(log.timestamp.toDate()), 'yyyy-MM-dd');

      if (dailyData[formattedDateKey]) {
          if (log.eventType === 'MEMBER_VERIFIED') {
            dailyData[formattedDateKey].newMembers++;
          } else if (['USER_BANNED', 'MESSAGE_DELETED', 'WARNING_ISSUED'].includes(log.eventType)) {
            dailyData[formattedDateKey].moderationActions++;
          }
      }
    });

    const chartData = Object.values(dailyData).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json(chartData);
  } catch (error) {
    console.error('Error getting chart data:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

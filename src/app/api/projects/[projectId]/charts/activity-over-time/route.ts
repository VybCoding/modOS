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

    const dailyData: { [key: string]: { date: string; newMembers: number; moderationActions: number } } = {};

    for (let i = 0; i < days; i++) {
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
      const formattedDateKey = format(startOfDay(log.timestamp.toDate()), 'yyyy-MM-dd');

      if (dailyData[formattedDateKey]) {
          if (log.eventType === 'MEMBER_VERIFIED') {
            dailyData[formattedDateKey].newMembers++;
          } else if (['USER_BANNED', 'MESSAGE_DELETED', 'WARNING_ISSUED', 'USER_KICKED'].includes(log.eventType)) {
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

import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getSecret } from '../../../../../lib/secrets';
import { ActivityLog } from '../../../../../lib/types';

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

    const activityLogsRef = db.collection('activity_logs');
    const q = activityLogsRef
      .where('projectId', '==', projectId)
      .orderBy('timestamp', 'desc')
      .limit(50);

    const snapshot = await q.get();
    const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ActivityLog[];

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Error getting activity logs:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getSecret } from '../../../../../lib/secrets';

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

    const newMembersQuery = activityLogsRef.where('projectId', '==', projectId).where('eventType', '==', 'MEMBER_VERIFIED');
    const usersBannedQuery = activityLogsRef.where('projectId', '==', projectId).where('eventType', '==', 'USER_BANNED');
    const messagesDeletedQuery = activityLogsRef.where('projectId', '==', projectId).where('eventType', '==', 'MESSAGE_DELETED');
    const warningsIssuedQuery = activityLogsRef.where('projectId', '==', projectId).where('eventType', '==', 'WARNING_ISSUED');

    const [newMembersSnapshot, usersBannedSnapshot, messagesDeletedSnapshot, warningsIssuedSnapshot] = await Promise.all([
        newMembersQuery.get(),
        usersBannedQuery.get(),
        messagesDeletedQuery.get(),
        warningsIssuedQuery.get(),
    ]);

    const stats = {
      newMembers: newMembersSnapshot.size,
      usersBanned: usersBannedSnapshot.size,
      messagesDeleted: messagesDeletedSnapshot.size,
      warningsIssued: warningsIssuedSnapshot.size,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

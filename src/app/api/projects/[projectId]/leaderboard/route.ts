import { NextResponse } from 'next/server';
import * as db from '@/lib/database';
import { getAdminAuth } from '@/lib/services';

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const idToken = authHeader.split('Bearer ')[1];
  let decodedToken;
  try {
    decodedToken = await getAdminAuth().verifyIdToken(idToken);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { uid } = decodedToken;
  const { projectId } = params;
  if (!projectId) {
    return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
  }

  try {
    const projectSettings = await db.getProjectSettings(projectId);
    if (!projectSettings || !projectSettings.admins?.includes(Number(uid))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const leaderboard = await db.getLeaderboard(projectId);
    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

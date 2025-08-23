import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getSecret } from './lib/secrets';

async function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    const serviceAccountJson = await getSecret('FIREBASE_SERVICE_ACCOUNT');
    if (!serviceAccountJson) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT secret not found.');
    }
    const serviceAccount = JSON.parse(serviceAccountJson);
    initializeApp({
      credential: cert(serviceAccount),
    });
  }
}

export async function middleware(request: NextRequest) {
  try {
    await initializeFirebaseAdmin();
    const db = getFirestore();

    const authorization = request.headers.get('authorization');
    const token = authorization?.split('Bearer ')[1];

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const decodedToken = await getAuth().verifyIdToken(token);
    const uid = decodedToken.uid;

    const pathname = request.nextUrl.pathname;
    const projectIdMatch = pathname.match(/\/api\/projects\/([^\/]+)/);
    const projectId = projectIdMatch ? projectIdMatch[1] : null;

    if (projectId) {
      const projectRef = db.collection('projects').doc(projectId);
      const projectDoc = await projectRef.get();

      if (!projectDoc.exists) {
        return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }

      const projectMembersRef = db.collection('project_members').doc(projectId);
      const projectMembersDoc = await projectMembersRef.get();

      let isAdmin = false;
      if (projectMembersDoc.exists) {
        const members = projectMembersDoc.data()?.members || {};
        if (members[uid]?.role === 'admin') {
          isAdmin = true;
        }
      } else {
        // Fallback to the admins array in the project document
        const projectDoc = await db.collection('projects').doc(projectId).get();
        const projectData = projectDoc.data();
        const admins = projectData?.admins || [];
        if (admins.includes(uid)) {
          isAdmin = true;
        }
      }

      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', uid);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

  } catch (error) {
    console.error('Error in middleware:', error);
    if (error.code === 'auth/id-token-expired') {
        return new Response(JSON.stringify({ error: 'Token expired' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
}

export const config = {
  matcher: '/api/projects/:path*',
};

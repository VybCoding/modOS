
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import * as db from '@/lib/database';
import { getAdminAuth } from '@/lib/services';
import { getSecret } from '@/lib/secrets';

export async function POST(req: NextRequest) {
  try {
    const botToken = await getSecret('TG_BOT_TOKEN');
    
    if (!botToken) {
      console.error('Authentication failed: TG_BOT_TOKEN secret is not configured.');
      return NextResponse.json({ error: 'Server configuration error: Cannot verify login.' }, { status: 500 });
    }

    const body = await req.json();
    const { id, first_name, username, auth_date, hash } = body;

    // 1. Verify the data is from Telegram
    const dataCheckString = Object.entries(body)
      .filter(([key]) => key !== 'hash')
      .map(([key, value]) => `${key}=${value}`)
      .sort()
      .join('\n');

    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (hmac !== hash) {
      return NextResponse.json({ error: 'Invalid hash' }, { status: 401 });
    }

    // 2. Check if auth_date is recent (e.g., within 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    if (now - auth_date > 300) {
      return NextResponse.json({ error: 'Authentication expired' }, { status: 401 });
    }

    // 3. Check if user is an admin of any project in our DB
    const isAdmin = await db.isUserAdminOfAnyProject(id);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized. You are not an administrator of any configured project.' }, { status: 403 });
    }
    
    // 4. Data is valid and user is an admin. Create a custom Firebase token.
    const adminAuth = await getAdminAuth();
    const customToken = await adminAuth.createCustomToken(String(id));

    return NextResponse.json({ success: true, customToken });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('Login error:', errorMessage);
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  }
}

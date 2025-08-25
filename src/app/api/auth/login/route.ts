
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, createOrUpdateUser, getProjectByChatId, isUserAdminOfAnyProject } from '@/lib/database';
import { getSecret } from '@/lib/secrets';
import crypto from 'crypto';

// Define the structure of the Telegram user data
interface TelegramUserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export async function POST(req: NextRequest) {
  try {
    const data: TelegramUserData = await req.json();

    const botToken = await getSecret('TG_BOT_TOKEN');
    if (!botToken) {
      console.error("CRITICAL: TG_BOT_TOKEN secret is not configured.");
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    const dataCheckString = Object.keys(data)
      .filter((key) => key !== 'hash')
      .sort()
      .map((key) => `${key}=${data[key as keyof Omit<TelegramUserData, 'hash'>]}`)
      .join('\n');

    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString);
    const hash = hmac.digest('hex');

    if (hash !== data.hash) {
      return NextResponse.json({ error: 'Invalid hash. Cannot verify login.' }, { status: 403 });
    }

    const { id, first_name, last_name, username } = data;

    // Create or update the user in the database
    await createOrUpdateUser({ id, first_name, last_name, username });
    
    // Check if the user is an admin of any project
    const isAdmin = await isUserAdminOfAnyProject(id);
    const claims = { isAdmin };

    const adminAuth = getAdminAuth();
    const customToken = await adminAuth.createCustomToken(String(id), claims);

    return NextResponse.json({ customToken });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Login API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  }
}


'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

// This is a public configuration and is safe to expose on the client-side.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};


export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const isConfigured =
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId;

  if (!isConfigured) {
    return (
       <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-lg mx-4">
            <CardHeader>
                <CardTitle>Configuration Error</CardTitle>
                <CardDescription>
                    The Firebase client-side configuration is missing.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                <p>
                    The application cannot connect to Firebase because one or more required environment variables are not set.
                </p>
                <p>
                    Please ensure the following variables are set in your <code className="p-1 text-xs rounded-sm bg-muted">.env.local</code> file:
                </p>
                <ul className="space-y-2 list-disc list-inside font-mono bg-muted p-4 rounded-md text-xs">
                    <li>NEXT_PUBLIC_FIREBASE_API_KEY</li>
                    <li>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</li>
                    <li>NEXT_PUBLIC_FIREBASE_PROJECT_ID</li>
                    <li>NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET</li>
                    <li>NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID</li>
                    <li>NEXT_PUBLIC_FIREBASE_APP_ID</li>
                </ul>
                <p>
                    After adding the variables, you will need to restart your development server.
                </p>
            </CardContent>
        </Card>
    </div>
    );
  }

  return <>{children}</>;
}

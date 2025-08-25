
'use client';

import { useEffect } from 'react';
import { useAuth } from './auth-provider'; // Use the context to get auth
import { signInWithCustomToken } from 'firebase/auth';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Bot } from 'lucide-react';


declare global {
    interface Window {
        Telegram: any;
    }
}

export default function Login() {
  const { auth } = useAuth(); // Get auth from context

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME as string);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '10');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    
    const container = document.getElementById('telegram-login-container');
    if (container) {
      // Prevent adding multiple scripts
      if (container.childElementCount === 0) {
        container.appendChild(script);
      }
    }
    
    (window as any).onTelegramAuth = async (user: any) => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(user),
        });

        if (!res.ok) {
          const { error, details } = await res.json();
          alert(`Login failed: ${error} - ${details || ''}`);
          return;
        }

        const { customToken } = await res.json();
        
        if (customToken) {
           await signInWithCustomToken(auth, customToken);
           // The onAuthStateChanged listener in AuthProvider will handle the redirect.
        } else {
            alert('Login successful, but no custom token received.');
        }

      } catch (error) {
        console.error('Authentication error:', error);
        alert('An error occurred during login. Please try again.');
      }
    };

  }, [auth]); // Add auth to dependency array

  return (
     <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary text-primary-foreground rounded-full h-16 w-16 flex items-center justify-center mb-4">
            <Bot className="h-8 w-8" />
          </div>
          <CardTitle>modOS</CardTitle>
          <CardDescription>
            Please log in with your Telegram account to access the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div id="telegram-login-container" className="flex justify-center"></div>
        </CardContent>
      </Card>
    </div>
  );
}

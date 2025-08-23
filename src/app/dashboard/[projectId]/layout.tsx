'use client';

import { AuthProvider } from '@/components/auth-provider';
import { FirebaseProvider } from '@/components/firebase-provider';
import { LayoutShell } from '@/components/layout-shell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FirebaseProvider>
      <AuthProvider>
        <LayoutShell>{children}</LayoutShell>
      </AuthProvider>
    </FirebaseProvider>
  );
}

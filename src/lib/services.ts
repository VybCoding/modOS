/**
 * @file This file is the single source of truth for all backend service initializations.
 * It enforces a "singleton" pattern, ensuring that services like Firebase Admin
 * are only instantiated ONCE throughout the entire application lifecycle.
 */

import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

// --- Firebase Admin SDK Initialization ---

let app: App;

// In a Google Cloud environment like App Hosting, initializeApp() with no arguments
// automatically discovers the necessary credentials. This is the standard pattern.
if (getApps().length === 0) {
  app = initializeApp();
} else {
  app = getApps()[0];
}

// Export functions that provide the initialized services directly.
export function getDb(): Firestore {
  return getFirestore(app);
};

export function getAdminAuth(): Auth {
  return getAuth(app);
};
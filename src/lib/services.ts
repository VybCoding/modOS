
/**
 * @file This file is the single source of truth for all backend service initializations.
 * It enforces a "singleton" pattern, ensuring that services like Firebase Admin
 * are only instantiated ONCE throughout the entire application lifecycle. This prevents conflicts,
 * memory leaks, and ensures consistent behavior.
 *
 * All other files in the application that need to use these services MUST import them from this file.
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getSecret } from './secrets';


// --- Firebase Admin SDK Initialization ---
// This is the definitive singleton pattern for the Firebase Admin App.
let app: App;

async function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // For local development, GOOGLE_APPLICATION_CREDENTIALS_JSON is fetched from a local .env file
  // and is available in process.env. For production, it's a secret.
  const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || await getSecret('GOOGLE_APPLICATION_CREDENTIALS_JSON');
  
  if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      return initializeApp({
        credential: cert(serviceAccount),
      });
  }
  
  // In the deployed App Hosting environment, initializeApp() discovers credentials automatically.
  return initializeApp();
}


// We cannot initialize the app at the top level because it needs to be async.
// Instead, we export a promise that resolves to the app.
// Downstream files can then `await` this promise.
const appPromise: Promise<App> = initializeFirebaseAdmin();


// Export functions that provide the services, ensuring the app is initialized first.
export const getDb = async (): Promise<Firestore> => {
    const app = await appPromise;
    return getFirestore(app);
};

export const getAdminAuth = async (): Promise<Auth> => {
    const app = await appPromise;
    return getAuth(app);
};

// For direct use in other files that might need the app instance itself
export const db = getFirestore();
export const adminAuth = getAuth();

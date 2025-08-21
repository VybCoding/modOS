'use server';
/**
 * @file This file is the single source of truth for securely accessing secrets.
 * It abstracts the Google Secret Manager logic away from the main application logic
 * and implements a simple in-memory cache to avoid redundant calls.
 */
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

let client: SecretManagerServiceClient | null = null;

function getClient() {
    if (!client) {
        client = new SecretManagerServiceClient();
    }
    return client;
}

const secretCache = new Map<string, string>();

/**
 * Fetches a secret value from Google Secret Manager.
 * It uses an in-memory cache to avoid fetching the same secret multiple times
 * during the lifecycle of a server instance.
 * @param secretName The name of the secret to fetch (e.g., 'TG_BOT_TOKEN').
 * @returns A promise that resolves to the secret's value, or null if not found.
 */
export async function getSecret(secretName: string): Promise<string | null> {
  if (secretCache.has(secretName)) {
    return secretCache.get(secretName)!;
  }

  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    console.error("CRITICAL: GOOGLE_CLOUD_PROJECT environment variable is not set.");
    return null;
  }

  const secretPath = `projects/${projectId}/secrets/${secretName}/versions/latest`;

  try {
    const client = getClient();
    const [version] = await client.accessSecretVersion({
      name: secretPath,
    });

    const payload = version.payload?.data?.toString();
    if (payload) {
      secretCache.set(secretName, payload);
      return payload;
    }

    console.warn(`Secret ${secretName} found but has no payload.`);
    return null;
  } catch (error: any) {
    // Specifically handle the case where the secret is not found without logging a scary error.
    if (error.code === 5) { // gRPC code for NOT_FOUND
      console.warn(`Secret ${secretName} not found in Secret Manager.`);
    } else {
      console.error(`Failed to access secret ${secretName}:`, error);
    }
    return null;
  }
}

// src/ai/genkit.ts
'use server';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// CORRECT: Import the specific function from the Firebase package as per official docs.
import { firebase } from '@genkit-ai/firebase';

// CORRECT: This is the complete and correct configuration.
export const ai = genkit({
  plugins: [
    googleAI(),
    firebase(),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

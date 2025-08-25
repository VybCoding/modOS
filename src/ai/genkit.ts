// src/ai/genkit.ts
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// CORRECT: Import the specific function from the Firebase package as per official docs.
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';

enableFirebaseTelemetry();

// CORRECT: This is the complete and correct configuration.
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
});

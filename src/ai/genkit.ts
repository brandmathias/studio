import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: 'AIzaSyAewLP0x-jq1njPK8532BVf2PBnCfIQ1Zo',
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
});

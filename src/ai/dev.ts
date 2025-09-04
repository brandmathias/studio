import { config } from 'dotenv';
config();

import '@/ai/flows/tts-flow.ts';
import '@/ai/flows/extract-from-pdf-flow.ts';
import '@/ai/flows/auto-prioritization.ts';
import '@/ai/flows/customer-segmentation.ts';

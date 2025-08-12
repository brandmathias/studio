'use server';
/**
 * @fileOverview A flow for creating a calendar event using a tool.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { CreateCalendarEventSchema, createCalendarEventTool } from '../tools/google-calendar';

export type CreateCalendarEventFlowInput = z.infer<typeof CreateCalendarEventSchema>;
export type CreateCalendarEventFlowOutput = z.infer<typeof createCalendarEventTool.outputSchema>;


export async function createCalendarEvent(input: CreateCalendarEventFlowInput): Promise<CreateCalendarEventFlowOutput> {
  return createCalendarEventFlow(input);
}

const createCalendarEventFlow = ai.defineFlow(
  {
    name: 'createCalendarEventFlow',
    inputSchema: CreateCalendarEventSchema,
    outputSchema: createCalendarEventTool.outputSchema,
  },
  async (input) => {
    
    // In a real scenario, you might have a prompt decide whether to call the tool.
    // For this direct implementation, we just call the tool.
    console.log("Executing createCalendarEventTool with input: ", input);

    const toolOutput = await createCalendarEventTool(input);

    if (!toolOutput) {
        throw new Error("The calendar tool did not return an output.");
    }
    
    return toolOutput;
  }
);

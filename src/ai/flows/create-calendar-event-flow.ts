'use server';
/**
 * @fileOverview A flow for creating a calendar event using a tool.
 * This file now includes the tool definition to avoid 'use server' export errors.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
// import { google } from 'googleapis';

// Schema definitions are safe to have in a 'use server' file if not exported directly as objects.
export const CreateCalendarEventSchema = z.object({
  title: z.string().describe('The title of the calendar event.'),
  description: z.string().describe('The description or body of the event.'),
  attendeeEmail: z.string().email().describe("The guest's email address."),
  dueDate: z.string().describe('The due date for the event (YYYY-MM-DD).'),
});

export type CreateCalendarEventFlowInput = z.infer<typeof CreateCalendarEventSchema>;

const CreateCalendarEventOutputSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    eventLink: z.string().optional(),
});

export type CreateCalendarEventFlowOutput = z.infer<typeof CreateCalendarEventOutputSchema>;

// The tool is defined and used within this file, but not exported.
const createCalendarEventTool = ai.defineTool(
  {
    name: 'createCalendarEvent',
    description: 'Creates a Google Calendar event to remind a customer of their due date. This is a simulation and does not connect to the actual Google Calendar API.',
    inputSchema: CreateCalendarEventSchema,
    outputSchema: CreateCalendarEventOutputSchema,
  },
  async (input) => {
    console.log(`[SIMULATION] Creating calendar event for ${input.attendeeEmail}`);
    console.log(`[SIMULATION] Title: ${input.title}`);
    
    // In a real implementation, you would use the Google Calendar API here.
    
    return {
      success: true,
      message: 'SIMULATED: Calendar event created and invitation sent successfully.',
      eventLink: 'https://calendar.google.com/calendar/r/eventedit' // Dummy link
    };
  }
);


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

// This is the only function exported, which is a valid Server Action.
export async function createCalendarEvent(input: CreateCalendarEventFlowInput): Promise<CreateCalendarEventFlowOutput> {
  return createCalendarEventFlow(input);
}
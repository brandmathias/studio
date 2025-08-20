'use server';

/**
 * @fileOverview An auto-prioritization system for customer notifications,
 * defined as a server action for use in the dashboard.
 *
 * - prioritizeCustomer - A function that prioritizes a customer based on their due date and loan value.
 * - PrioritizeCustomerInput - The input type for the prioritizeCustomer function.
 * - PrioritizeCustomerOutput - The return type for the prioritizeCustomer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PrioritizeCustomerInputSchema = z.object({
  dueDate: z
    .string()
    .describe('The due date of the transaction (YYYY-MM-DD).'),
  loanValue: z.number().describe('The value of the loan or installment.'),
  daysLate: z.number().describe('The number of days the payment is late.'),
  hasBeenLateBefore: z
    .boolean()
    .describe('Whether the customer has been late before.'),
});
export type PrioritizeCustomerInput = z.infer<typeof PrioritizeCustomerInputSchema>;

const PrioritizeCustomerOutputSchema = z.object({
  priority: z
    .enum(['high', 'medium', 'low'])
    .describe('The priority level of the customer (high, medium, or low).'),
});
export type PrioritizeCustomerOutput = z.infer<typeof PrioritizeCustomerOutputSchema>;

// This is the main function that will be called from the client component.
export async function prioritizeCustomer(input: PrioritizeCustomerInput): Promise<PrioritizeCustomerOutput> {
  return prioritizeCustomerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'prioritizeCustomerPrompt',
  input: {schema: PrioritizeCustomerInputSchema},
  output: {schema: PrioritizeCustomerOutputSchema},
  prompt: `You are an expert in risk assessment and customer prioritization for a microfinance institution.

  Based on the following customer information, determine the priority level (high, medium, or low) for sending a payment reminder notification.

  Consider these factors:
  - Urgency of the due date
  - Loan value
  - Days late
  - Payment history

  Here's the customer information:
  Due Date: {{{dueDate}}}
  Loan Value: {{{loanValue}}}
  Days Late: {{{daysLate}}}
  Has Been Late Before: {{{hasBeenLateBefore}}}

  Prioritization Rules:
  - High: Due date < 2 days away or loan value > 10 million.
  - Medium: Due date between 2-5 days away or no previous late payments.
  - Low: Due date > 5 days away and small loan value.

  Return the priority level.`,
});

// This is the Genkit flow definition. It's not exported directly to the client.
const prioritizeCustomerFlow = ai.defineFlow(
  {
    name: 'prioritizeCustomerFlow',
    inputSchema: PrioritizeCustomerInputSchema,
    outputSchema: PrioritizeCustomerOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

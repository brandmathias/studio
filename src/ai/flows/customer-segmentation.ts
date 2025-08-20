
'use server';

/**
 * @fileOverview An AI-powered customer segmentation system.
 *
 * - segmentCustomer - A function that analyzes customer data to assign a segment.
 * - SegmentCustomerInput - The input type for the segmentCustomer function.
 * - SegmentCustomerOutput - The return type for the segmentCustomer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SegmentCustomerInputSchema = z.object({
  loan_value: z.number().describe('The total value of the loan or installment.'),
  has_been_late_before: z
    .boolean()
    .describe('Whether the customer has been late on payments in the past.'),
  transaction_count: z.number().describe('The number of transactions this customer has had in the last year.'),
  days_since_last_transaction: z.number().describe('Number of days since the last transaction.')
});
export type SegmentCustomerInput = z.infer<typeof SegmentCustomerInputSchema>;

const SegmentCustomerOutputSchema = z.object({
  segment: z
    .enum(['Platinum', 'Reguler', 'Berisiko', 'Potensi Churn'])
    .describe('The assigned customer segment.'),
});
export type SegmentCustomerOutput = z.infer<typeof SegmentCustomerOutputSchema>;


export async function segmentCustomer(input: SegmentCustomerInput): Promise<SegmentCustomerOutput> {
  return segmentCustomerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'segmentCustomerPrompt',
  input: {schema: SegmentCustomerInputSchema},
  output: {schema: SegmentCustomerOutputSchema},
  prompt: `You are an expert in customer relationship management for a financial institution. Your task is to segment a customer based on their transaction data.

  Analyze the following customer data:
  - Loan Value: {{{loan_value}}}
  - Has Been Late Before: {{{has_been_late_before}}}
  - Transaction Count (last year): {{{transaction_count}}}
  - Days Since Last Transaction: {{{days_since_last_transaction}}}

  Use these rules to determine the segment:
  - **Platinum**: High loan value (> 10,000,000) AND has never been late OR has more than 5 transactions in the last year. These are your most valuable customers.
  - **Berisiko (At-Risk)**: Has been late before, regardless of other factors. These customers need careful monitoring.
  - **Potensi Churn (Potential Churn)**: Low transaction count (< 2) AND more than 180 days since the last transaction. These customers might be losing interest.
  - **Reguler**: If none of the above criteria are met, they are a regular, stable customer.

  Based on the data, return the single most appropriate segment for this customer.`,
});

const segmentCustomerFlow = ai.defineFlow(
  {
    name: 'segmentCustomerFlow',
    inputSchema: SegmentCustomerInputSchema,
    outputSchema: SegmentCustomerOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

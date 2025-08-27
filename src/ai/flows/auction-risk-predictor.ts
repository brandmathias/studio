'use server';

/**
 * @fileOverview An AI flow to predict the auction risk for a customer.
 *
 * - predictAuctionRisk - Predicts the likelihood of a customer's collateral being auctioned.
 * - PredictAuctionRiskInput - The input type for the predictAuctionRisk function.
 * - PredictAuctionRiskOutput - The return type for the predictAuctionRisk function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const PredictAuctionRiskInputSchema = z.object({
  loan_value: z.number().describe('The total value of the loan or installment in IDR.'),
  days_late: z.number().describe('The number of days the payment is past the due date.'),
  has_been_late_before: z.boolean().describe('Whether the customer has been late on payments in the past.'),
  segment: z.enum(['Platinum', 'Reguler', 'Berisiko', 'Potensi Churn', 'none']).describe('The assigned customer segment.'),
  barang_jaminan: z.string().describe('A description of the collateral item(s).'),
  transaction_count: z.number().describe('The number of transactions this customer has had in the last year.'),
});
export type PredictAuctionRiskInput = z.infer<typeof PredictAuctionRiskInputSchema>;

const PredictAuctionRiskOutputSchema = z.object({
  risk_percentage: z.number().min(0).max(100).describe('The probability (0-100%) that the item will go to auction.'),
  risk_level: z.enum(['Rendah', 'Sedang', 'Tinggi', 'Sangat Tinggi']).describe('A categorical risk level.'),
  positive_factors: z.array(z.string()).describe('Factors that decrease the auction risk.'),
  negative_factors: z.array(z.string()).describe('Factors that increase the auction risk.'),
  summary: z.string().describe('A brief, one-sentence summary of the risk assessment.'),
});
export type PredictAuctionRiskOutput = z.infer<typeof PredictAuctionRiskOutputSchema>;


export async function predictAuctionRisk(input: PredictAuctionRiskInput): Promise<PredictAuctionRiskOutput> {
  return predictAuctionRiskFlow(input);
}


const prompt = ai.definePrompt({
  name: 'predictAuctionRiskPrompt',
  input: { schema: PredictAuctionRiskInputSchema },
  output: { schema: PredictAuctionRiskOutputSchema },
  prompt: `You are an expert credit risk analyst for a pawnshop. Your task is to predict the auction risk for a customer whose payment is overdue.

Analyze the following customer data:
- Loan Value: {{{loan_value}}} IDR
- Days Late: {{{days_late}}}
- Previous Late Payments: {{{has_been_late_before}}}
- Customer Segment: {{{segment}}}
- Transaction Count (1yr): {{{transaction_count}}}
- Collateral: "{{{barang_jaminan}}}"

Based on this data, perform the following:
1.  **Calculate Risk Percentage (risk_percentage)**: Estimate the probability (from 0 to 100) that this customer will default and their collateral will be auctioned.
    - High loan value, many days late, and a history of late payments significantly increase the risk.
    - A 'Platinum' or 'Reguler' segment with high transaction count lowers the risk.
    - Easily sellable collateral (like pure gold, popular electronics) might slightly lower the risk of loss for the company, but for this task, focus on the customer's likelihood to default. A high-value, easy-to-sell item might even increase the customer's propensity to let it go if the loan is too high.
    - A customer who is 'Berisiko' or 'Potensi Churn' has a much higher baseline risk.

2.  **Determine Risk Level (risk_level)**: Categorize the percentage into a level:
    - 0-25%: Rendah
    - 26-50%: Sedang
    - 51-75%: Tinggi
    - 76-100%: Sangat Tinggi

3.  **Identify Key Factors (positive_factors, negative_factors)**: List the top 2-3 most influential factors, both positive (decreasing risk) and negative (increasing risk). Be specific and concise.

4.  **Provide a Summary (summary)**: Write a single, conclusive sentence summarizing your findings.

Return the result in the specified JSON format.`,
});

const predictAuctionRiskFlow = ai.defineFlow(
  {
    name: 'predictAuctionRiskFlow',
    inputSchema: PredictAuctionRiskInputSchema,
    outputSchema: PredictAuctionRiskOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI model failed to return a valid prediction.');
    }
    return output;
  }
);

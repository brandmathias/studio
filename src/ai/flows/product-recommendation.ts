
'use server';

/**
 * @fileOverview An AI flow to recommend Pegadaian products to customers.
 *
 * - recommendProduct - Recommends products based on customer data.
 * - ProductRecommendationInput - The input type for the recommendProduct function.
 * - ProductRecommendationOutput - The return type for the recommendProduct function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ProductRecommendationInputSchema = z.object({
  loan_value: z.number().describe('The total value of the customer\'s most recent loan or installment in IDR.'),
  transaction_count: z.number().describe('The number of transactions this customer has had in the last year.'),
  has_been_late_before: z.boolean().describe('Whether the customer has been late on payments in the past.'),
  days_since_last_transaction: z.number().describe('Number of days since the last transaction.'),
  segment: z.enum(['Platinum', 'Reguler', 'Berisiko', 'Potensi Churn', 'none']).describe('The assigned customer segment.'),
  barang_jaminan: z.string().describe('A description of the collateral item(s) from the last transaction.'),
  transaction_type: z.enum(['gadai', 'angsuran']).describe('The type of the last transaction.'),
});
export type ProductRecommendationInput = z.infer<typeof ProductRecommendationInputSchema>;

const RecommendationSchema = z.object({
    product_name: z.string().describe("The specific name of the recommended Pegadaian product (e.g., 'Tabungan Emas', 'Cicil Emas', 'Gadai Efek')."),
    product_category: z.enum(['Simpanan', 'Cicilan', 'Pinjaman', 'Lainnya']).describe("The general category of the product."),
    reasoning: z.string().describe("A concise, personalized, one-sentence explanation of why this product is being recommended to this specific customer.")
});

const ProductRecommendationOutputSchema = z.object({
  recommendations: z.array(RecommendationSchema).min(1).max(3).describe('A list of 1 to 3 personalized product recommendations.'),
  summary: z.string().describe('A brief, one-sentence summary of the customer\'s financial profile and needs based on the input data.')
});
export type ProductRecommendationOutput = z.infer<typeof ProductRecommendationOutputSchema>;


export async function recommendProduct(input: ProductRecommendationInput): Promise<ProductRecommendationOutput> {
  return recommendProductFlow(input);
}


const prompt = ai.definePrompt({
  name: 'recommendProductPrompt',
  input: { schema: ProductRecommendationInputSchema },
  output: { schema: ProductRecommendationOutputSchema },
  prompt: `You are an expert financial advisor for PT Pegadaian. Your task is to analyze a customer's profile and recommend the most suitable products for them.

Analyze the following customer data:
- Most Recent Loan Value: {{{loan_value}}} IDR
- Transaction Count (1yr): {{{transaction_count}}}
- History of Late Payments: {{{has_been_late_before}}}
- Days Since Last Transaction: {{{days_since_last_transaction}}}
- Customer Segment: {{{segment}}}
- Last Collateral: "{{{barang_jaminan}}}"
- Last Transaction Type: "{{{transaction_type}}}"

Based on this data, perform the following:
1.  **Analyze Customer Profile**: Create a brief, one-sentence summary of the customer's likely financial situation and needs. Are they a high-value regular customer? Are they an entrepreneur needing capital? Are they someone who struggles with payments? This will be your 'summary'.

2.  **Generate Recommendations**: Provide 1 to 3 highly personalized product recommendations. For each recommendation, provide:
    - **product_name**: The specific Pegadaian product name.
    - **product_category**: The product's category.
    - **reasoning**: A compelling, short, and personalized reason. Connect the recommendation directly to their data.

**Product Recommendation Logic:**
- **For High-Value/Platinum Customers** (high transaction count, high loan value, no late payments): Recommend investment products like 'Tabungan Emas' for asset growth or 'Gadai Efek' if their collateral suggests they are an investor.
- **For Business Owners** (indicated by collateral like 'Laptop', 'Kamera', 'Motor' and regular 'gadai' transactions): Recommend 'Pinjaman Modal Produktif' or 'Cicil Kendaraan' to support their business growth.
- **For Customers who are 'Potensi Churn'** (few transactions, long time since last transaction): Recommend lighter products to re-engage them, like 'Cicil Emas' with a small grammage, to remind them of Pegadaian's services.
- **For Customers who are 'Berisiko'** (history of late payments): Avoid recommending more loans. Instead, recommend 'Tabungan Emas' as a way to build a financial safety net for future payments.
- **For Customers with Gold Collateral**: They are prime candidates for 'Tabungan Emas' or 'Cicil Emas'.
- **For Salaried Employees** (regular, on-time payments, moderate loan value): Recommend 'Cicil Emas' for long-term investment or 'Gadai Tabungan Emas' for emergency funds without selling their savings.

Return the result in the specified JSON format.`,
});

const recommendProductFlow = ai.defineFlow(
  {
    name: 'recommendProductFlow',
    inputSchema: ProductRecommendationInputSchema,
    outputSchema: ProductRecommendationOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI model failed to return a valid recommendation.');
    }
    return output;
  }
);

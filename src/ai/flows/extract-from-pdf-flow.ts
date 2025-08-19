'use server';

/**
 * @fileOverview An AI flow to extract structured customer data from a PDF document.
 *
 * - extractCustomersFromPdf - Extracts customer information from a PDF file provided as a data URI.
 * - ExtractCustomersInput - The input type for the extractCustomersFromPdf function.
 * - ExtractCustomersOutput - The return type for the extractCustomersFromPdf function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { BroadcastCustomer } from '@/types';

const ExtractCustomersInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "A PDF file encoded as a data URI. Expected format: 'data:application/pdf;base64,<encoded_data>'."
    ),
});
export type ExtractCustomersInput = z.infer<typeof ExtractCustomersInputSchema>;


// Zod schema for a single customer, matching the BroadcastCustomer type
const CustomerSchema = z.object({
    sbg_number: z.string().describe("Nomor SBG (Surat Bukti Gadai)."),
    rubrik: z.string().describe("Rubrik."),
    name: z.string().describe("Nama lengkap nasabah."),
    phone_number: z.string().describe("Nomor telepon atau HP nasabah."),
    credit_date: z.string().describe("Tanggal kredit dalam format DD/MM/YYYY."),
    due_date: z.string().describe("Tanggal jatuh tempo dalam format DD/MM/YYYY."),
    loan_value: z.number().describe("Nilai pinjaman (UP atau Uang Pinjaman)."),
    barang_jaminan: z.string().describe("Deskripsi barang yang dijaminkan."),
    taksiran: z.number().describe("Nilai taksiran barang jaminan."),
    sewa_modal: z.number().describe("Nilai sewa modal (SM)."),
    alamat: z.string().describe("Alamat lengkap nasabah."),
    status: z.string().describe("Status gadai saat ini."),
});

const ExtractCustomersOutputSchema = z.object({
  customers: z
    .array(CustomerSchema)
    .describe('An array of customer objects extracted from the document.'),
});
export type ExtractCustomersOutput = z.infer<typeof ExtractCustomersOutputSchema>;


export async function extractCustomersFromPdf(
  input: ExtractCustomersInput
): Promise<ExtractCustomersOutput> {
  return extractCustomersFlow(input);
}


const prompt = ai.definePrompt({
    name: 'extractCustomersFromPdfPrompt',
    input: { schema: ExtractCustomersInputSchema },
    output: { schema: ExtractCustomersOutputSchema },
    prompt: `You are an expert data extraction agent for a pawnshop called Pegadaian.
Your task is to meticulously extract customer and loan information from the provided PDF document. The document is a report of customers whose pawned items are due.

**CRITICAL INSTRUCTION: You MUST process ALL PAGES of the document from the beginning to the very end.** The report can span multiple pages, and failing to process every single page will result in incomplete data.

Analyze the document provided via the data URI and identify each customer record across all pages. For each record, extract the following fields and return them as a structured JSON object matching the schema:
- sbg_number
- rubrik
- name
- phone_number
- credit_date
- due_date
- loan_value
- barang_jaminan
- taksiran
- sewa_modal
- alamat
- status

Make sure to format all dates as DD/MM/YYYY. Convert all monetary values to numbers, removing any currency symbols or formatting. Combine all customers found across all pages into a single list.

If the document is unreadable, contains no customer data, or is not a valid pawnshop report, return an empty array for the 'customers' field. Do not guess or hallucinate data.

Document for processing:
{{media url=pdfDataUri}}
`,
});


const extractCustomersFlow = ai.defineFlow(
  {
    name: 'extractCustomersFlow',
    inputSchema: ExtractCustomersInputSchema,
    outputSchema: ExtractCustomersOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await prompt(input);
      // Safely return the output or an empty array if output is null/undefined
      return output || { customers: [] };
    } catch (error) {
      console.error("Error during AI prompt execution in extractCustomersFlow:", error);
      // Return an empty array in case of any error during the AI call
      return { customers: [] };
    }
  }
);

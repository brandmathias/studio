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
    prompt: `You are an expert data extraction agent for a pawnshop called Pegadaian. Your task is to extract all customer records from the provided PDF.

Follow this two-step process:
1.  **Analyze the ENTIRE document**: First, go through all pages of the PDF from beginning to end and identify the total number of unique customer records in the document.
2.  **Extract ALL records**: Once you have identified the total count, proceed to extract the details for every single record you found. Do not stop until you have extracted all of them.

**Extraction Fields:**
For each record, extract these fields and return them as a structured JSON object:
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

**Formatting Rules:**
- Dates must be in DD/MM/YYYY format.
- Monetary values must be numbers.

If the document is unreadable or contains no valid data, return an empty 'customers' array.

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

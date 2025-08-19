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

Analyze the document provided via the data URI and identify each customer record. For each record, extract the following fields:
- no_sbg: The loan agreement number.
- rubrik: The loan category or rubric.
- nasabah: The full name of the customer.
- telphp: The customer's phone number.
- tgl_kredit: The date the loan was issued (credit date).
- tgl_jth_tempo: The due date.
- up__uang_pinjaman: The principal loan amount.
- barang_jaminan: The description of the collateral.
- taksiran: The appraised value of the collateral.
- sm__sewa_modal: The service charge or interest (rent modal).
- alamat: The customer's address.
- status: The current status of the loan.

Make sure to format all dates as DD/MM/YYYY. Convert all monetary values to numbers, removing any currency symbols or formatting.

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
    const { output } = await prompt(input);
    if (!output) {
        return { customers: [] };
    }
    return output;
  }
);

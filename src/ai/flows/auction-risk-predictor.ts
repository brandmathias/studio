
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
  risk_percentage: z.number().min(0).max(100).describe('Probabilitas (0-100%) barang akan dilelang.'),
  risk_level: z.enum(['Rendah', 'Sedang', 'Tinggi', 'Sangat Tinggi']).describe('Tingkat risiko kategoris.'),
  positive_factors: z.array(z.string()).describe('Faktor-faktor yang menurunkan risiko lelang.'),
  negative_factors: z.array(z.string()).describe('Faktor-faktor yang meningkatkan risiko lelang.'),
  summary: z.string().describe('Ringkasan singkat satu kalimat tentang penilaian risiko.'),
});
export type PredictAuctionRiskOutput = z.infer<typeof PredictAuctionRiskOutputSchema>;


export async function predictAuctionRisk(input: PredictAuctionRiskInput): Promise<PredictAuctionRiskOutput> {
  return predictAuctionRiskFlow(input);
}


const prompt = ai.definePrompt({
  name: 'predictAuctionRiskPrompt',
  input: { schema: PredictAuctionRiskInputSchema },
  output: { schema: PredictAuctionRiskOutputSchema },
  prompt: `Anda adalah seorang analis risiko kredit ahli untuk sebuah pegadaian. Tugas Anda adalah memprediksi risiko lelang untuk nasabah yang pembayarannya telah jatuh tempo.

Analisis data nasabah berikut:
- Nilai Pinjaman: {{{loan_value}}} IDR
- Hari Terlambat: {{{days_late}}}
- Riwayat Terlambat Bayar: {{{has_been_late_before}}}
- Segmen Nasabah: {{{segment}}}
- Jumlah Transaksi (1 tahun): {{{transaction_count}}}
- Barang Jaminan: "{{{barang_jaminan}}}"

Berdasarkan data ini, lakukan hal berikut:
1.  **Hitung Persentase Risiko (risk_percentage)**: Perkirakan probabilitas (dari 0 hingga 100) bahwa nasabah ini akan gagal bayar dan barang jaminannya akan dilelang.
    - Nilai pinjaman yang tinggi, keterlambatan yang lama, dan riwayat pembayaran yang buruk akan meningkatkan risiko secara signifikan.
    - Segmen 'Platinum' atau 'Reguler' dengan jumlah transaksi tinggi menurunkan risiko.
    - Barang jaminan yang mudah dijual (seperti emas murni, elektronik populer) mungkin sedikit menurunkan risiko kerugian bagi perusahaan, tetapi untuk tugas ini, fokuslah pada kemungkinan nasabah untuk gagal bayar. Barang berharga tinggi yang mudah dijual bahkan bisa meningkatkan kecenderungan nasabah untuk melepaskannya jika pinjaman terlalu tinggi.
    - Nasabah dengan segmen 'Berisiko' atau 'Potensi Churn' memiliki risiko dasar yang jauh lebih tinggi.

2.  **Tentukan Tingkat Risiko (risk_level)**: Kategorikan persentase ke dalam tingkatan berikut:
    - 0-25%: Rendah
    - 26-50%: Sedang
    - 51-75%: Tinggi
    - 76-100%: Sangat Tinggi

3.  **Identifikasi Faktor Kunci (positive_factors, negative_factors)**: Sebutkan 2-3 faktor paling berpengaruh, baik positif (menurunkan risiko) maupun negatif (meningkatkan risiko). Jawaban harus spesifik dan ringkas.

4.  **Berikan Ringkasan (summary)**: Tulis satu kalimat kesimpulan yang merangkum temuan Anda.

**PENTING**: Semua output teks (positive_factors, negative_factors, summary) HARUS dalam Bahasa Indonesia.

Kembalikan hasilnya dalam format JSON yang ditentukan.`,
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

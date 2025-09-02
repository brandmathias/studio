
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
  riwayat_pelunasan: z.string().describe("Deskripsi singkat tentang riwayat kecepatan pelunasan nasabah (misal: 'Cepat', 'Tepat Waktu', 'Lambat')."),
  segment: z.enum(['Platinum', 'Reguler', 'Berisiko', 'Potensi Churn', 'none']).describe('The assigned customer segment.'),
  barang_jaminan: z.string().describe('A description of the collateral item(s) from the last transaction.'),
  transaction_type: z.enum(['gadai', 'angsuran']).describe('The type of the last transaction.'),
});
export type ProductRecommendationInput = z.infer<typeof ProductRecommendationInputSchema>;

const RecommendationSchema = z.object({
    product_name: z.string().describe("Nama spesifik dari produk Pegadaian yang direkomendasikan (contoh: 'Tabungan Emas', 'Cicil Emas', 'Gadai Efek')."),
    product_category: z.enum(['Simpanan', 'Cicilan', 'Pinjaman', 'Lainnya']).describe("Kategori umum dari produk."),
    reasoning: z.string().describe("Penjelasan singkat, personal, dan dalam satu kalimat mengapa produk ini direkomendasikan untuk nasabah ini.")
});

const ProductRecommendationOutputSchema = z.object({
  recommendations: z.array(RecommendationSchema).min(1).max(3).describe('Daftar 1 hingga 3 rekomendasi produk yang dipersonalisasi.'),
  summary: z.string().describe('Ringkasan singkat satu kalimat mengenai profil dan kebutuhan finansial nasabah berdasarkan data yang diberikan.')
});
export type ProductRecommendationOutput = z.infer<typeof ProductRecommendationOutputSchema>;


export async function recommendProduct(input: ProductRecommendationInput): Promise<ProductRecommendationOutput> {
  return recommendProductFlow(input);
}


const prompt = ai.definePrompt({
  name: 'recommendProductPrompt',
  input: { schema: ProductRecommendationInputSchema },
  output: { schema: ProductRecommendationOutputSchema },
  prompt: `Anda adalah seorang penasihat keuangan ahli untuk PT Pegadaian. Tugas Anda adalah menganalisis profil nasabah dan merekomendasikan produk yang paling sesuai untuk mereka.

Analisis data nasabah berikut:
- Nilai Pinjaman Terakhir: {{{loan_value}}} IDR
- Jumlah Transaksi (1 tahun): {{{transaction_count}}}
- Riwayat Terlambat Bayar: {{{has_been_late_before}}}
- Riwayat Kecepatan Pelunasan: "{{{riwayat_pelunasan}}}"
- Hari Sejak Transaksi Terakhir: {{{days_since_last_transaction}}}
- Segmen Nasabah: {{{segment}}}
- Jaminan Terakhir: "{{{barang_jaminan}}}"
- Jenis Transaksi Terakhir: "{{{transaction_type}}}"

Berdasarkan data ini, lakukan hal berikut:
1.  **Analisis Profil Nasabah**: Buat ringkasan singkat dalam satu kalimat mengenai kemungkinan situasi dan kebutuhan finansial nasabah. Ini akan menjadi 'summary' Anda.

2.  **Hasilkan Rekomendasi**: Berikan 1 hingga 3 rekomendasi produk yang sangat dipersonalisasi. Untuk setiap rekomendasi, berikan:
    - **product_name**: Nama produk Pegadaian yang spesifik.
    - **product_category**: Kategori produk.
    - **reasoning**: Alasan yang meyakinkan, singkat, dan personal. Hubungkan rekomendasi secara langsung dengan data mereka.

**Logika Rekomendasi Produk:**
- **Untuk Nasabah Bernilai Tinggi/Platinum** (jumlah transaksi tinggi, tidak pernah terlambat, riwayat pelunasan 'Cepat'): Rekomendasikan produk investasi seperti 'Tabungan Emas' untuk pertumbuhan aset atau 'Gadai Efek' jika jaminan mereka menunjukkan bahwa mereka adalah seorang investor. Nasabah yang melunasi dengan cepat adalah kandidat utama untuk pinjaman produktif bernilai lebih tinggi.
- **Untuk Pemilik Usaha** (jaminan 'Laptop', 'Kamera', 'Motor' dan transaksi 'gadai' reguler): Rekomendasikan 'Pinjaman Modal Produktif' atau 'Cicil Kendaraan'. Jika riwayat pelunasan mereka 'Cepat', tawarkan limit yang lebih tinggi.
- **Untuk Nasabah 'Potensi Churn'** (sedikit transaksi, lama tidak aktif): Rekomendasikan produk ringan seperti 'Cicil Emas' gramasi kecil untuk menarik mereka kembali.
- **Untuk Nasabah 'Berisiko'** (pernah terlambat, riwayat pelunasan 'Lambat'): Hindari merekomendasikan pinjaman baru. Rekomendasikan 'Tabungan Emas' sebagai cara membangun jaring pengaman finansial.
- **Untuk Nasabah dengan Jaminan Emas**: Mereka adalah kandidat utama untuk 'Tabungan Emas' atau 'Cicil Emas'.
- **Untuk Karyawan** (pembayaran rutin, tepat waktu, nilai pinjaman sedang): Rekomendasikan 'Cicil Emas' untuk investasi atau 'Gadai Tabungan Emas' untuk dana darurat.

**PENTING**: Semua output teks (reasoning, summary) HARUS dalam Bahasa Indonesia.

Kembalikan hasilnya dalam format JSON yang ditentukan.`,
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

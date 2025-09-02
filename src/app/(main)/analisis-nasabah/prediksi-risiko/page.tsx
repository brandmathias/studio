
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { subDays, format, differenceInDays, isPast } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Customer } from '@/types';
import AuctionRiskDialog from '@/components/AuctionRiskDialog';
import {
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { predictAuctionRisk, type PredictAuctionRiskOutput } from '@/ai/flows/auction-risk-predictor';

const getUpcFromId = (id: string): Customer['upc'] => {
  const prefix = id.substring(0, 5);
  if (prefix === '11787') {
    return 'Pegadaian Wanea';
  }
  if (prefix === '11793') {
    return 'Pegadaian Ranotana';
  }
  return 'N/A';
};

export const MOCK_CUSTOMERS_RAW: Omit<Customer, 'upc' | 'segment' | 'priority' | 'follow_up_status'>[] = [
  {
    id: '1178724010014909',
    name: 'Vycency Tacya Runtu',
    phone_number: '082188769679',
    email: 'vycency.tacya@example.com',
    due_date: format(subDays(new Date(), 2), 'yyyy-MM-dd'), 
    transaction_type: 'gadai',
    loan_value: 20000000,
    has_been_late_before: false,
    transaction_count: 6,
    days_since_last_transaction: 30,
    barang_jaminan: 'LIMA CINCIN + 1GLG DITAKSIR PERHIASAN EMAS 21 KARAT BERAT 39.6/38.6 GRAM',
  },
  {
    id: '1179300812345678',
    name: 'Brenda Febrina Zusriadi',
    phone_number: '085242041829',
    email: 'brenda.febrina@example.com',
    due_date: format(subDays(new Date(), 5), 'yyyy-MM-dd'), // 5 days past due
    transaction_type: 'angsuran',
    loan_value: 3000000,
    has_been_late_before: true,
    transaction_count: 1,
    days_since_last_transaction: 200,
    barang_jaminan: 'Cincin Emas 5gr',
  },
  {
    id: '1178711122233344',
    name: 'Savio Hendriko Palendeng',
    phone_number: '0857-5716-0254',
    email: 'savio.hendriko@example.com',
    due_date: format(subDays(new Date(), 20), 'yyyy-MM-dd'), // 20 days past due (auction warning)
    transaction_type: 'gadai',
    loan_value: 12000000,
    has_been_late_before: true,
    transaction_count: 8,
    days_since_last_transaction: 45,
    barang_jaminan: 'Motor Honda Beat',
  },
   {
    id: '1179398765432100',
    name: 'Jhon Doe',
    phone_number: '081234567890',
    email: 'jhon.doe@example.com',
    due_date: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
    transaction_type: 'gadai',
    loan_value: 50000000,
    has_been_late_before: true,
    transaction_count: 2,
    days_since_last_transaction: 120,
    barang_jaminan: 'Mobil Toyota Avanza',
  },
];

const MOCK_CUSTOMERS: Omit<Customer, 'priority' | 'follow_up_status'>[] = MOCK_CUSTOMERS_RAW.map(c => ({
  ...c,
  upc: getUpcFromId(c.id),
  segment: 'none', 
}));


export default function PrediksiRisikoPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [customers] = React.useState<Omit<Customer, 'priority' | 'follow_up_status'>[]>(MOCK_CUSTOMERS);
  const [isPredictingRisk, setIsPredictingRisk] = React.useState<string | null>(null);
  const [auctionRiskData, setAuctionRiskData] = React.useState<PredictAuctionRiskOutput | null>(null);

  React.useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      router.push('/login');
    }
  }, [router]);
  
  const handlePredictRisk = async (customer: Omit<Customer, 'priority' | 'follow_up_status'>) => {
    setIsPredictingRisk(customer.id);
    toast({
      title: 'Menganalisis Risiko Lelang...',
      description: `AI sedang memprediksi risiko untuk ${customer.name}.`,
    });
    try {
      const daysLate = Math.max(0, differenceInDays(new Date(), new Date(customer.due_date)));
      const result = await predictAuctionRisk({
        loan_value: customer.loan_value,
        days_late: daysLate,
        has_been_late_before: customer.has_been_late_before,
        segment: customer.segment,
        barang_jaminan: customer.barang_jaminan,
        transaction_count: customer.transaction_count,
      });
      setAuctionRiskData(result);
    } catch (error) {
      console.error('Auction risk prediction failed:', error);
      toast({
        title: 'Gagal Memprediksi',
        description: 'Terjadi kesalahan saat menganalisis risiko. Silakan coba lagi.',
        variant: 'destructive',
      });
    } finally {
        setIsPredictingRisk(null);
    }
  };
  
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      {auctionRiskData && (
        <AuctionRiskDialog
          isOpen={!!auctionRiskData}
          onClose={() => setAuctionRiskData(null)}
          data={auctionRiskData}
        />
      )}
      <div className="flex items-center">
        <h1 className="text-2xl font-bold tracking-tight font-headline">Prediksi Risiko Lelang</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tabel Prediksi Risiko Lelang</CardTitle>
          <CardDescription>
            Gunakan AI untuk menganalisis dan memprediksi kemungkinan barang jaminan nasabah dilelang berdasarkan data transaksional per No. SBG. Fitur ini hanya aktif untuk nasabah yang telah melewati tanggal jatuh tempo.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nasabah</TableHead>
                  <TableHead>No. SBG</TableHead>
                  <TableHead>Tgl Jatuh Tempo</TableHead>
                  <TableHead>Hari Telat</TableHead>
                  <TableHead>Nilai Pinjaman</TableHead>
                  <TableHead>Barang Jaminan</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length === 0 ? (
                     <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                            Tidak ada data nasabah.
                        </TableCell>
                    </TableRow>
                ) : (
                    customers.map((customer) => (
                    <TableRow key={customer.id}>
                        <TableCell>
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-muted-foreground">{customer.phone_number}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono">{customer.id}</div>
                        </TableCell>
                        <TableCell>{format(new Date(customer.due_date), 'dd MMMM yyyy')}</TableCell>
                        <TableCell className="font-bold">{Math.max(0, differenceInDays(new Date(), new Date(customer.due_date)))} hari</TableCell>
                        <TableCell>
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(customer.loan_value)}
                        </TableCell>
                        <TableCell>{customer.barang_jaminan}</TableCell>
                        <TableCell>
                           <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handlePredictRisk(customer)}
                                disabled={isPredictingRisk === customer.id || !isPast(new Date(customer.due_date))}
                                title={!isPast(new Date(customer.due_date)) ? "Hanya untuk nasabah yang sudah lewat jatuh tempo" : "Prediksi Risiko Lelang"}
                              >
                                {isPredictingRisk === customer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                                <span className="ml-2 hidden sm:inline">Analisis Risiko</span>
                            </Button>
                        </TableCell>
                    </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

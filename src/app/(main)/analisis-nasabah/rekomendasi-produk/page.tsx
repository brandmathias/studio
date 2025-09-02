
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
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
import {
  Loader2,
  Lightbulb,
} from 'lucide-react';
import { recommendProduct, type ProductRecommendationOutput } from '@/ai/flows/product-recommendation';
import { MOCK_CUSTOMERS_RAW } from '@/app/(main)/analisis-nasabah/prediksi-risiko/page';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';


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

const MOCK_CUSTOMERS_RECOMENDATION: Omit<Customer, 'priority' | 'follow_up_status'>[] = MOCK_CUSTOMERS_RAW.map(c => ({
  ...c,
  upc: getUpcFromId(c.id),
  segment: 'none', 
}));


const RecommendationDialog = ({ isOpen, onClose, data }: { isOpen: boolean, onClose: () => void, data: ProductRecommendationOutput | null }) => {
    if (!data) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lightbulb className="h-6 w-6 text-primary" />
                        Rekomendasi Produk Personal
                    </DialogTitle>
                     <DialogDescription>
                        Berikut adalah rekomendasi produk yang paling sesuai berdasarkan profil dan histori nasabah.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    {data.recommendations.map((rec, index) => (
                         <div key={index} className="p-4 border rounded-lg bg-background">
                            <h4 className="font-bold text-lg text-primary">{rec.product_name}</h4>
                            <Badge variant="secondary" className="my-2">{rec.product_category}</Badge>
                            <p className="text-sm text-muted-foreground">{rec.reasoning}</p>
                         </div>
                    ))}

                    <div className="p-4 border-l-4 border-accent bg-accent/10 rounded-r-lg">
                        <h4 className="font-semibold text-accent-foreground">Ringkasan Analisis</h4>
                        <p className="text-sm text-muted-foreground mt-1">{data.summary}</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}


export default function ProductRecommendationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [customers] = React.useState<Omit<Customer, 'priority' | 'follow_up_status'>[]>(MOCK_CUSTOMERS_RECOMENDATION);
  const [isRecommending, setIsRecommending] = React.useState<string | null>(null);
  const [recommendationData, setRecommendationData] = React.useState<ProductRecommendationOutput | null>(null);

  React.useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      router.push('/login');
    }
  }, [router]);
  
  const handleRecommend = async (customer: Omit<Customer, 'priority' | 'follow_up_status'>) => {
    setIsRecommending(customer.id);
    toast({
      title: 'Menganalisis Nasabah...',
      description: `AI sedang mencari rekomendasi produk untuk ${customer.name}.`,
    });
    try {
      const result = await recommendProduct({
        loan_value: customer.loan_value,
        transaction_count: customer.transaction_count,
        has_been_late_before: customer.has_been_late_before,
        days_since_last_transaction: customer.days_since_last_transaction,
        // NOTE: This is a placeholder value. In a real application, you'd calculate this.
        riwayat_pelunasan: customer.has_been_late_before ? 'Lambat' : 'Tepat Waktu',
        segment: customer.segment,
        barang_jaminan: customer.barang_jaminan,
        transaction_type: customer.transaction_type,
      });
      setRecommendationData(result);
    } catch (error) {
      console.error('Product recommendation failed:', error);
      toast({
        title: 'Gagal Memberikan Rekomendasi',
        description: 'Terjadi kesalahan saat menganalisis. Silakan coba lagi.',
        variant: 'destructive',
      });
    } finally {
        setIsRecommending(null);
    }
  };
  
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <RecommendationDialog 
            isOpen={!!recommendationData}
            onClose={() => setRecommendationData(null)}
            data={recommendationData}
        />
      <div className="flex items-center">
        <h1 className="text-2xl font-bold tracking-tight font-headline">Rekomendasi Produk</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rekomendasi Produk Berbasis AI</CardTitle>
          <CardDescription>
            Pilih nasabah untuk mendapatkan rekomendasi produk Pegadaian yang paling sesuai berdasarkan riwayat transaksi dan profil mereka.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nasabah</TableHead>
                  <TableHead>Segmen</TableHead>
                  <TableHead>Total Transaksi (1th)</TableHead>
                  <TableHead>Terakhir Transaksi</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length === 0 ? (
                     <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
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
                          <Badge variant={customer.segment === 'none' ? 'outline' : 'default'}>{customer.segment === 'none' ? 'Belum Disegmentasi' : customer.segment}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{customer.transaction_count}</TableCell>
                        <TableCell className="text-center">{customer.days_since_last_transaction} hari lalu</TableCell>
                        <TableCell>
                           <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleRecommend(customer)}
                                disabled={isRecommending === customer.id}
                              >
                                {isRecommending === customer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
                                <span className="ml-2 hidden sm:inline">Dapatkan Rekomendasi</span>
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

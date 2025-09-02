
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Lightbulb, ArrowRight } from 'lucide-react';

export default function AnalisisNasabahPage() {
    const router = useRouter();

  React.useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      router.push('/login');
    }
  }, [router]);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center">
            <h1 className="text-2xl font-bold tracking-tight font-headline">Pusat Analisis Nasabah</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            <Card className="flex flex-col transition-transform duration-200 hover:scale-105 hover:shadow-xl">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Users className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-xl">Prediksi Risiko Lelang</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                    <p className="text-muted-foreground">
                        Gunakan AI untuk menganalisis dan memprediksi kemungkinan barang jaminan nasabah dilelang berdasarkan data transaksional per No. SBG.
                    </p>
                    <Button onClick={() => router.push('/analisis-nasabah/prediksi-risiko')}>
                        Mulai Analisis Risiko <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardContent>
            </Card>

            <Card className="flex flex-col transition-transform duration-200 hover:scale-105 hover:shadow-xl">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-accent/20 rounded-full">
                            <Lightbulb className="h-6 w-6 text-accent-foreground" />
                        </div>
                        <CardTitle className="text-xl">Rekomendasi Produk</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                    <p className="text-muted-foreground">
                        Dapatkan rekomendasi produk Pegadaian yang dipersonalisasi untuk setiap nasabah berdasarkan riwayat dan profil mereka.
                    </p>
                     <Button onClick={() => router.push('/analisis-nasabah/rekomendasi-produk')}>
                        Dapatkan Rekomendasi <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardContent>
            </Card>
        </div>
    </main>
  );
}

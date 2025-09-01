'use client';

import * as React from 'react';
import * as XLSX from 'xlsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, Send, Loader2 } from 'lucide-react';
import type { InstallmentCustomer } from '@/types';
import { Input } from '@/components/ui/input';

const formatCurrency = (value: number | string | undefined) => {
    const num = Number(value);
    if (isNaN(num)) return 'N/A';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

const formatDate = (excelDate: number): string => {
    if (!excelDate || isNaN(excelDate)) return 'N/A';
    // Excel stores dates as number of days since 1900-01-01.
    // The conversion needs to account for Excel's leap year bug (1900).
    const date = new Date((excelDate - (25567 + 1)) * 86400 * 1000);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
};


export default function XlsxBroadcastPage() {
  const { toast } = useToast();
  const [importedData, setImportedData] = React.useState<InstallmentCustomer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = React.useState<Set<string>>(new Set());
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx')) {
        toast({
            title: 'Jenis File Tidak Valid',
            description: 'Silakan unggah file .xlsx.',
            variant: 'destructive',
        });
        return;
    }

    setIsLoading(true);
    setImportedData([]);
    setSelectedCustomers(new Set());
    toast({
        title: 'Memproses XLSX...',
        description: 'Membaca data dari file. Ini mungkin memakan waktu sejenak.',
    });

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            // The `raw: false` option is crucial for dates to be parsed correctly
            const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

            // Skip header row (index 0)
            const customers: InstallmentCustomer[] = json.slice(1).map((row: any, index) => ({
                id: row[0] ? String(row[0]).split('\n')[1] || `row-${index}` : `row-${index}`, // Use second line of "Nasabah" as ID
                nasabah: row[0] || 'N/A', // Kolom A
                produk: row[1] || 'N/A', // Kolom B
                pinjaman: Number(row[2]) || 0, // Kolom C
                osl: Number(row[3]) || 0, // Kolom D
                kol: Number(row[4]) || 0, // Kolom E
                hr_tung: Number(row[5]) || 0, // Kolom F
                tenor: String(row[6]) || 'N/A', // Kolom G
                angsuran: Number(row[7]) || 0, // Kolom H
                kewajiban: Number(row[8]) || 0, // Kolom I
                pencairan: row[9] || 'N/A', // Kolom J
                kunjungan_terakhir: row[10] || 'N/A' // Kolom K
            })).filter(c => c.nasabah !== 'N/A' && c.nasabah.trim() !== ''); // Basic validation

            setImportedData(customers);
             toast({
                title: 'Impor Selesai',
                description: `${customers.length} data telah berhasil dimuat.`,
            });
        } catch (error) {
            console.error("XLSX parsing error:", error);
            toast({
                title: 'Gagal Memproses File',
                description: 'Terjadi kesalahan saat membaca file XLSX. Pastikan formatnya benar.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };
    reader.onerror = (error) => {
         console.error("File reader error:", error);
         toast({
            title: 'Gagal Membaca File',
            description: 'Tidak dapat membaca file yang dipilih.',
            variant: 'destructive',
        });
        setIsLoading(false);
    }
    reader.readAsBinaryString(file);

    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleSelectCustomer = (customerId: string, checked: boolean) => {
    const newSelection = new Set(selectedCustomers);
    if (checked) {
      newSelection.add(customerId);
    } else {
      newSelection.delete(customerId);
    }
    setSelectedCustomers(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allCustomerIds = new Set(importedData.map((c) => c.id));
      setSelectedCustomers(allCustomerIds);
    } else {
      setSelectedCustomers(new Set());
    }
  };

  const handleSendNotification = (customer: InstallmentCustomer) => {
    const message = `Yth. Nasabah ${customer.nasabah.split('\n')[0]}, tagihan produk ${customer.produk.split('\n')[0]} Anda sebesar ${formatCurrency(customer.angsuran)} akan jatuh tempo. Mohon segera lakukan pembayaran. Terima kasih.`;
    const encodedMessage = encodeURIComponent(message);
    
    // As there is no phone number, we use a placeholder for the demo.
    // In a real scenario, this would come from customer data.
    const placeholderPhoneNumber = '620000000000'; 
    const whatsappUrl = `https://wa.me/${placeholderPhoneNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const handleNotifySelected = () => {
    if (selectedCustomers.size === 0) {
      toast({
        title: 'Tidak Ada Nasabah Terpilih',
        description: 'Silakan pilih setidaknya satu nasabah untuk dikirimi notifikasi.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Membuka Tab WhatsApp',
      description: `Menyiapkan notifikasi untuk ${selectedCustomers.size} nasabah. Mohon izinkan pop-up jika diminta.`,
    });

    const customersToNotify = importedData.filter((c) => selectedCustomers.has(c.id));
    
    customersToNotify.forEach((customer, index) => {
      setTimeout(() => {
        handleSendNotification(customer);
      }, index * 200);
    });
    
    // Deselect all after sending
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => (cb as HTMLInputElement).checked = false);
    setSelectedCustomers(new Set());
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center">
          <h1 className="text-2xl font-bold tracking-tight font-headline">XLSX Angsuran Broadcast</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Panel Broadcast XLSX</CardTitle>
          <CardDescription>
            Impor data nasabah dari file .xlsx untuk mengirim notifikasi jatuh tempo angsuran. Pastikan urutan kolom di file Anda sesuai dengan tabel di bawah.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
            <Button onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {isLoading ? 'Memproses...' : 'Impor XLSX'}
            </Button>
            <Input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".xlsx"
            />
            <div className="flex-grow"></div>
            <Button onClick={handleNotifySelected} disabled={selectedCustomers.size === 0 || isLoading}>
              <Send className="mr-2 h-4 w-4" />
              Kirim Notifikasi ({selectedCustomers.size})
            </Button>
          </div>
           {importedData.length > 0 && (
             <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md border border-yellow-200 mb-4">
               <strong>Perhatian:</strong> Data nomor telepon tidak tersedia dalam file impor. Notifikasi WhatsApp akan menggunakan nomor placeholder untuk tujuan demonstrasi.
             </div>
            )}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox 
                      checked={selectedCustomers.size > 0 && selectedCustomers.size === importedData.length && importedData.length > 0}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      aria-label="Pilih semua"
                      disabled={importedData.length === 0}
                    />
                  </TableHead>
                  <TableHead>Nasabah</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead>Pinjaman</TableHead>
                  <TableHead>Osl</TableHead>
                  <TableHead>Kol</TableHead>
                  <TableHead>Hr tung</TableHead>
                  <TableHead>Tenor</TableHead>
                  <TableHead>Angsuran</TableHead>
                  <TableHead>Kewajiban</TableHead>
                  <TableHead>Pencairan</TableHead>
                  <TableHead>Kunjungan Terakhir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={12} className="h-24 text-center">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                            <p className="mt-2 text-muted-foreground">Memproses file XLSX...</p>
                        </TableCell>
                    </TableRow>
                ) : importedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="h-24 text-center">
                          Tidak ada data. Klik "Impor XLSX" untuk memulai.
                      </TableCell>
                    </TableRow>
                ) : (
                  importedData.map((customer) => (
                    <TableRow key={customer.id} data-state={selectedCustomers.has(customer.id) ? 'selected' : ''}>
                      <TableCell>
                        <Checkbox
                            checked={selectedCustomers.has(customer.id)}
                            onCheckedChange={(checked) => handleSelectCustomer(customer.id, !!checked)}
                            aria-label={`Pilih ${customer.nasabah.split('\n')[0]}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium whitespace-pre-line">{customer.nasabah}</TableCell>
                      <TableCell className="whitespace-pre-line">{customer.produk}</TableCell>
                      <TableCell className="text-right">{formatCurrency(customer.pinjaman)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(customer.osl)}</TableCell>
                      <TableCell className="text-center">{customer.kol}</TableCell>
                      <TableCell className="text-center">{customer.hr_tung}</TableCell>
                      <TableCell className="text-center">{customer.tenor}</TableCell>
                      <TableCell className="text-right">{formatCurrency(customer.angsuran)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(customer.kewajiban)}</TableCell>
                      <TableCell className="whitespace-pre-line">{customer.pencairan}</TableCell>
                      <TableCell>{customer.kunjungan_terakhir}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
            {selectedCustomers.size > 0 && (
                <div className="text-xs text-muted-foreground mt-2">
                Browser mungkin akan meminta izin untuk membuka beberapa tab WhatsApp. Mohon izinkan.
                </div>
            )}
        </CardContent>
      </Card>
    </main>
  );
}

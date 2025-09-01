

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
import { Upload, Send, Loader2, Mic, Bell, ClipboardCopy } from 'lucide-react';
import type { InstallmentCustomer } from '@/types';
import { Input } from '@/components/ui/input';
import VoicenotePreviewDialog from '@/components/VoicenotePreviewDialog';
import { generateCustomerVoicenote } from '@/ai/flows/tts-flow';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';


const formatCurrency = (value: number | string | undefined) => {
    const num = Number(value);
    if (isNaN(num)) return 'N/A';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

const formatDate = (value: string | number): string => {
    if (typeof value === 'number') {
        if (value > 0) {
            const date = new Date((value - (25567 + 1)) * 86400 * 1000);
            return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
        }
        return 'N/A';
    }
    return String(value);
};


type NotificationTemplate = 'jatuh-tempo' | 'keterlambatan' | 'peringatan-lelang';


export default function XlsxBroadcastPage() {
  const { toast } = useToast();
  const [importedData, setImportedData] = React.useState<InstallmentCustomer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = React.useState<Set<string>>(new Set());
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const [isGeneratingVoicenote, setIsGeneratingVoicenote] = React.useState(false);
  const [activeVoicenote, setActiveVoicenote] = React.useState<{
    audioDataUri: string;
    whatsappUrl: string;
    customerName: string;
  } | null>(null);


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
            const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });

            const customers: InstallmentCustomer[] = json.map((row: any, index) => ({
                id: `row-${index}`, // Use row index as a stable key
                nasabah: String(row[0] || ''),
                produk: String(row[1] || ''),
                pinjaman: Number(row[2]) || 0,
                osl: Number(row[3]) || 0,
                kol: Number(row[4]) || 0,
                hr_tung: Number(row[5]) || 0,
                tenor: String(row[6]) || 'N/A',
                angsuran: Number(row[7]) || 0,
                kewajiban: Number(row[8]) || 0,
                pencairan: String(row[9] || ''),
                kunjungan_terakhir: String(row[10] || 'N/A')
            })).filter(c => {
                const nasabahText = c.nasabah.trim();
                const produkText = c.produk.trim();
                // Filter out header rows and completely empty rows
                const isHeaderRow = nasabahText === 'Nasabah' || produkText === 'Produk';
                const isEmptyRow = !nasabahText && !produkText;
                return !isHeaderRow && !isEmptyRow;
            });

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
  
    const getNotificationMessage = (customer: InstallmentCustomer, template: NotificationTemplate): string => {
        // Clean up the nasabah string to extract name and ID.
        const nasabahParts = customer.nasabah.split('\n');
        const customerNameAndId = (nasabahParts[0] || '').replace(/\s+/g, ' ');
        
        // Clean up produk string
        const productName = (customer.produk.split('\n')[0] || '').replace(/\s+-\s+-/, '').trim();

        // Use 'pencairan' column for the branch name
        const headerLine = `Nasabah ${customer.pencairan.toUpperCase()}`;
        
        let messageBody = '';

        switch (template) {
            case 'peringatan-lelang':
                messageBody = `*PERINGATAN PEMUTUSAN KONTRAK (TERAKHIR)*

Angsuran produk ${productName} Anda telah melewati jatuh tempo secara signifikan (${customer.hr_tung} hari).

Untuk menghindari pemutusan kontrak dan tindakan lebih lanjut, segera lakukan pembayaran seluruh kewajiban Anda (${formatCurrency(customer.kewajiban)}) dalam waktu 2x24 jam. Abaikan pesan ini jika sudah melakukan pembayaran.`;
                break;
            case 'keterlambatan':
                messageBody = `*Angsuran Anda Sudah Jatuh Tempo*

Angsuran produk ${productName} Anda telah melewati tanggal jatuh tempo (${customer.hr_tung} hari).

Akan dikenakan denda keterlambatan. Mohon segera lakukan pembayaran untuk menghindari denda yang lebih besar.`;
                break;
            case 'jatuh-tempo':
            default:
                messageBody = `*Angsuran Anda akan segera Jatuh Tempo*

Angsuran produk ${productName} Anda sebesar *${formatCurrency(customer.angsuran)}* akan segera jatuh tempo.

Segera lakukan pembayaran. Pembayaran bisa dilakukan secara online melalui aplikasi PEGADAIAN DIGITAL atau e-channel lainnya.`;
                break;
        }

        return `${headerLine}
*Yth. Bpk/Ibu ${customerNameAndId.toLocaleUpperCase()}*

${messageBody}

Terima Kasih`;
    };

  const handleCopyMessage = (customer: InstallmentCustomer, template: NotificationTemplate) => {
    const message = getNotificationMessage(customer, template);
    navigator.clipboard.writeText(message).then(() => {
      toast({
        title: 'Pesan Disalin',
        description: `Pesan untuk ${customer.nasabah.split('\n')[0]} telah disalin ke clipboard.`,
      });
    }).catch(err => {
      console.error('Failed to copy message: ', err);
      toast({
        title: 'Gagal Menyalin',
        description: 'Tidak dapat menyalin pesan. Silakan coba lagi.',
        variant: 'destructive',
      });
    });
  };

  const handleSendNotification = (customer: InstallmentCustomer, template: NotificationTemplate) => {
    const message = getNotificationMessage(customer, template);
    const encodedMessage = encodeURIComponent(message);
    
    // Using a placeholder phone number as it's not available in the source file
    const placeholderPhoneNumber = '620000000000'; 
    const whatsappUrl = `https://wa.me/${placeholderPhoneNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const handleGenerateVoicenote = async (customer: InstallmentCustomer, template: NotificationTemplate) => {
    setIsGeneratingVoicenote(true);
    toast({
        title: 'Membuat Pesan Suara...',
        description: `AI sedang membuat pesan suara untuk ${customer.nasabah.split('\n')[0]}.`,
    });
    try {
        const placeholderPhoneNumber = '620000000000'; 
        const whatsappUrl = `https://wa.me/${placeholderPhoneNumber}`;

        const message = getNotificationMessage(customer, template);
        const { audioDataUri } = await generateCustomerVoicenote({ text: message });

        setActiveVoicenote({
            audioDataUri,
            whatsappUrl,
            customerName: customer.nasabah.split('\n')[0],
        });

    } catch (error) {
        console.error('Voicenote generation failed:', error);
        toast({
            title: 'Gagal Membuat Pesan Suara',
            description: 'Terjadi kesalahan saat membuat pesan suara. Silakan coba lagi.',
            variant: 'destructive',
        });
    } finally {
        setIsGeneratingVoicenote(false);
    }
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
        handleSendNotification(customer, 'jatuh-tempo');
      }, index * 200);
    });
    
    setSelectedCustomers(new Set());
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {activeVoicenote && (
          <VoicenotePreviewDialog
            isOpen={!!activeVoicenote}
            onClose={() => setActiveVoicenote(null)}
            audioDataUri={activeVoicenote.audioDataUri}
            whatsappUrl={activeVoicenote.whatsappUrl}
            customerName={activeVoicenote.customerName}
            onConfirm={() => {
                window.open(activeVoicenote.whatsappUrl, '_blank');
            }}
          />
        )}
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
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={13} className="h-24 text-center">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                            <p className="mt-2 text-muted-foreground">Memproses file XLSX...</p>
                        </TableCell>
                    </TableRow>
                ) : importedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="h-24 text-center">
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
                      <TableCell>{formatDate(customer.pencairan)}</TableCell>
                      <TableCell>{formatDate(customer.kunjungan_terakhir)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                           <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline"><ClipboardCopy className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => handleCopyMessage(customer, 'jatuh-tempo')}>Copy Pengingat</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleCopyMessage(customer, 'keterlambatan')}>Copy Keterlambatan</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleCopyMessage(customer, 'peringatan-lelang')}>Copy Peringatan Lelang</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                           <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline"><Bell className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => handleSendNotification(customer, 'jatuh-tempo')}>Kirim Pengingat</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSendNotification(customer, 'keterlambatan')}>Kirim Keterlambatan</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSendNotification(customer, 'peringatan-lelang')}>Kirim Peringatan Lelang</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="sm" disabled={isGeneratingVoicenote}>
                                        {isGeneratingVoicenote ? <Loader2 className="h-4 w-4 animate-spin"/> : <Mic className="h-4 w-4" />}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => handleGenerateVoicenote(customer, 'jatuh-tempo')}>Buat VN Pengingat</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleGenerateVoicenote(customer, 'keterlambatan')}>Buat VN Keterlambatan</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleGenerateVoicenote(customer, 'peringatan-lelang')}>Buat VN Peringatan Lelang</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                      </TableCell>
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

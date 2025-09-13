
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
import type { MTCustomer, HistoryEntry } from '@/types';
import { Input } from '@/components/ui/input';
import VoicenotePreviewDialog from '@/components/VoicenotePreviewDialog';
import { generateCustomerVoicenote } from '@/ai/flows/tts-flow';

const formatCurrency = (value: number | string | undefined) => {
    const num = Number(value);
    if (isNaN(num)) return 'N/A';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

const formatDateFromExcel = (excelDate: number | string): string => {
    if (typeof excelDate === 'number' && excelDate > 0) {
        // Excel dates are stored as the number of days since 1900-01-01.
        // JS Date is based on milliseconds since 1970-01-01.
        // The formula accounts for Excel's leap year bug.
        const date = new Date((excelDate - (25567 + 1)) * 86400 * 1000);
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    if (typeof excelDate === 'string') {
        const date = new Date(excelDate);
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        }
    }
    return String(excelDate || 'N/A');
};

type ActionStatus = 'Notifikasi Terkirim' | 'Pesan Disalin';

export default function XlsxBroadcastPage() {
  const { toast } = useToast();
  const [importedData, setImportedData] = React.useState<MTCustomer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = React.useState<Set<string>>(new Set());
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [adminUser, setAdminUser] = React.useState({name: 'Admin', upc: 'all'});
  const [customerNames, setCustomerNames] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
        setAdminUser(JSON.parse(storedUser));
    }
     // Load customer names from Gadaian broadcast history for enrichment
    try {
      const allHistory = JSON.parse(localStorage.getItem('broadcastHistory_all') || '[]');
      const waneaHistory = JSON.parse(localStorage.getItem('broadcastHistory_Pegadaian Wanea') || '[]');
      const ranotanaHistory = JSON.parse(localStorage.getItem('broadcastHistory_Pegadaian Ranotana') || '[]');
      const combinedHistory = [...allHistory, ...waneaHistory, ...ranotanaHistory];
      
      const names: Record<string, string> = {};
      combinedHistory.forEach((entry: HistoryEntry) => {
        if (entry.customerIdentifier && !names[entry.customerIdentifier]) {
          names[entry.customerIdentifier] = entry.customerName;
        }
      });
      setCustomerNames(names);
    } catch (e) {
      console.error("Could not load names from history", e);
    }

  }, []);

  const [isGeneratingVoicenote, setIsGeneratingVoicenote] = React.useState(false);
  const [activeVoicenote, setActiveVoicenote] = React.useState<{
    audioDataUri: string;
    whatsappUrl: string;
    customerName: string;
  } | null>(null);

  const logHistory = (customer: MTCustomer, status: ActionStatus, template: string) => {
    try {
        const upc = customer.cab_outlet.toLowerCase().includes('wan') ? 'Pegadaian Wanea' : 'Pegadaian Ranotana';
        const storageKey = adminUser.upc === 'all' ? 'broadcastHistory_all' : `broadcastHistory_${upc}`;

      const newEntry: HistoryEntry = {
        id: `hist-${Date.now()}-${customer.no_kredit}`,
        timestamp: new Date().toISOString(),
        type: 'MT Broadcast',
        customerName: customer.nama_nasabah || 'Nama Tidak Ditemukan',
        customerIdentifier: customer.no_kredit,
        status,
        adminUser: adminUser.name,
        template: template,
      };

      const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
      history.unshift(newEntry); // Add to the beginning
      localStorage.setItem(storageKey, JSON.stringify(history));
    } catch (error) {
      console.error("Failed to log history:", error);
    }
  };

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
            const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            // Find the header row index
            let headerIndex = -1;
            for(let i=0; i<json.length; i++) {
                const row = json[i];
                if (row.includes('Cab/Outlet') && row.includes('no_kredit')) {
                    headerIndex = i;
                    break;
                }
            }

            if (headerIndex === -1) throw new Error("Header row not found in XLSX file.");
            
            const header = json[headerIndex];
            const dataRows = json.slice(headerIndex + 1);

            let customers: MTCustomer[] = dataRows.map((row: any[], index) => {
                const customerData: any = {};
                header.forEach((key: string, i: number) => {
                     // Normalize key: lowercase and replace special chars
                    const normalizedKey = key.toString().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_t$/, '_t');
                    customerData[normalizedKey] = row[i];
                });
                
                const noKredit = customerData['no_kredit']?.toString() || '';
                
                return {
                    id: `${noKredit}-${index}`,
                    cab_outlet: customerData['cab_outlet'] || '',
                    product_nm: customerData['product_nm'] || '',
                    no_kredit: noKredit,
                    golongan: customerData['golongan'] || '',
                    tgl_kredit: customerData['tgl_kredit'] || '',
                    tgl_jatuh_t: customerData['tgl_jatuh_t'] || '',
                    up: parseFloat(String(customerData['up']).replace(/[^0-9.-]+/g,"")) || 0,
                    up_max: parseFloat(String(customerData['up_max']).replace(/[^0-9.-]+/g,"")) || 0,
                    sm: parseFloat(String(customerData['sm']).replace(/[^0-9.-]+/g,"")) || 0,
                    admin: parseFloat(String(customerData['admin']).replace(/[^0-9.-]+/g,"")) || 0,
                    max_up_terima: parseFloat(String(customerData['max_up_terima']).replace(/[^0-9.-]+/g,"")) || 0,
                    percent_mt: customerData['__mt'] || '0%',
                    nama_nasabah: customerNames[noKredit] || 'Nama Tidak Ditemukan',
                };
            }).filter(c => c.no_kredit); // Filter out rows without a no_kredit
            
            if (adminUser.upc !== 'all') {
                const upcIdentifier = adminUser.upc === 'Pegadaian Wanea' ? 'wan' : 'ranotana';
                customers = customers.filter(c => c.cab_outlet.toLowerCase().includes(upcIdentifier));
            }

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
  
    const getNotificationMessage = (customer: MTCustomer): string => {
        const headerLine = `Nasabah ${customer.cab_outlet.toUpperCase()}`;
        const customerName = customer.nama_nasabah || 'Nasabah Yth';
        
        const messageBody = `*KESEMPATAN TAMBAH PINJAMAN*

Gadaian Anda No. ${customer.no_kredit} memiliki kesempatan untuk Tambah Pinjaman (MT) hingga *${formatCurrency(customer.up_max)}*.

Potensi dana yang dapat Anda terima adalah sebesar *${formatCurrency(customer.max_up_terima)}*.

Segera kunjungi outlet kami untuk memproses penambahan pinjaman Anda. Abaikan pesan ini jika sudah melakukan transaksi.`;

        return `${headerLine}
*Yth. Bpk/Ibu ${customerName.toLocaleUpperCase()}*

${messageBody}

Terima Kasih`;
    };

  const handleCopyMessage = (customer: MTCustomer) => {
    const message = getNotificationMessage(customer);
    navigator.clipboard.writeText(message).then(() => {
      toast({
        title: 'Pesan Disalin',
        description: `Pesan untuk ${customer.nama_nasabah} telah disalin.`,
      });
      logHistory(customer, 'Pesan Disalin', 'Tawaran MT');
    }).catch(err => {
      toast({
        title: 'Gagal Menyalin',
        description: 'Tidak dapat menyalin pesan.',
        variant: 'destructive',
      });
    });
  };

  const handleSendNotification = (customer: MTCustomer) => {
    const message = getNotificationMessage(customer);
    const encodedMessage = encodeURIComponent(message);
    const placeholderPhoneNumber = '620000000000'; 
    const whatsappUrl = `https://wa.me/${placeholderPhoneNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    logHistory(customer, 'Notifikasi Terkirim', 'Tawaran MT');
  };

  const handleGenerateVoicenote = async (customer: MTCustomer) => {
    setIsGeneratingVoicenote(true);
    toast({
        title: 'Membuat Pesan Suara...',
        description: `AI sedang membuat pesan suara untuk ${customer.nama_nasabah}.`,
    });
    try {
        const placeholderPhoneNumber = '620000000000'; 
        const whatsappUrl = `https://wa.me/${placeholderPhoneNumber}`;
        const message = getNotificationMessage(customer);
        const { audioDataUri } = await generateCustomerVoicenote({ text: message });

        setActiveVoicenote({
            audioDataUri,
            whatsappUrl,
            customerName: customer.nama_nasabah || 'Nasabah',
        });
    } catch (error) {
        console.error('Voicenote generation failed:', error);
        toast({
            title: 'Gagal Membuat Pesan Suara',
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
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Membuka Tab WhatsApp',
      description: `Menyiapkan notifikasi untuk ${selectedCustomers.size} nasabah.`,
    });

    const customersToNotify = importedData.filter((c) => selectedCustomers.has(c.id));
    
    customersToNotify.forEach((customer, index) => {
      setTimeout(() => {
        handleSendNotification(customer);
      }, index * 200);
    });
    
    setSelectedCustomers(new Set());
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-2 md:gap-8 md:p-8">
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
          <h1 className="text-xl md:text-2xl font-bold tracking-tight font-headline">MT (Tambah Pinjaman) Broadcast</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Panel MT Broadcast</CardTitle>
          <CardDescription>
            Impor data nasabah dari file .xlsx untuk mengirim notifikasi penawaran tambah pinjaman (MT).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
            <Button onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="w-full md:w-auto">
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
            <Button onClick={handleNotifySelected} disabled={selectedCustomers.size === 0 || isLoading} className="w-full md:w-auto">
              <Send className="mr-2 h-4 w-4" />
              Kirim Notifikasi ({selectedCustomers.size})
            </Button>
          </div>
           {importedData.length > 0 && (
             <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md border border-yellow-200 mb-4">
               <strong>Perhatian:</strong> Data nomor telepon tidak tersedia dalam file impor dan nama nasabah diambil dari riwayat broadcast. Notifikasi WhatsApp akan menggunakan nomor placeholder.
             </div>
            )}
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px] px-2 md:px-4">
                    <Checkbox 
                      checked={selectedCustomers.size > 0 && selectedCustomers.size === importedData.length && importedData.length > 0}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      aria-label="Pilih semua"
                      disabled={importedData.length === 0}
                    />
                  </TableHead>
                  <TableHead>No. Kredit</TableHead>
                  <TableHead>Nama Nasabah</TableHead>
                  <TableHead>Cab/Outlet</TableHead>
                  <TableHead className="hidden md:table-cell">Product</TableHead>
                  <TableHead className="hidden lg:table-cell">Gol</TableHead>
                  <TableHead>Tgl Kredit</TableHead>
                  <TableHead>Tgl Jth Tempo</TableHead>
                  <TableHead>UP</TableHead>
                  <TableHead>UP Max</TableHead>
                  <TableHead className="hidden md:table-cell">SM</TableHead>
                  <TableHead className="hidden md:table-cell">Admin</TableHead>
                  <TableHead>Max UP Terima</TableHead>
                  <TableHead>%+MT</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={15} className="h-24 text-center">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                            <p className="mt-2 text-muted-foreground">Memproses file XLSX...</p>
                        </TableCell>
                    </TableRow>
                ) : importedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={15} className="h-24 text-center">
                          Tidak ada data. Klik "Impor XLSX" untuk memulai.
                      </TableCell>
                    </TableRow>
                ) : (
                  importedData.map((customer) => (
                    <TableRow key={customer.id} data-state={selectedCustomers.has(customer.id) ? 'selected' : ''}>
                      <TableCell className="px-2 md:px-4">
                        <Checkbox
                            checked={selectedCustomers.has(customer.id)}
                            onCheckedChange={(checked) => handleSelectCustomer(customer.id, !!checked)}
                            aria-label={`Pilih ${customer.nama_nasabah}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{customer.no_kredit}</TableCell>
                      <TableCell className="font-medium text-sm">{customer.nama_nasabah}</TableCell>
                      <TableCell>{customer.cab_outlet}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs">{customer.product_nm}</TableCell>
                      <TableCell className="hidden lg:table-cell text-center">{customer.golongan}</TableCell>
                      <TableCell className="text-xs">{formatDateFromExcel(customer.tgl_kredit)}</TableCell>
                      <TableCell className="text-xs">{formatDateFromExcel(customer.tgl_jatuh_t)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(customer.up)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(customer.up_max)}</TableCell>
                      <TableCell className="text-right hidden md:table-cell">{formatCurrency(customer.sm)}</TableCell>
                      <TableCell className="text-right hidden md:table-cell">{formatCurrency(customer.admin)}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(customer.max_up_terima)}</TableCell>
                      <TableCell className="text-center">{customer.percent_mt}</TableCell>
                      <TableCell>
                        <div className="flex flex-col sm:flex-row items-center gap-1">
                           <Button size="sm" variant="outline" onClick={() => handleCopyMessage(customer)}><ClipboardCopy className="h-4 w-4" /></Button>
                           <Button size="sm" variant="outline" onClick={() => handleSendNotification(customer)}><Bell className="h-4 w-4" /></Button>
                           <Button size="sm" disabled={isGeneratingVoicenote} onClick={() => handleGenerateVoicenote(customer)}>
                                {isGeneratingVoicenote ? <Loader2 className="h-4 w-4 animate-spin"/> : <Mic className="h-4 w-4" />}
                            </Button>
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

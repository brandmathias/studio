'use client';

import * as React from 'react';
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
import { Upload, Send, Loader2, Mic, Bell } from 'lucide-react';
import type { BroadcastCustomer } from '@/types';
import { Input } from '@/components/ui/input';
import { parsePdf } from './actions';
import { generateCustomerVoicenote } from '@/ai/flows/tts-flow';
import VoicenotePreviewDialog from '@/components/VoicenotePreviewDialog';

const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    // Handles DD/MM/YYYY from AI
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        const [day, month, year] = dateString.split('/');
        return new Date(`${year}-${month}-${day}`).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    }
    // Fallback for other formats
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
};

const formatCurrency = (value: number) => {
    if (isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}

const parseDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    const parts = dateString.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!parts) {
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1]));
    return isNaN(d.getTime()) ? null : d;
}


export default function PdfBroadcastPage() {
  const { toast } = useToast();
  const [extractedData, setExtractedData] = React.useState<BroadcastCustomer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = React.useState<Set<string>>(new Set());
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const [isGeneratingVoicenote, setIsGeneratingVoicenote] = React.useState(false);
  const [activeVoicenote, setActiveVoicenote] = React.useState<{
    audioDataUri: string;
    whatsappUrl: string;
    customerName: string;
  } | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
        toast({
            title: 'Invalid File Type',
            description: 'Please upload a PDF file.',
            variant: 'destructive',
        });
        return;
    }

    setIsLoading(true);
    setExtractedData([]);
    setSelectedCustomers(new Set());
    toast({
        title: 'Processing PDF...',
        description: 'AI is extracting data. This may take a moment.',
    });

    const formData = new FormData();
    formData.append('pdf-file', file);

    try {
        const results = await parsePdf(formData);
        if (results.length === 0) {
            toast({
                title: 'No Data Extracted',
                description: 'The AI could not find any customer data in the PDF.',
                variant: 'destructive',
            });
        } else {
            setExtractedData(results);
            toast({
                title: 'Extraction Complete',
                description: `${results.length} records have been loaded from the PDF.`,
            });
        }
    } catch (error: any) {
        toast({
            title: 'Error Processing PDF',
            description: error.message || 'An unknown error occurred.',
            variant: 'destructive',
        });
        console.error("PDF processing error:", error);
    } finally {
        setIsLoading(false);
        // Reset file input
        if(fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSelectCustomer = (sbgNumber: string, checked: boolean) => {
    const newSelection = new Set(selectedCustomers);
    if (checked) {
      newSelection.add(sbgNumber);
    } else {
      newSelection.delete(sbgNumber);
    }
    setSelectedCustomers(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allSbgNumbers = new Set(extractedData.map((c) => c.sbg_number));
      setSelectedCustomers(allSbgNumbers);
    } else {
      setSelectedCustomers(new Set());
    }
  };
  
  const getNotificationMessage = (customer: BroadcastCustomer): string => {
    const dueDate = formatDate(customer.due_date).toLocaleUpperCase();
    const headerLine = 'Nasabah PEGADAIAN RANOTANA / RANOTANA'; // This can be made dynamic if needed
    
    return `${headerLine}
*Yth. Bpk/Ibu ${customer.name.toLocaleUpperCase()}*

*Gadaian ${customer.sbg_number} Sudah JATUH TEMPO tanggal ${dueDate}*

Segera lakukan : pembayaran bunga/ perpanjangan/cek TAMBAH PINJAMAN bawa surat gadai+ktp+atm BRI+Handphone

Pembayaran bisa dilakukan secara online melalui echannel pegadaian atau aplikasi PEGADAIAN DIGITAL

Terima Kasih`;
  };

  const handleSendNotification = (customer: BroadcastCustomer) => {
    const message = getNotificationMessage(customer);
    const encodedMessage = encodeURIComponent(message);
    
    const formattedPhoneNumber = customer.phone_number.startsWith('0') 
      ? `62${customer.phone_number.substring(1)}` 
      : customer.phone_number;

    const whatsappUrl = `https://wa.me/${formattedPhoneNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

   const handleGenerateVoicenote = async (customer: BroadcastCustomer) => {
    setIsGeneratingVoicenote(true);
    toast({
        title: 'Membuat Pesan Suara...',
        description: `AI sedang membuat pesan suara untuk ${customer.name}.`,
    });
    try {
        const message = getNotificationMessage(customer);
        const { audioDataUri } = await generateCustomerVoicenote({ text: message });

        const formattedPhoneNumber = customer.phone_number.startsWith('0') 
            ? `62${customer.phone_number.substring(1)}` 
            : customer.phone_number;
        const whatsappUrl = `https://wa.me/${formattedPhoneNumber}?text=${encodeURIComponent(message)}`;

        setActiveVoicenote({
            audioDataUri,
            whatsappUrl,
            customerName: customer.name,
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
        title: 'No Customers Selected',
        description: 'Please select at least one customer to notify.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Opening WhatsApp Tabs',
      description: `Preparing notifications for ${selectedCustomers.size} customer(s). Please allow pop-ups.`,
    });

    const customersToNotify = extractedData.filter((c) => selectedCustomers.has(c.sbg_number));
    
    customersToNotify.forEach((customer, index) => {
      // Small delay to prevent browsers from blocking too many pop-ups at once
      setTimeout(() => {
        handleSendNotification(customer);
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
                setActiveVoicenote(null);
            }}
          />
        )}
      <div className="flex items-center">
          <h1 className="text-2xl font-bold tracking-tight font-headline">PDF Broadcast</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>PDF Broadcast Panel</CardTitle>
          <CardDescription>
            Import customer data directly from a PDF file to send bulk notifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
            <Button onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {isLoading ? 'Processing...' : 'Import PDF'}
            </Button>
            <Input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf"
            />
            <div className="flex-grow"></div>
            <Button onClick={handleNotifySelected} disabled={selectedCustomers.size === 0 || isLoading}>
              <Send className="mr-2 h-4 w-4" />
              Notify Selected ({selectedCustomers.size})
            </Button>
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox 
                      checked={selectedCustomers.size > 0 && selectedCustomers.size === extractedData.length && extractedData.length > 0}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      aria-label="Select all"
                      disabled={extractedData.length === 0}
                    />
                  </TableHead>
                  <TableHead>No. SBG</TableHead>
                  <TableHead>Nasabah</TableHead>
                  <TableHead>Rubrik</TableHead>
                  <TableHead>Tgl. Kredit & Jth Tempo</TableHead>
                  <TableHead>Barang Jaminan</TableHead>
                  <TableHead>Taksiran</TableHead>
                  <TableHead>UP (Uang Pinjaman)</TableHead>
                  <TableHead>SM (Sewa Modal)</TableHead>
                  <TableHead>Telp/HP</TableHead>
                  <TableHead>Alamat</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                     <TableRow>
                        <TableCell colSpan={13} className="h-24 text-center">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                            <p className="mt-2 text-muted-foreground">AI is extracting data from the PDF...</p>
                        </TableCell>
                    </TableRow>
                ) : extractedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="h-24 text-center">
                          No data extracted. Click "Import PDF" to begin.
                      </TableCell>
                    </TableRow>
                ) : (
                  extractedData.map((customer, index) => (
                    <TableRow key={customer.sbg_number || index} data-state={selectedCustomers.has(customer.sbg_number) ? 'selected' : ''}>
                      <TableCell>
                        <Checkbox
                            checked={selectedCustomers.has(customer.sbg_number)}
                            onCheckedChange={(checked) => handleSelectCustomer(customer.sbg_number, !!checked)}
                            aria-label={`Select ${customer.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono">{customer.sbg_number}</TableCell>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.rubrik}</TableCell>
                      <TableCell>
                        <div>{formatDate(customer.credit_date)}</div>
                        <div className='font-bold'>{formatDate(customer.due_date)}</div>
                      </TableCell>
                      <TableCell>{customer.barang_jaminan}</TableCell>
                      <TableCell className="text-right">{formatCurrency(customer.taksiran)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(customer.loan_value)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(customer.sewa_modal)}</TableCell>
                      <TableCell>{customer.phone_number}</TableCell>
                      <TableCell>{customer.alamat}</TableCell>
                      <TableCell>{customer.status}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                           <Button size="sm" onClick={() => handleSendNotification(customer)} variant="outline">
                                <Bell className="h-4 w-4" />
                            </Button>
                            <Button size="sm" onClick={() => handleGenerateVoicenote(customer)} disabled={isGeneratingVoicenote}>
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
                Browser may ask for permission to open multiple tabs. Please allow it.
                </div>
            )}
        </CardContent>
      </Card>
    </main>
  );
}

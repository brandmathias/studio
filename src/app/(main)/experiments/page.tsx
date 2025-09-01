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
import type { BroadcastCustomer } from '@/types';
import { Input } from '@/components/ui/input';

// Helper function to parse Excel serial date to a readable string format
const formatDate = (serial: number | string) => {
    if (typeof serial === 'string') {
        // If it's already a string, return it as is, assuming it's pre-formatted.
        return serial;
    }
    if (typeof serial !== 'number' || serial <= 0) return 'N/A';
    // Excel dates are the number of days since 1900-01-01, but there's a bug where it thinks 1900 is a leap year.
    // JavaScript dates are based on milliseconds since 1970-01-01.
    const date = new Date((serial - 25569) * 86400 * 1000);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
};


const formatCurrency = (value: number) => {
    if (isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}

// Helper function to parse DD-MM-YYYY string from excel into a valid Date object
const parseDate = (dateString: string): Date | null => {
    if (!dateString || typeof dateString !== 'string') return null;
    const parts = dateString.match(/(\d{2})-(\d{2})-(\d{4})/);
    if (!parts) return new Date(dateString); // Try parsing directly for other formats
    // parts[1] = DD, parts[2] = MM, parts[3] = YYYY
    const d = new Date(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1]));
    return isNaN(d.getTime()) ? null : d;
}

export default function ExperimentsPage() {
  const { toast } = useToast();
  const [importedData, setImportedData] = React.useState<BroadcastCustomer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = React.useState<Set<string>>(new Set());
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

     if (!file.name.endsWith('.xlsx')) {
        toast({
            title: 'Invalid File Type',
            description: 'Please upload an .xlsx file.',
            variant: 'destructive',
        });
        return;
    }

    setIsLoading(true);
    setImportedData([]);
    setSelectedCustomers(new Set());
    toast({
        title: 'Processing XLSX...',
        description: 'Reading data from the file.',
    });

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            const json: any[] = XLSX.utils.sheet_to_json(worksheet);

            const broadcastCustomers: BroadcastCustomer[] = json.map((row) => {
                 // Dates might be read as Date objects or strings, so we need to handle both
                const creditDate = row['Tgl Kredit'] ? new Date(row['Tgl Kredit']).toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-') : '';
                const dueDate = row['Tgl Jatuh Tempo'] ? new Date(row['Tgl Jatuh Tempo']).toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-') : '';

                return {
                    sbg_number: String(row['No. SBG Siscadu'] || ''),
                    rubrik: String(row['Rubrik'] || ''),
                    name: String(row['Nasabah'] || ''),
                    phone_number: String(row['Telp/HP'] || ''),
                    credit_date: creditDate,
                    due_date: dueDate,
                    loan_value: Number(row['Uang Pinjaman'] || 0),
                    barang_jaminan: String(row['Barang Jaminan'] || ''),
                    taksiran: Number(row['Taksiran'] || 0),
                    sewa_modal: Number(row['SM'] || 0),
                    alamat: '', // Alamat is not in a separate column in the example
                    status: '',   // Status is not in the example
                };
            }).filter(c => c.sbg_number && c.name); // Basic validation

            setImportedData(broadcastCustomers);
            setIsLoading(false);
            toast({
                title: 'Import Complete',
                description: `${broadcastCustomers.length} records have been loaded.`,
            });
        } catch(error) {
            setIsLoading(false);
            toast({
                title: 'Error Parsing XLSX',
                description: 'Failed to process the XLSX file. Please ensure it is not corrupted.',
                variant: 'destructive',
            });
            console.error("XLSX parsing error:", error);
        }
    };
    reader.readAsArrayBuffer(file);

    if (fileInputRef.current) {
        fileInputRef.current.value = '';
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
      const allSbgNumbers = new Set(importedData.map((c) => c.sbg_number));
      setSelectedCustomers(allSbgNumbers);
    } else {
      setSelectedCustomers(new Set());
    }
  };
  
  const handleNotifyAndCalendar = (customer: BroadcastCustomer) => {
    const dueDateObj = parseDate(customer.due_date);
    if (!dueDateObj) {
      console.error("Invalid due date for customer:", customer.name);
      return;
    }

    const dueDate = dueDateObj.toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}).toLocaleUpperCase();
    const headerLine = 'Nasabah PEGADAIAN RANOTANA / RANOTANA';
    const message = `${headerLine}
*Yth. Bpk/Ibu ${customer.name.toLocaleUpperCase()}*

*Gadaian ${customer.sbg_number} (${customer.barang_jaminan}) Sudah JATUH TEMPO tanggal ${dueDate}*

Segera lakukan : pembayaran bunga/ perpanjangan/cek TAMBAH PINJAMAN bawa surat gadai+ktp+atm BRI+Handphone

Pembayaran bisa dilakukan secara online melalui echannel pegadaian atau aplikasi PEGADAIAN DIGITAL

Terima Kasih`;
    const encodedMessage = encodeURIComponent(message);
    const formattedPhoneNumber = customer.phone_number.startsWith('0') 
      ? `62${customer.phone_number.substring(1)}` 
      : customer.phone_number.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/${formattedPhoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    
    // Google Calendar Event
    const eventTitle = encodeURIComponent(`Jatuh Tempo Pegadaian: ${customer.name}`);
    const eventDescription = encodeURIComponent(message);
    const eventStartDate = dueDateObj.toISOString().split('T')[0].replace(/-/g, '');
    const eventEndDateObj = new Date(dueDateObj);
    eventEndDateObj.setDate(dueDateObj.getDate() + 1);
    const eventEndDate = eventEndDateObj.toISOString().split('T')[0].replace(/-/g, '');
    const googleUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${eventStartDate}/${eventEndDate}&details=${eventDescription}`;
    window.open(googleUrl, '_blank');
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
      title: 'Opening WhatsApp & Calendar Tabs',
      description: `Preparing notifications for ${selectedCustomers.size} customer(s). Please allow pop-ups.`,
    });

    const customersToNotify = importedData.filter((c) => selectedCustomers.has(c.sbg_number));
    
    customersToNotify.forEach((customer, index) => {
      setTimeout(() => {
        handleNotifyAndCalendar(customer);
      }, index * 300); // Add a 300ms delay between each customer
    });

    setSelectedCustomers(new Set());
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center">
          <h1 className="text-2xl font-bold tracking-tight font-headline">XLSX Broadcast Experiment</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>XLSX Broadcast Panel</CardTitle>
          <CardDescription>
            Import customer data from an XLSX file to send bulk notifications. Column names in the file should match the headers below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
            <Button onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {isLoading ? 'Processing...' : 'Import XLSX'}
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
              Notify Selected ({selectedCustomers.size})
            </Button>
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox 
                      checked={selectedCustomers.size > 0 && selectedCustomers.size === importedData.length && importedData.length > 0}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      aria-label="Select all"
                      disabled={importedData.length === 0}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={10} className="h-24 text-center">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                            <p className="mt-2 text-muted-foreground">Processing XLSX file...</p>
                        </TableCell>
                    </TableRow>
                ) : importedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-24 text-center">
                          No data imported. Click "Import XLSX" to begin.
                      </TableCell>
                    </TableRow>
                ) : (
                  importedData.map((customer, index) => (
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
                        <div>{customer.credit_date}</div>
                        <div className='font-bold'>{customer.due_date}</div>
                      </TableCell>
                      <TableCell>{customer.barang_jaminan}</TableCell>
                      <TableCell className="text-right">{formatCurrency(customer.taksiran)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(customer.loan_value)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(customer.sewa_modal)}</TableCell>
                      <TableCell>{customer.phone_number}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
            {selectedCustomers.size > 0 && (
                <div className="text-xs text-muted-foreground mt-2">
                Browser may ask for permission to open multiple tabs for WhatsApp and Google Calendar. Please allow it.
                </div>
            )}
        </CardContent>
      </Card>
    </main>
  );
}

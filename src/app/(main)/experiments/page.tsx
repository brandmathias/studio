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
import { Upload, Send, Loader2 } from 'lucide-react';
import type { BroadcastCustomer } from '@/types';
import { Input } from '@/components/ui/input';
import Papa from 'papaparse';


const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    // Check if the date string is in YYYY-MM-DD format, if so convert it.
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    }
    // Handle DD/MM/YYYY format
     if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        const [day, month, year] = dateString.split('/');
        return new Date(`${year}-${month}-${day}`).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    }
    // Assume it's already in a readable format if not YYYY-MM-DD
    return dateString;
};

const formatCurrency = (value: number) => {
    if (isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}

// Helper function to parse DD/MM/YYYY into a valid Date object
const parseDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    const parts = dateString.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!parts) {
        // Try parsing directly if it's not in DD/MM/YYYY
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? null : d;
    }
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
    if (!file) {
      return;
    }

    setIsLoading(true);
    setImportedData([]);
    setSelectedCustomers(new Set());
    toast({
        title: 'Processing CSV...',
        description: 'Reading data from the file.',
    });

    Papa.parse(file, {
        header: false, // We will map by position, not by header name
        skipEmptyLines: true,
        complete: (results) => {
            // Data is now an array of arrays. We skip the first row (header).
            const dataRows = (results.data as string[][]).slice(1);

            const broadcastCustomers: BroadcastCustomer[] = dataRows.map(row => ({
                sbg_number: row[0] || '',
                rubrik: row[1] || '',
                name: row[2] || '',
                phone_number: row[3] || '',
                credit_date: row[4] || '',
                due_date: row[5] || '',
                loan_value: parseFloat(row[6]) || 0,
                barang_jaminan: row[7] || '',
                taksiran: parseFloat(row[8]) || 0,
                sewa_modal: parseFloat(row[9]) || 0,
                alamat: row[10] || '',
                status: row[11] || '',
            })).filter(c => c.sbg_number && c.name); // Basic validation

            setImportedData(broadcastCustomers);
            setIsLoading(false);
            toast({
                title: 'Import Complete',
                description: `${broadcastCustomers.length} records have been loaded.`,
            });
        },
        error: (error: any) => {
            setIsLoading(false);
            toast({
                title: 'Error Parsing CSV',
                description: error.message,
                variant: 'destructive',
            });
            console.error("CSV parsing error:", error);
        }
    });

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

*Gadaian ${customer.sbg_number} Sudah JATUH TEMPO tanggal ${dueDate}*

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
          <h1 className="text-2xl font-bold tracking-tight font-headline">CSV Broadcast Experiment</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>CSV Broadcast Panel</CardTitle>
          <CardDescription>
            Import customer data from a CSV file to send bulk notifications. The column order in the file must match the table order below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
            <Button onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {isLoading ? 'Processing...' : 'Import CSV'}
            </Button>
            <Input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".csv"
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
                  <TableHead>Alamat</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={12} className="h-24 text-center">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                            <p className="mt-2 text-muted-foreground">Processing CSV file...</p>
                        </TableCell>
                    </TableRow>
                ) : importedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="h-24 text-center">
                          No data imported. Click "Import CSV" to begin.
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

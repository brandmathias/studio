'use client';

import * as React from 'react';
import Papa from 'papaparse';
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
import { Upload, Send } from 'lucide-react';
import type { BroadcastCustomer } from '@/types';
import { Input } from '@/components/ui/input';

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
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
}


export default function ExperimentsPage() {
  const { toast } = useToast();
  const [importedData, setImportedData] = React.useState<BroadcastCustomer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = React.useState<Set<string>>(new Set());
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_{2,}/g, '_'),
      complete: (results) => {
        if (results.errors.length) {
            toast({
                title: 'Error Parsing CSV',
                description: 'Please check the file format and content.',
                variant: 'destructive',
            });
            console.error("CSV Parsing Errors:", results.errors);
            return;
        }
        
        const parsedData: BroadcastCustomer[] = results.data.map(row => ({
            sbg_number: row.no_sbg || '',
            rubrik: row.rubrik || '',
            name: row.nasabah || '',
            phone_number: row.telphp || '',
            credit_date: row.tgl_kredit || '',
            due_date: row.tgl_jth_tempo || row.tgl_jatuh_tempo || '',
            loan_value: parseFloat(row.up__uang_pinjaman) || 0,
            barang_jaminan: row.barang_jaminan || '',
            taksiran: parseFloat(row.taksiran) || 0,
            sewa_modal: parseFloat(row.sm__sewa_modal) || 0,
            alamat: row.alamat || '',
            status: row.status || '',
        })).filter(customer => customer.sbg_number); 

        setImportedData(parsedData);
        setSelectedCustomers(new Set()); 
        toast({
          title: 'Data Imported Successfully',
          description: `${parsedData.length} records have been loaded.`,
        });
      },
      error: (error) => {
        toast({
            title: 'Error Reading File',
            description: error.message,
            variant: 'destructive',
        });
        console.error("File Reading Error:", error);
      }
    });
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

  const handleSendNotification = (customer: BroadcastCustomer) => {
    const dueDate = new Date(customer.due_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}).toLocaleUpperCase();
    
    // NOTE: This logic assumes all imported data is for RANOTANA for now.
    // A more robust solution would check the sbg_number prefix.
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

    const customersToNotify = importedData.filter((c) => selectedCustomers.has(c.sbg_number));
    
    customersToNotify.forEach((customer) => {
      handleSendNotification(customer);
    });
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center">
          <h1 className="text-2xl font-bold tracking-tight font-headline">Broadcast Experiment</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>CSV Broadcast Panel</CardTitle>
          <CardDescription>
            Import customer data from a CSV file to send bulk notifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
            <Input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".csv"
            />
            <div className="flex-grow"></div>
            <Button onClick={handleNotifySelected} disabled={selectedCustomers.size === 0}>
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
                {importedData.length === 0 ? (
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
                Browser may ask for permission to open multiple tabs. Please allow it.
                </div>
            )}
        </CardContent>
      </Card>
    </main>
  );
}

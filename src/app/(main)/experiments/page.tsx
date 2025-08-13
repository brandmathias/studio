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
import { Upload, Send } from 'lucide-react';
import type { BroadcastCustomer } from '@/types';

// Mock data based on the provided image, simulating a CSV import
const MOCK_BROADCAST_CUSTOMERS: BroadcastCustomer[] = [
  {
    sbg_number: '1179325010007783',
    rubrik: 'B2-KT',
    name: 'FREDERIKA FILLY TOAD',
    phone_number: '081256250780',
    credit_date: '2025-03-19',
    due_date: '2025-07-16',
    loan_value: 1220000,
  },
  {
    sbg_number: '1179325010007791',
    rubrik: 'B2-KT',
    name: 'DIANE CATHARINA WOWOR',
    phone_number: '085299754006',
    credit_date: '2025-03-19',
    due_date: '2025-07-16',
    loan_value: 1130000,
  },
  {
    sbg_number: '1179325010007841',
    rubrik: 'B2-KT',
    name: 'ARDALISA ARSAD',
    phone_number: '082346520130',
    credit_date: '2025-03-19',
    due_date: '2025-07-16',
    loan_value: 1150000,
  },
  {
    sbg_number: '1179324010011028',
    rubrik: 'B3-KT',
    name: 'LILIANA MARIA PUNGUS',
    phone_number: '085255821040',
    credit_date: '2025-03-19',
    due_date: '2025-07-16',
    loan_value: 2580000,
  },
  {
    sbg_number: '1179325010007866',
    rubrik: 'C1-KT',
    name: 'SAMUEL MARTIN CHARLES TANOS',
    phone_number: '081356084021',
    credit_date: '2025-03-19',
    due_date: '2025-07-16',
    loan_value: 8510000,
  },
];

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
};

export default function ExperimentsPage() {
  const { toast } = useToast();
  const [importedData, setImportedData] = React.useState<BroadcastCustomer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = React.useState<Set<string>>(new Set());

  const handleImport = () => {
    setImportedData(MOCK_BROADCAST_CUSTOMERS);
    setSelectedCustomers(new Set());
    toast({
      title: 'Data Imported',
      description: `${MOCK_BROADCAST_CUSTOMERS.length} records have been loaded.`,
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
      : customer.phone_number;

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

    // Optionally, clear selection after sending
    // setSelectedCustomers(new Set());
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
            <Button onClick={handleImport}>
              <Upload className="mr-2 h-4 w-4" />
              Import CSV (Simulated)
            </Button>
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
                  <TableHead>Telp/HP</TableHead>
                  <TableHead>Tgl Jatuh Tempo</TableHead>
                  <TableHead className="text-right">Uang Pinjaman</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                          No data imported. Click "Import CSV" to begin.
                      </TableCell>
                    </TableRow>
                ) : (
                  importedData.map((customer) => (
                    <TableRow key={customer.sbg_number} data-state={selectedCustomers.has(customer.sbg_number) ? 'selected' : ''}>
                      <TableCell>
                        <Checkbox
                            checked={selectedCustomers.has(customer.sbg_number)}
                            onCheckedChange={(checked) => handleSelectCustomer(customer.sbg_number, !!checked)}
                            aria-label={`Select ${customer.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono">{customer.sbg_number}</TableCell>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.phone_number}</TableCell>
                      <TableCell>{formatDate(customer.due_date)}</TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(customer.loan_value)}
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

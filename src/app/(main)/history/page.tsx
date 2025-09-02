
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Filter, Trash2 } from 'lucide-react';
import type { HistoryEntry } from '@/types';
import { format, isSameDay, startOfToday } from 'date-fns';
import { id } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function HistoryPage() {
  const [history, setHistory] = React.useState<HistoryEntry[]>([]);
  const [dateFilter, setDateFilter] = React.useState<Date | undefined>(startOfToday());

  React.useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('broadcastHistory');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Failed to parse history from localStorage", error);
    }
  }, []);

  const filteredHistory = React.useMemo(() => {
    if (!dateFilter) return history;
    return history.filter(entry => isSameDay(new Date(entry.timestamp), dateFilter));
  }, [history, dateFilter]);

  const clearHistory = () => {
    localStorage.removeItem('broadcastHistory');
    setHistory([]);
  };
  
  const getTemplateBadgeVariant = (template: string) => {
    if (template.includes('lelang')) return 'destructive';
    if (template.includes('keterlambatan')) return 'secondary';
    return 'outline';
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight font-headline">Riwayat Aktivitas Broadcast</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Log Aktivitas</CardTitle>
          <CardDescription>
            Tabel ini menampilkan semua riwayat aktivitas broadcast yang telah dilakukan.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold text-lg">Filter Tanggal</h3>
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={'outline'}
                        className={cn(
                        'w-full sm:w-[240px] justify-start text-left font-normal bg-background',
                        !dateFilter && 'text-muted-foreground'
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFilter ? format(dateFilter, 'PPP', { locale: id }) : <span>Pilih tanggal</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={dateFilter}
                        onSelect={setDateFilter}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
                 {dateFilter && (
                    <Button variant="ghost" onClick={() => setDateFilter(undefined)}>
                        Tampilkan Semua
                    </Button>
                )}
                <div className="flex-grow"></div>
                 <Button variant="destructive" onClick={clearHistory}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Bersihkan Riwayat
                </Button>
            </div>
            <div className="rounded-lg border">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Jenis Broadcast</TableHead>
                    <TableHead>Nasabah</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Admin</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredHistory.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                            Tidak ada riwayat aktivitas untuk tanggal yang dipilih.
                            </TableCell>
                        </TableRow>
                    ) : (
                    filteredHistory.map((entry) => (
                        <TableRow key={entry.id}>
                        <TableCell>
                            {format(new Date(entry.timestamp), 'dd MMM yyyy, HH:mm:ss', { locale: id })}
                        </TableCell>
                        <TableCell>{entry.type}</TableCell>
                        <TableCell>
                            <div className="font-medium">{entry.customerName}</div>
                            <div className="text-sm text-muted-foreground">{entry.customerIdentifier}</div>
                        </TableCell>
                        <TableCell>{entry.status}</TableCell>
                        <TableCell>
                             <Badge variant={getTemplateBadgeVariant(entry.template)} className="capitalize">
                                {entry.template}
                            </Badge>
                        </TableCell>
                        <TableCell>{entry.adminUser}</TableCell>
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



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
import type { HistoryEntry, Customer } from '@/types';
import { format, isSameDay, startOfToday } from 'date-fns';
import { id } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function HistoryPage() {
  const [history, setHistory] = React.useState<HistoryEntry[]>([]);
  const [dateFilter, setDateFilter] = React.useState<Date | undefined>();
  const [typeFilter, setTypeFilter] = React.useState<'all' | 'Gadaian Broadcast' | 'Angsuran Broadcast' | 'MT Broadcast'>('all');
  const [userUpc, setUserUpc] = React.useState<'all' | Customer['upc'] | null>(null);
  const [isClient, setIsClient] = React.useState(false);


  React.useEffect(() => {
    setIsClient(true);
    // Set initial date filter on the client to avoid hydration mismatch
    setDateFilter(startOfToday());

    try {
      const storedUser = localStorage.getItem('loggedInUser');
      const upc = storedUser ? JSON.parse(storedUser).upc : 'all';
      setUserUpc(upc);

      const storageKey = upc === 'all' ? 'broadcastHistory_all' : `broadcastHistory_${upc}`;
      const storedHistory = localStorage.getItem(storageKey);

      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory);
        parsedHistory.sort((a: HistoryEntry, b: HistoryEntry) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setHistory(parsedHistory);
      }
    } catch (error) {
      console.error("Failed to parse history from localStorage", error);
    }
  }, []);

  const filteredHistory = React.useMemo(() => {
    return history.filter(entry => {
        const dateMatch = !dateFilter ? true : isSameDay(new Date(entry.timestamp), dateFilter);
        const typeMatch = typeFilter === 'all' ? true : entry.type === typeFilter;
        return dateMatch && typeMatch;
    });
  }, [history, dateFilter, typeFilter]);

  const clearHistory = () => {
    if (userUpc === null) return;
    const storageKey = userUpc === 'all' ? 'broadcastHistory_all' : `broadcastHistory_${userUpc}`;
    localStorage.removeItem(storageKey);
    setHistory([]);
  };
  
  const getTemplateBadgeVariant = (template: string) => {
    if (template.includes('lelang')) return 'destructive';
    if (template.includes('keterlambatan')) return 'secondary';
    if (template.includes('MT')) return 'outline'; // Specific for MT
    return 'outline';
  }
  
  const clearFilters = () => {
    setDateFilter(undefined);
    setTypeFilter('all');
  }
  
  const getBroadcastTypeBadgeVariant = (type: HistoryEntry['type']) => {
    switch (type) {
        case 'Gadaian Broadcast':
            return 'default';
        case 'Angsuran Broadcast':
            return 'secondary';
        case 'MT Broadcast':
            return 'outline';
        default:
            return 'default';
    }
  };


  return (
    <main className="flex flex-1 flex-col gap-4 p-2 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight font-headline">Riwayat Aktivitas Broadcast</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Log Aktivitas</CardTitle>
          <CardDescription>
            {isClient ? `Tabel ini menampilkan semua riwayat aktivitas broadcast yang telah dilakukan oleh admin ${userUpc === 'all' ? 'semua cabang' : userUpc}.` : 'Memuat data riwayat...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold text-lg">Filter</h3>
                </div>
                 <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto flex-1">
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
                    <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as any)}>
                        <SelectTrigger className="w-full sm:w-[220px] bg-background">
                            <SelectValue placeholder="Filter Jenis Broadcast" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Jenis</SelectItem>
                            <SelectItem value="Gadaian Broadcast">Gadaian Broadcast</SelectItem>
                            <SelectItem value="Angsuran Broadcast">Angsuran Broadcast</SelectItem>
                             <SelectItem value="MT Broadcast">MT Broadcast</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                 {(dateFilter || typeFilter !== 'all') && (
                    <Button variant="ghost" onClick={clearFilters} className="w-full md:w-auto">
                        Bersihkan Filter
                    </Button>
                )}
                <div className="hidden md:flex flex-grow"></div>
                 <Button variant="destructive" onClick={clearHistory} className="w-full md:w-auto mt-2 md:mt-0">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Bersihkan Riwayat
                </Button>
            </div>
            <div className="rounded-lg border">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead className="hidden sm:table-cell">Jenis</TableHead>
                    <TableHead>Nasabah</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Template</TableHead>
                    <TableHead className="hidden md:table-cell">Admin</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredHistory.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                            Tidak ada riwayat aktivitas yang cocok dengan filter.
                            </TableCell>
                        </TableRow>
                    ) : (
                    filteredHistory.map((entry) => (
                        <TableRow key={entry.id}>
                        <TableCell className="text-xs">
                            {format(new Date(entry.timestamp), 'dd MMM yy, HH:mm', { locale: id })}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                           <Badge variant={getBroadcastTypeBadgeVariant(entry.type)} className="capitalize text-xs">
                                {entry.type}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <div className="font-medium text-sm">{entry.customerName}</div>
                            <div className="text-xs text-muted-foreground">{entry.customerIdentifier}</div>
                        </TableCell>
                        <TableCell>
                            <Badge variant={entry.status === 'Pesan Disalin' ? 'outline' : 'default'} className={cn('text-xs', entry.status !== 'Pesan Disalin' && 'bg-green-600')}>{entry.status}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                             <Badge variant={getTemplateBadgeVariant(entry.template)} className="capitalize text-xs">
                                {entry.template}
                            </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{entry.adminUser}</TableCell>
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


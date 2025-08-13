'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { addDays, subDays, format, differenceInDays, isSameDay } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Customer } from '@/types';
import { prioritizeCustomer } from '@/ai/flows/auto-prioritization';
import { Checkbox } from '@/components/ui/checkbox';
import Chatbot from '@/components/Chatbot';
import {
  Scale,
  LogOut,
  User,
  Bot,
  Bell,
  Calendar as CalendarIcon,
  Filter,
  Loader2,
  Send,
  Users,
  BellRing,
  MessageSquare,
  CalendarPlus,
} from 'lucide-react';
import type { VariantProps } from 'class-variance-authority';
import { badgeVariants } from '@/components/ui/badge';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const priorityIndonesianMap: Record<string, Customer['priority']> = {
  high: 'tinggi',
  medium: 'sedang',
  low: 'rendah',
};

const getUpcFromId = (id: string): Customer['upc'] => {
  const prefix = id.substring(0, 5);
  if (prefix === '11798') {
    return 'Pegadaian Wanea';
  }
  if (prefix === '11793') {
    return 'Pegadaian Ranotana';
  }
  return 'N/A';
};


// Enhanced Mock Data to represent different customer segments
const MOCK_CUSTOMERS_RAW: Omit<Customer, 'upc'>[] = [
  {
    id: '1179324010023012',
    name: 'Brando Mathias Zusriadi',
    phone_number: '082188769679',
    email: 'brandomathiasz13@gmail.com',
    due_date: '2025-08-12',
    transaction_type: 'gadai',
    priority: 'none',
    loan_value: 8000000,
    has_been_late_before: false,
    segment: 'none'
  },
  {
    id: '1179300812345678',
    name: 'Brenda Febrina Zusriadi',
    phone_number: '085242041829',
    email: 'brenda.febrina@example.com',
    due_date: '2025-08-17',
    transaction_type: 'angsuran',
    priority: 'none',
    loan_value: 3000000,
    has_been_late_before: false,
    segment: 'none'
  },
  {
    id: '1179811122233344',
    name: 'Savio Hendriko Palendeng',
    phone_number: '0857-5716-0254',
    email: 'savio.hendriko@example.com',
    due_date: '2025-08-20',
    transaction_type: 'gadai',
    priority: 'none',
    loan_value: 12000000,
    has_been_late_before: true,
    segment: 'none'
  },
];

const MOCK_CUSTOMERS: Customer[] = MOCK_CUSTOMERS_RAW.map(c => ({
  ...c,
  upc: getUpcFromId(c.id),
}));


export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [customers, setCustomers] = React.useState<Customer[]>(MOCK_CUSTOMERS);
  const [selectedCustomers, setSelectedCustomers] = React.useState<Set<string>>(new Set());
  const [priorityFilter, setPriorityFilter] = React.useState('all');
  const [dateFilter, setDateFilter] = React.useState<Date | undefined>();
  const [isPrioritizing, setIsPrioritizing] = React.useState(false);
  const [notificationsSent, setNotificationsSent] = React.useState(0);
  const [isChatbotOpen, setIsChatbotOpen] = React.useState(false);

  React.useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      router.push('/login');
    }
  }, [router]);
  
  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    router.push('/login');
  };

  const handleAutoPrioritize = async () => {
    setIsPrioritizing(true);
    toast({
      title: 'Auto-Prioritization Started',
      description: 'AI is analyzing and prioritizing customers. This may take a moment.',
    });
    try {
      const updatedCustomers = await Promise.all(
        customers.map(async (customer) => {
          const daysLate = Math.max(0, differenceInDays(new Date(), new Date(customer.due_date)));
          const result = await prioritizeCustomer({
            dueDate: customer.due_date,
            loanValue: customer.loan_value,
            daysLate,
            hasBeenLateBefore: customer.has_been_late_before,
          });
          const newPriority = priorityIndonesianMap[result.priority] || 'rendah';
          // Placeholder for segmentation logic to be added later
          const newSegment: Customer['segment'] = customer.loan_value > 10000000 ? 'Platinum' : customer.has_been_late_before ? 'Berisiko' : 'Reguler';
          return { ...customer, priority: newPriority, segment: newSegment };
        })
      );
      setCustomers(updatedCustomers);
      toast({
        title: 'Prioritization Complete',
        description: 'All customers have been successfully prioritized by the AI system.',
        variant: 'default',
        className: 'bg-accent/30 border-accent/50'
      });
    } catch (error) {
      console.error('Prioritization failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to prioritize customers. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsPrioritizing(false);
    }
  };
  
  const filteredCustomers = React.useMemo(() => {
    return customers
      .filter((customer) =>
        priorityFilter === 'all' ? true : customer.priority === priorityFilter
      )
      .filter((customer) =>
        !dateFilter ? true : isSameDay(new Date(customer.due_date), dateFilter)
      );
  }, [customers, priorityFilter, dateFilter]);
  
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
      const allCustomerIds = new Set(filteredCustomers.map((c) => c.id));
      setSelectedCustomers(allCustomerIds);
    } else {
      setSelectedCustomers(new Set());
    }
  };

  const handleSendNotification = (customer: Customer) => {
    const dueDate = format(new Date(customer.due_date), 'dd MMMM yyyy').toLocaleUpperCase();
    
    let headerLine = '';
    if (customer.upc === 'Pegadaian Ranotana') {
        headerLine = 'Nasabah PEGADAIAN RANOTANA / RANOTANA';
    } else if (customer.upc === 'Pegadaian Wanea') {
        const upcName = customer.upc.replace('Pegadaian ', '').toLocaleUpperCase();
        headerLine = `Nasabah PEGADAIAN ${upcName} / TANJUNG BATU`;
    } else {
        // Fallback for N/A or other UPCs
        const upcName = customer.upc.replace('Pegadaian ', '').toLocaleUpperCase();
        headerLine = `Nasabah PEGADAIAN ${upcName}`;
    }

    const message = `${headerLine}
*Yth. Bpk/Ibu ${customer.name.toLocaleUpperCase()}*

*Gadaian ${customer.id} Sudah JATUH TEMPO tanggal ${dueDate}*

Segera lakukan : pembayaran bunga/ perpanjangan/cek TAMBAH PINJAMAN bawa surat gadai+ktp+atm BRI+Handphone

Pembayaran bisa dilakukan secara online melalui echannel pegadaian atau aplikasi PEGADAIAN DIGITAL

Terima Kasih`;

    const encodedMessage = encodeURIComponent(message);
    
    // Format number to remove leading '0' and add country code '62'
    const formattedPhoneNumber = customer.phone_number.startsWith('0') 
      ? `62${customer.phone_number.substring(1)}` 
      : customer.phone_number;

    const whatsappUrl = `https://wa.me/${formattedPhoneNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    setNotificationsSent(prev => prev + 1);
  };
  
  const handleAddToCalendar = (customer: Customer, type: 'google' | 'ical') => {
    const eventTitle = encodeURIComponent(`Jatuh Tempo Pegadaian: ${customer.name}`);
    const dueDate = format(new Date(customer.due_date), 'dd MMMM yyyy').toLocaleUpperCase();
    
    let headerLine = '';
    if (customer.upc === 'Pegadaian Ranotana') {
        headerLine = 'Nasabah PEGADAIAN RANOTANA / RANOTANA';
    } else if (customer.upc === 'Pegadaian Wanea') {
        const upcName = customer.upc.replace('Pegadaian ', '').toLocaleUpperCase();
        headerLine = `Nasabah PEGADAIAN ${upcName} / TANJUNG BATU`;
    } else {
        const upcName = customer.upc.replace('Pegadaian ', '').toLocaleUpperCase();
        headerLine = `Nasabah PEGADAIAN ${upcName}`;
    }

    const emailMessage = `${headerLine}

*Yth. Bpk/Ibu ${customer.name.toLocaleUpperCase()}*

*Gadaian ${customer.id} Sudah JATUH TEMPO tanggal ${dueDate}.*

Segera lakukan : pembayaran bunga/ perpanjangan/cek TAMBAH PINJAMAN bawa surat gadai+ktp+atm BRI+Handphone

Pembayaran bisa dilakukan secara online melalui echannel pegadaian atau aplikasi PEGADAIAN DIGITAL.

Terima Kasih`;
    
    const eventDescription = encodeURIComponent(emailMessage);
    
    const eventStartDate = format(new Date(customer.due_date), 'yyyyMMdd');
    const eventEndDate = format(addDays(new Date(customer.due_date), 1), 'yyyyMMdd');

    if (type === 'google') {
      const guestEmail = customer.email ? `&add=${encodeURIComponent(customer.email)}` : '';
      const googleUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${eventStartDate}/${eventEndDate}&details=${eventDescription}${guestEmail}`;
      window.open(googleUrl, '_blank');
    } else if (type === 'ical') {
        const icalContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'BEGIN:VEVENT',
            `UID:${customer.id}@pegadaian.co.id`,
            `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`,
            `DTSTART;VALUE=DATE:${eventStartDate}`,
            `DTEND;VALUE=DATE:${eventEndDate}`,
            `SUMMARY:${decodeURIComponent(eventTitle)}`,
            `DESCRIPTION:${decodeURIComponent(eventDescription)}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `pegadaian_reminder_${customer.id}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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

    const customersToNotify = customers.filter((c) => selectedCustomers.has(c.id));
    
    customersToNotify.forEach((customer) => {
      handleSendNotification(customer);
    });

    setSelectedCustomers(new Set());
  };
  
  const priorityVariantMap: Record<Customer['priority'], VariantProps<typeof Badge>['variant']> = {
      tinggi: 'destructive',
      sedang: 'secondary',
      rendah: 'outline',
      none: 'outline',
  };

  const priorityData = React.useMemo(() => {
    const counts = customers.reduce((acc, customer) => {
      if (customer.priority !== 'none') {
        acc[customer.priority] = (acc[customer.priority] || 0) + 1;
      }
      return acc;
    }, {} as Record<Customer['priority'], number>);
    
    return [
        { name: 'Tinggi', value: counts.tinggi || 0, color: 'hsl(var(--destructive))' },
        { name: 'Sedang', value: counts.sedang || 0, color: 'hsl(var(--accent))' },
        { name: 'Rendah', value: counts.rendah || 0, color: 'hsl(var(--secondary))' },
    ].filter(d => d.value > 0);
  }, [customers]);

  const segmentVariantMap: Record<string, VariantProps<typeof Badge>['variant']> = {
      'Platinum': 'default',
      'Reguler': 'secondary',
      'Berisiko': 'destructive',
      'none': 'outline',
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6 z-10">
        <nav className="flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6 w-full">
          <a
            href="#"
            className="flex items-center gap-2 text-lg font-semibold md:text-base text-primary"
          >
            <Scale className="h-6 w-6" />
            <span className="font-headline">GadaiAlert</span>
          </a>
        </nav>
        <div className="flex items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar>
                    <AvatarImage src="https://placehold.co/40x40" alt="Admin" data-ai-hint="person portrait" />
                    <AvatarFallback>A</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Admin Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem><User className="mr-2 h-4 w-4" />Profile</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center">
            <h1 className="text-2xl font-bold tracking-tight font-headline">Customer Intelligence Dashboard</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Nasabah</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{customers.length}</div>
                    <p className="text-xs text-muted-foreground">Jumlah nasabah aktif</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Notifikasi Terkirim</CardTitle>
                    <BellRing className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{notificationsSent}</div>
                    <p className="text-xs text-muted-foreground">Total notifikasi dikirim hari ini</p>
                </CardContent>
            </Card>
            <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Distribusi Prioritas</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {priorityData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={120}>
                            <PieChart>
                                <Pie
                                    data={priorityData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={50}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}
                                    className="text-xs"
                                >
                                {priorityData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--background))',
                                        borderColor: 'hsl(var(--border))',
                                        fontSize: '12px',
                                        borderRadius: 'var(--radius)'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                     ) : (
                        <div className="flex items-center justify-center h-[120px] text-sm text-muted-foreground">
                            Jalankan Auto-Prioritize untuk melihat data.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardContent className="p-4">
                 <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
                     <div className="flex-grow"></div>
                     <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button onClick={handleAutoPrioritize} disabled={isPrioritizing} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
                            {isPrioritizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                            Auto-Prioritize & Segment
                        </Button>
                        <Button onClick={handleNotifySelected} className="w-full sm:w-auto" disabled={selectedCustomers.size === 0}>
                            <Send className="mr-2 h-4 w-4" />
                            Notify Selected ({selectedCustomers.size})
                        </Button>
                    </div>
                </div>
                 <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Filter className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold text-lg">Filters</h3>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto md:ml-auto">
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                        <SelectTrigger className="w-full sm:w-[180px] bg-background">
                            <SelectValue placeholder="Filter by Priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Priorities</SelectItem>
                            <SelectItem value="tinggi">
                                <Badge variant="destructive">Tinggi</Badge>
                            </SelectItem>
                            <SelectItem value="sedang">
                                <Badge variant="secondary" className="bg-accent/20 text-accent-foreground border-accent/50">Sedang</Badge>
                            </SelectItem>
                             <SelectItem value="rendah">
                                <Badge variant="outline">Rendah</Badge>
                            </SelectItem>
                        </SelectContent>
                    </Select>
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
                            {dateFilter ? format(dateFilter, 'PPP') : <span>Filter by due date</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={dateFilter}
                            onSelect={(date) => {
                                setDateFilter(date);
                            }}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    { (dateFilter || priorityFilter !== 'all') && 
                        <Button variant="ghost" onClick={() => { setDateFilter(undefined); setPriorityFilter('all');}}>Clear</Button>
                    }
                    </div>
                </div>
                <div className="rounded-lg border">
                    <Table>
                    <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]">
                            <Checkbox 
                              checked={selectedCustomers.size > 0 && selectedCustomers.size === filteredCustomers.length && filteredCustomers.length > 0}
                              onCheckedChange={(checked) => handleSelectAll(!!checked)}
                              aria-label="Select all"
                            />
                          </TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>UPC</TableHead>
                          <TableHead>Segment</TableHead>
                          <TableHead className="hidden md:table-cell">Transaction</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCustomers.length === 0 ? (
                             <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">
                                    No customers found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredCustomers.map((customer) => (
                            <TableRow key={customer.id} data-state={selectedCustomers.has(customer.id) ? 'selected' : ''}>
                                <TableCell>
                                <Checkbox
                                    checked={selectedCustomers.has(customer.id)}
                                    onCheckedChange={(checked) => handleSelectCustomer(customer.id, !!checked)}
                                    aria-label="Select customer"
                                />
                                </TableCell>
                                <TableCell>
                                <div className="font-medium">{customer.name}</div>
                                <div className="text-sm text-muted-foreground">{customer.phone_number}</div>
                                <div className="text-sm text-muted-foreground">{customer.email}</div>
                                </TableCell>
                                <TableCell>{customer.upc}</TableCell>
                                 <TableCell>
                                    <Badge variant={segmentVariantMap[customer.segment] || 'outline'} className="capitalize">
                                        {customer.segment === 'none' ? 'N/A' : customer.segment}
                                    </Badge>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                    <div className="font-medium capitalize">{customer.transaction_type}</div>
                                    <div className="text-sm text-muted-foreground">
                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(customer.loan_value)}
                                    </div>
                                </TableCell>
                                <TableCell>{format(new Date(customer.due_date), 'dd MMMM yyyy')}</TableCell>
                                <TableCell>
                                <Badge variant={priorityVariantMap[customer.priority]} className={cn('capitalize', customer.priority === 'sedang' && 'bg-accent/20 text-accent-foreground border-accent/50')}>
                                    {customer.priority === 'none' ? 'N/A' : customer.priority}
                                </Badge>
                                </TableCell>
                                <TableCell className="space-x-2">
                                  <Button size="sm" onClick={() => handleSendNotification(customer)}>
                                      <Bell className="mr-2 h-4 w-4" />
                                      Notify
                                  </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="sm" variant="outline">
                                                <CalendarPlus className="mr-2 h-4 w-4" />
                                                Calendar
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => handleAddToCalendar(customer, 'google')}>
                                                Google Calendar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleAddToCalendar(customer, 'ical')}>
                                                iCal / Outlook
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
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

       {/* Chatbot Launcher */}
       <div className="fixed bottom-4 right-4 z-50">
          <Button
            size="icon"
            className="rounded-full w-14 h-14 shadow-lg bg-primary hover:bg-primary/90"
            onClick={() => setIsChatbotOpen(!isChatbotOpen)}
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
        </div>

        {/* Chatbot Window */}
        {isChatbotOpen && <Chatbot onClose={() => setIsChatbotOpen(false)} />}
    </div>
  );
}

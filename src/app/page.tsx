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
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Customer } from '@/types';
import { prioritizeCustomer } from '@/ai/flows/auto-prioritization';
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
} from 'lucide-react';
import type { VariantProps } from 'class-variance-authority';
import { badgeVariants } from '@/components/ui/badge';

const priorityIndonesianMap: Record<string, Customer['priority']> = {
  high: 'tinggi',
  medium: 'sedang',
  low: 'rendah',
};

const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'PGD-001',
    name: 'Budi Santoso',
    phone_number: '081234567890',
    due_date: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
    transaction_type: 'gadai',
    priority: 'none',
    loan_value: 12000000,
    has_been_late_before: true,
  },
  {
    id: 'PGD-002',
    name: 'Citra Lestari',
    phone_number: '081234567891',
    due_date: format(new Date(), 'yyyy-MM-dd'),
    transaction_type: 'angsuran',
    priority: 'none',
    loan_value: 5000000,
    has_been_late_before: false,
  },
  {
    id: 'PGD-003',
    name: 'Agus Wijaya',
    phone_number: '081234567892',
    due_date: format(addDays(new Date(), 3), 'yyyy-MM-dd'),
    transaction_type: 'gadai',
    priority: 'none',
    loan_value: 7500000,
    has_been_late_before: true,
  },
  {
    id: 'PGD-004',
    name: 'Dewi Anggraini',
    phone_number: '081234567893',
    due_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    transaction_type: 'angsuran',
    priority: 'none',
    loan_value: 1500000,
    has_been_late_before: false,
  },
  {
    id: 'PGD-005',
    name: 'Eko Prasetyo',
    phone_number: '081234567894',
    due_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    transaction_type: 'gadai',
    priority: 'none',
    loan_value: 25000000,
    has_been_late_before: false,
  },
  {
    id: 'PGD-006',
    name: 'Fitriani',
    phone_number: '081234567895',
    due_date: format(addDays(new Date(), 10), 'yyyy-MM-dd'),
    transaction_type: 'gadai',
    priority: 'none',
    loan_value: 500000,
    has_been_late_before: false,
  },
  {
    id: 'PGD-007',
    name: 'Brando Mathias Zusriadi',
    phone_number: '082188769679',
    due_date: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
    transaction_type: 'gadai',
    priority: 'none',
    loan_value: 8000000,
    has_been_late_before: false,
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [customers, setCustomers] = React.useState<Customer[]>(MOCK_CUSTOMERS);
  const [priorityFilter, setPriorityFilter] = React.useState('all');
  const [dateFilter, setDateFilter] = React.useState<Date | undefined>();
  const [isPrioritizing, setIsPrioritizing] = React.useState(false);

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
          return { ...customer, priority: newPriority };
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

  const handleSendNotification = (customer: Customer) => {
    const message = `Yth. ${customer.name}, transaksi Anda di Pegadaian dgn No. Ref ${customer.id} jatuh tempo pd ${format(new Date(customer.due_date), 'dd MMMM yyyy')}. Mohon segera lakukan pembayaran.`;
    const encodedMessage = encodeURIComponent(message);
    
    // Format number to remove leading '0' and add country code '62'
    const formattedPhoneNumber = customer.phone_number.startsWith('0') 
      ? `62${customer.phone_number.substring(1)}` 
      : customer.phone_number;

    const whatsappUrl = `https://wa.me/${formattedPhoneNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');

    toast({
      title: 'Redirecting to WhatsApp',
      description: `Preparing message for ${customer.name}...`,
    });
  };

  const handleNotifyAll = () => {
    if (filteredCustomers.length === 0) {
      toast({
        title: 'No Customers to Notify',
        description: 'There are no customers matching the current filters.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Opening WhatsApp Tabs',
      description: `Preparing notifications for ${filteredCustomers.length} customer(s). Please allow pop-ups.`,
    });

    filteredCustomers.forEach((customer, index) => {
      // Add a small delay between opening tabs to prevent browser from blocking them
      setTimeout(() => {
        handleSendNotification(customer);
      }, index * 300);
    });
  };
  
  const priorityVariantMap: Record<Customer['priority'], VariantProps<typeof Badge>['variant']> = {
      tinggi: 'destructive',
      sedang: 'secondary',
      rendah: 'outline',
      none: 'outline',
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
            <h1 className="text-2xl font-bold tracking-tight font-headline">Customer Dashboard</h1>
        </div>
        <Card>
            <CardContent className="p-4">
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
                                <div className="flex items-center gap-2">
                                <Badge variant="destructive" className="px-1 py-0">Tinggi</Badge>
                                <span>Tinggi</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="sedang">
                                <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="px-1 py-0 bg-accent/20 text-accent-foreground border-accent/50">Sedang</Badge>
                                <span>Sedang</span>
                                </div>
                            </SelectItem>
                             <SelectItem value="rendah">
                                <div className="flex items-center gap-2">
                                <Badge variant="outline" className="px-1 py-0">Rendah</Badge>
                                <span>Rendah</span>
                                </div>
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
                     <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button onClick={handleAutoPrioritize} disabled={isPrioritizing} className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
                            {isPrioritizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                            Auto-Prioritize
                        </Button>
                        <Button onClick={handleNotifyAll} className="w-full sm:w-auto">
                            <Send className="mr-2 h-4 w-4" />
                            Notify All
                        </Button>
                    </div>
                </div>
                <div className="rounded-lg border">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead className="hidden md:table-cell">Transaction</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                            <TableCell>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-muted-foreground">{customer.phone_number}</div>
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
                            <TableCell>
                            <Button size="sm" onClick={() => handleSendNotification(customer)}>
                                <Bell className="mr-2 h-4 w-4" />
                                Notify
                            </Button>
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </div>
                 {filteredCustomers.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Browser may ask for permission to open multiple tabs. Please allow it.
                  </div>
                )}
            </CardContent>
        </Card>
      </main>
    </div>
  );
}


'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { addDays, subDays, format, differenceInDays, isSameDay, startOfToday, isPast, parseISO } from 'date-fns';
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
import type { Customer, ScheduledTask } from '@/types';
import { generateCustomerVoicenote } from '@/ai/flows/tts-flow';
import VoicenotePreviewDialog from '@/components/VoicenotePreviewDialog';
import AuctionRiskDialog from '@/components/AuctionRiskDialog';
import { Checkbox } from '@/components/ui/checkbox';
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
  CalendarPlus,
  Mic,
  ClipboardCopy,
  Trash2,
  CheckCircle2,
  LayoutGrid,
  List,
  ClipboardList,
  MapPin,
  Phone,
  Clock,
  Building,
  Megaphone,
  Star,
  UserCheck,
} from 'lucide-react';
import type { VariantProps } from 'class-variance-authority';
import { badgeVariants } from '@/components/ui/badge';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { prioritizeCustomer } from './actions';
import type { PredictAuctionRiskOutput } from '@/ai/flows/auction-risk-predictor';
import { Input } from '@/components/ui/input';
import KanbanBoard from '@/components/KanbanBoard';


const priorityIndonesianMap: Record<string, Customer['priority']> = {
  high: 'tinggi',
  medium: 'sedang',
  low: 'rendah',
};

const getUpcFromId = (id: string): Customer['upc'] => {
  const prefix = id.substring(0, 5);
  if (prefix === '11787') {
    return 'Pegadaian Wanea';
  }
  if (prefix === '11793') {
    return 'Pegadaian Ranotana';
  }
  return 'N/A';
};


// Enhanced Mock Data to represent different customer segments
const MOCK_CUSTOMERS_RAW: Omit<Customer, 'upc' | 'segment' | 'follow_up_status'>[] = [
  {
    id: '1178724010014909',
    name: 'Vycency Tacya Runtu',
    phone_number: '082188769679',
    email: 'vycency.tacya@example.com',
    due_date: '2025-08-07',
    transaction_type: 'gadai',
    priority: 'none',
    loan_value: 20000000,
    has_been_late_before: false,
    transaction_count: 6,
    days_since_last_transaction: 30,
    barang_jaminan: 'LIMA CINCIN + 1GLG DITAKSIR PERHIASAN EMAS 21 KARAT BERAT 39.6/38.6 GRAM',
  },
  {
    id: '1179300812345678',
    name: 'Brenda Febrina Zusriadi',
    phone_number: '085242041829',
    email: 'brenda.febrina@example.com',
    due_date: format(subDays(new Date(), 5), 'yyyy-MM-dd'), // 5 days past due
    transaction_type: 'angsuran',
    priority: 'none',
    loan_value: 3000000,
    has_been_late_before: false,
    transaction_count: 1,
    days_since_last_transaction: 200,
    barang_jaminan: 'Cincin Emas 5gr',
  },
  {
    id: '1178711122233344',
    name: 'Savio Hendriko Palendeng',
    phone_number: '0857-5716-0254',
    email: 'savio.hendriko@example.com',
    due_date: format(subDays(new Date(), 20), 'yyyy-MM-dd'), // 20 days past due (auction warning)
    transaction_type: 'gadai',
    priority: 'none',
    loan_value: 12000000,
    has_been_late_before: true,
    transaction_count: 8,
    days_since_last_transaction: 45,
    barang_jaminan: 'Motor Honda Beat',
  },
];

const INITIAL_CUSTOMERS: Customer[] = MOCK_CUSTOMERS_RAW.map(c => ({
  ...c,
  upc: getUpcFromId(c.id),
  segment: 'none',
  follow_up_status: 'baru',
}));

type NotificationTemplate = 'jatuh-tempo' | 'keterlambatan' | 'peringatan-lelang';

interface UpcProfileData {
    name: string;
    address: string;
    phone: string;
    operatingHours: string;
    description: string;
    mapUrl: string;
    announcement: string;
    featuredProduct: string;
    staff: {
        penaksir: { name: string; status: 'Online' | 'Offline'; avatar: string },
        kasir: { name: string; status: 'Online' | 'Offline'; avatar: string },
    }
}

const upcProfiles: Record<Customer['upc'] | 'all', UpcProfileData> = {
    'Pegadaian Wanea': {
        name: "UPC Wanea",
        address: "Jl. Sam Ratulangi No.123, Wanea, Manado",
        phone: "(0431) 123-456",
        operatingHours: "Senin - Jumat: 08:00 - 15:00",
        description: "Melayani area Wanea dan sekitarnya dengan fokus pada gadai emas dan pinjaman modal usaha.",
        mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.513904996929!2d124.84803331521033!3d1.481193998964724!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x328774e1c8c95697%3A0x66f12204680d3d5e!2sPegadaian%20UPC%20Wanea!5e0!3m2!1sen!2sid!4v1622013892789!5m2!1sen!2sid",
        announcement: "Rapat evaluasi bulanan akan diadakan pada hari Jumat ini pukul 14:00.",
        featuredProduct: "Cicil Emas",
        staff: {
            penaksir: { name: 'Jevani Tatontos', status: 'Online', avatar: 'https://placehold.co/100x100/EEDD82/000000?text=JT' },
            kasir: { name: 'Chintya Timbuleng', status: 'Online', avatar: 'https://placehold.co/100x100/D8BFD8/000000?text=CT' },
        }
    },
    'Pegadaian Ranotana': {
        name: "UPC Ranotana",
        address: "Komp. Ruko Ranotana, Jl. D.I. Panjaitan, Manado",
        phone: "(0431) 987-654",
        operatingHours: "Senin - Sabtu: 08:00 - 16:00",
        description: "Spesialisasi dalam layanan angsuran kendaraan dan gadai barang elektronik.",
        mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15954.073843513346!2d124.82583315!3d1.4646738499999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3287745d8d80f833%3A0xe54d898516b18861!2sPegadaian%20UPC%20Ranotana!5e0!3m2!1sen!2sid!4v1622013992789!5m2!1sen!2sid",
        announcement: "Jangan lupa untuk mengikuti training produk baru minggu depan.",
        featuredProduct: "Pinjaman Modal Produktif",
        staff: {
            penaksir: { name: 'Michael Wowor', status: 'Online', avatar: 'https://placehold.co/100x100/A0E6E6/000000?text=MW' },
            kasir: { name: 'Jessica Manopo', status: 'Offline', avatar: 'https://placehold.co/100x100/FFC0CB/000000?text=JM' },
        }
    },
    'N/A': { // Fallback for customers without a clear UPC
        name: "Kantor Cabang",
        address: "N/A",
        phone: "N/A",
        operatingHours: "N/A",
        description: "Informasi cabang tidak tersedia.",
        mapUrl: "",
        announcement: "Tidak ada pengumuman.",
        featuredProduct: "Gadai Tabungan Emas",
        staff: {
            penaksir: { name: 'N/A', status: 'Offline', avatar: '' },
            kasir: { name: 'N/A', status: 'Offline', avatar: '' },
        }
    },
    'all': { // For Super Admin
        name: "Kantor Pusat Pegadaian",
        address: "Jl. Kramat Raya No.162, Jakarta Pusat",
        phone: "(021) 123-4567",
        operatingHours: "Senin - Jumat: 08:00 - 17:00",
        description: "Dashboard Super Admin. Mengawasi seluruh operasional Unit Pelayanan Cabang.",
        mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.529126294488!2d106.845553315228!3d-6.19543199551694!2m3!1f0!2f0!3f0!3m2!1i1024!2i780!4f13.1!3m3!1m2!1s0x2e69f441b53e7c81%3A0x1d6a6c2a13f2a71!2sPT%20Pegadaian%20(Persero)%20Kantor%20Pusat!5e0!3m2!1sen!2sid!4v1622014120894!5m2!1sen!2sid",
        announcement: "Fokus Q3 adalah peningkatan kualitas layanan di semua cabang.",
        featuredProduct: "Gadai Efek",
        staff: {
            penaksir: { name: 'System', status: 'Online', avatar: '' },
            kasir: { name: 'System', status: 'Online', avatar: '' },
        }
    },
};



export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [userUpc, setUserUpc] = React.useState<keyof typeof upcProfiles>('all');
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = React.useState<Set<string>>(new Set());
  const [priorityFilter, setPriorityFilter] = React.useState('all');
  const [dateFilter, setDateFilter] = React.useState<Date | undefined>();
  const [isPrioritizing, setIsPrioritizing] = React.useState(false);
  const [notificationsSent, setNotificationsSent] = React.useState(0);
  const [viewMode, setViewMode] = React.useState<'table' | 'kanban'>('table');
  
  const [isPredictingRisk, setIsPredictingRisk] = React.useState<string | null>(null);
  const [auctionRiskData, setAuctionRiskData] = React.useState<PredictAuctionRiskOutput | null>(null);

  const [isGeneratingVoicenote, setIsGeneratingVoicenote] = React.useState(false);
  const [activeVoicenote, setActiveVoicenote] = React.useState<{
    audioDataUri: string;
    whatsappUrl: string;
    customerName: string;
  } | null>(null);

  const [tasks, setTasks] = React.useState<ScheduledTask[]>([]);
  const customerRowsRef = React.useRef<Record<string, HTMLTableRowElement | null>>({});

  // Auth and data loading effect
  React.useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }

    try {
      const storedUser = localStorage.getItem('loggedInUser');
      const upc = storedUser ? JSON.parse(storedUser).upc : 'all';
      setUserUpc(upc === 'all' ? 'all' : upc);

      const storageKey = `gadaiAlert_customers_${upc}`;
      const storedCustomers = localStorage.getItem(storageKey);
      
      if (storedCustomers) {
        setCustomers(JSON.parse(storedCustomers));
      } else {
        // Filter initial data for the specific UPC if no data is in storage
        const initialFilteredCustomers = upc === 'all' 
            ? INITIAL_CUSTOMERS 
            : INITIAL_CUSTOMERS.filter(c => c.upc === upc);
        setCustomers(initialFilteredCustomers);
      }
      
      const storedTasks = localStorage.getItem('gadaiAlertTasks');
      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      }

    } catch (error) {
      console.error("Failed to process data from localStorage", error);
      setCustomers(INITIAL_CUSTOMERS); // fallback
      setTasks([]);
    }
  }, [router]);

  // Save customers and tasks to localStorage whenever they change
  React.useEffect(() => {
    try {
        if (customers.length > 0) {
            const storageKey = `gadaiAlert_customers_${userUpc}`;
            localStorage.setItem(storageKey, JSON.stringify(customers));
        }
        localStorage.setItem('gadaiAlertTasks', JSON.stringify(tasks));
    } catch (error) {
        console.error("Failed to save data to localStorage", error);
    }
  }, [customers, tasks, userUpc]);
  
  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('loggedInUser');
    router.push('/login');
  };

  const handleAutoPrioritize = async () => {
    setIsPrioritizing(true);
    toast({
      title: 'AI Analysis Started',
      description: 'AI is analyzing and prioritizing customers. This may take a moment.',
    });
    try {
      const updatedCustomers = await Promise.all(
        customers.map(async (customer) => {
          const daysLate = Math.max(0, differenceInDays(new Date(), new Date(customer.due_date)));
          
          const { priority } = await prioritizeCustomer({
            dueDate: customer.due_date,
            loanValue: customer.loan_value,
            daysLate,
            hasBeenLateBefore: customer.has_been_late_before,
          });

          const newPriority = priorityIndonesianMap[priority] || 'rendah';
          
          return { ...customer, priority: newPriority };
        })
      );
      setCustomers(updatedCustomers);
      toast({
        title: 'Analysis Complete',
        description: 'All customers have been successfully prioritized by the AI system.',
        variant: 'default',
        className: 'bg-accent/30 border-accent/50'
      });
    } catch (error) {
      console.error('AI analysis failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to analyze customers. Please try again.',
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

  const getNotificationMessage = (customer: Customer, template: NotificationTemplate): string => {
    const dueDate = format(new Date(customer.due_date), 'dd MMMM yyyy').toLocaleUpperCase();
    let messageBody = '';
    const upc = getUpcFromId(customer.id);
    let headerLine = '';

    if (upc === 'Pegadaian Wanea') {
        headerLine = 'Nasabah PEGADAIAN WANEA / TANJUNG BATU';
    } else if (upc === 'Pegadaian Ranotana') {
        headerLine = 'Nasabah PEGADAIAN RANOTANA / RANOTANA';
    } else {
        headerLine = `Nasabah PEGADAIAN`;
    }

    switch (template) {
        case 'peringatan-lelang':
            messageBody = `*PERINGATAN LELANG (TERAKHIR)*

Gadaian Anda No. ${customer.id} (${customer.barang_jaminan}) telah melewati batas jatuh tempo (${dueDate}) lebih dari 14 hari.

Untuk menghindari proses lelang, segera lakukan pelunasan atau perpanjangan di cabang terdekat dalam waktu 2x24 jam. Abaikan pesan ini jika sudah melakukan pembayaran.`;
            break;
        case 'keterlambatan':
            messageBody = `*Gadaian Anda Sudah Jatuh Tempo*

Gadaian No. ${customer.id} (${customer.barang_jaminan}) telah melewati tanggal jatuh tempo pada ${dueDate}.

Akan dikenakan denda keterlambatan. Mohon segera lakukan pembayaran untuk menghindari denda yang lebih besar atau risiko lelang.`;
            break;
        case 'jatuh-tempo':
        default:
            messageBody = `*Gadaian Anda akan segera Jatuh Tempo*

Gadaian No. ${customer.id} (${customer.barang_jaminan}) akan jatuh tempo pada tanggal *${dueDate}*.

Segera lakukan pembayaran bunga/perpanjangan/cek TAMBAH PINJAMAN. Pembayaran bisa dilakukan secara online melalui aplikasi PEGADAIAN DIGITAL atau e-channel lainnya.`;
            break;
    }

    return `${headerLine}
*Yth. Bpk/Ibu ${customer.name.toLocaleUpperCase()}*

${messageBody}

Terima Kasih`;
};


  const handleCopyMessage = (customer: Customer, template: NotificationTemplate) => {
    const message = getNotificationMessage(customer, template);
    navigator.clipboard.writeText(message).then(() => {
      toast({
        title: 'Pesan Disalin',
        description: `Pesan untuk ${customer.name} telah disalin ke clipboard.`,
      });
    }).catch(err => {
      console.error('Failed to copy message: ', err);
      toast({
        title: 'Gagal Menyalin',
        description: 'Tidak dapat menyalin pesan. Silakan coba lagi.',
        variant: 'destructive',
      });
    });
  };
  
  const handleSendNotification = (customer: Customer, template: NotificationTemplate) => {
    const message = getNotificationMessage(customer, template);
    const encodedMessage = encodeURIComponent(message);
    
    const formattedPhoneNumber = customer.phone_number.startsWith('0') 
      ? `62${customer.phone_number.substring(1)}` 
      : customer.phone_number.replace(/[^0-9]/g, '');

    const whatsappUrl = `https://wa.me/${formattedPhoneNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    setNotificationsSent(prev => prev + 1);
  };
  
  const handleGenerateVoicenote = async (customer: Customer, template: NotificationTemplate) => {
    setIsGeneratingVoicenote(true);
    toast({
        title: 'Membuat Pesan Suara...',
        description: `AI sedang membuat pesan suara untuk ${customer.name}.`,
    });
    try {
        const formattedPhoneNumber = customer.phone_number.startsWith('0') 
            ? `62${customer.phone_number.substring(1)}` 
            : customer.phone_number.replace(/[^0-9]/g, '');
        const whatsappUrl = `https://wa.me/${formattedPhoneNumber}`;

        const message = getNotificationMessage(customer, template);
        const { audioDataUri } = await generateCustomerVoicenote({ text: message });

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

  const handleSetReminder = (customerId: string, customerName: string, date: Date | undefined, note: string) => {
    if (!date) {
      toast({ title: 'Gagal', description: 'Silakan pilih tanggal pengingat.', variant: 'destructive' });
      return;
    }
    const newTask: ScheduledTask = {
      id: `${customerId}-${date.toISOString()}`,
      customerId,
      customerName,
      date: date.toISOString(),
      note,
      isCompleted: false,
    };

    setTasks(prevTasks => {
      // Avoid duplicate tasks
      const taskExists = prevTasks.some(task => task.id === newTask.id);
      if (taskExists) {
        toast({ title: 'Info', description: 'Pengingat untuk nasabah ini di tanggal tersebut sudah ada.', className: 'bg-accent/30 border-accent/50' });
        return prevTasks;
      }
      return [...prevTasks, newTask];
    });

    toast({ title: 'Sukses', description: `Pengingat untuk ${customerName} telah diatur.` });
  };
  
  const handleToggleTask = (taskId: string) => {
    setTasks(tasks => tasks.map(task => 
      task.id === taskId ? { ...task, isCompleted: !task.isCompleted } : task
    ));
  };
  
  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks => tasks.filter(task => task.id !== taskId));
    toast({ title: 'Pengingat Dihapus', variant: 'destructive' });
  };
  
  const handleNavigateToCustomer = (customerId: string) => {
    const row = customerRowsRef.current[customerId];
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      row.classList.add('animate-pulse', 'bg-accent/30');
      setTimeout(() => {
        row.classList.remove('animate-pulse', 'bg-accent/30');
      }, 3000);
    } else {
      toast({ title: 'Gagal', description: 'Nasabah tidak ditemukan di tabel saat ini.', variant: 'destructive' });
    }
  };
  
  const todaysTasks = React.useMemo(() => {
    const today = startOfToday();
    return tasks.filter(task => isSameDay(parseISO(task.date), today));
  }, [tasks]);


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
      // For bulk notifications, we default to the standard 'jatuh-tempo' template.
      // A more advanced implementation could involve a dialog to select the template for all.
      handleSendNotification(customer, 'jatuh-tempo');
    });

    setSelectedCustomers(new Set());
  };
  
  const priorityVariantMap: Record<Customer['priority'], VariantProps<typeof Badge>['variant']> = {
      tinggi: 'destructive',
      sedang: 'secondary',
      rendah: 'outline',
      none: 'outline',
  };

  const segmentVariantMap: Record<Customer['segment'], VariantProps<typeof Badge>['variant']> = {
      'Platinum': 'default',
      'Reguler': 'secondary',
      'Berisiko': 'destructive',
      'Potensi Churn': 'outline',
      'none': 'outline',
  };
  
  const ReminderPopoverContent = ({ customerId, customerName }: { customerId: string, customerName: string }) => {
    const [date, setDate] = React.useState<Date | undefined>();
    const [note, setNote] = React.useState('');

    return (
        <PopoverContent className="w-auto p-4 space-y-4">
            <p className="font-semibold text-center">Jadwalkan Tindak Lanjut</p>
            <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                disabled={(date) => date < startOfToday()}
            />
            <Input 
                placeholder="Catatan singkat (e.g., janji bayar)" 
                value={note}
                onChange={(e) => setNote(e.target.value)}
            />
            <Button 
                className="w-full" 
                onClick={() => handleSetReminder(customerId, customerName, date, note)}
                disabled={!date}
            >
                Setel Pengingat
            </Button>
        </PopoverContent>
    );
  };
  
  const profileData = upcProfiles[userUpc] || upcProfiles['N/A'];

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
       {activeVoicenote && (
          <VoicenotePreviewDialog
            isOpen={!!activeVoicenote}
            onClose={() => setActiveVoicenote(null)}
            audioDataUri={activeVoicenote.audioDataUri}
            whatsappUrl={activeVoicenote.whatsappUrl}
            customerName={activeVoicenote.customerName}
            onConfirm={() => {
                window.open(activeVoicenote.whatsappUrl, '_blank');
                setNotificationsSent(prev => prev + 1);
            }}
          />
        )}
      {auctionRiskData && (
        <AuctionRiskDialog
          isOpen={!!auctionRiskData}
          onClose={() => setAuctionRiskData(null)}
          data={auctionRiskData}
        />
      )}
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
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center">
            <h1 className="text-2xl font-bold tracking-tight font-headline">Customer Intelligence Dashboard</h1>
        </div>
        
        <div className="grid gap-6 lg:grid-cols-3">
          {/* UPC Profile Card */}
          <Card className="lg:col-span-2">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-6 w-6 text-primary" />
                    Profil {profileData.name}
                  </CardTitle>
                  <CardDescription>{profileData.description}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold">Informasi Cabang</h4>
                        <div className="flex items-start gap-3 text-sm">
                            <MapPin className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                            <span>{profileData.address}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span>{profileData.phone}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span>{profileData.operatingHours}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold">Informasi Tambahan</h4>
                         <div className="flex items-start gap-3 text-sm p-3 bg-accent/10 rounded-lg border border-accent/20">
                            <Megaphone className="h-4 w-4 mt-1 text-accent-foreground flex-shrink-0" />
                            <div>
                                <p className="font-medium text-accent-foreground">Pengumuman Internal:</p>
                                <p className="text-muted-foreground">{profileData.announcement}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 text-sm p-3 bg-primary/5 rounded-lg border border-primary/20">
                            <Star className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                            <div>
                                <p className="font-medium text-primary">Produk Unggulan Bulan Ini:</p>
                                <p className="text-muted-foreground">{profileData.featuredProduct}</p>
                            </div>
                        </div>
                      </div>
                  </div>
                  <div className="rounded-lg overflow-hidden border aspect-video">
                       {profileData.mapUrl ? (
                         <iframe
                            src={profileData.mapUrl}
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            allowFullScreen={false}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                        ></iframe>
                       ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                            Peta tidak tersedia
                        </div>
                       )}
                  </div>
              </CardContent>
          </Card>

          {/* Total Customers Card */}
          <Card className="lg:col-span-1 flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Nasabah</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{customers.length}</div>
                  <p className="text-xs text-muted-foreground">Jumlah nasabah aktif di {userUpc === 'all' ? 'semua cabang' : profileData.name}</p>
              </CardContent>
          </Card>
        </div>
        
        {userUpc !== 'all' && (
          <div className="grid gap-6 md:grid-cols-2">
             {/* Staff Cards */}
              <Card>
                  <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                      <Avatar className="h-12 w-12">
                          <AvatarImage src={profileData.staff.penaksir.avatar} />
                          <AvatarFallback>{profileData.staff.penaksir.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                          <CardTitle className="text-lg">Penaksir Bertugas</CardTitle>
                          <p className="text-base font-semibold">{profileData.staff.penaksir.name}</p>
                      </div>
                  </CardHeader>
                   <CardContent>
                       <Badge variant={profileData.staff.penaksir.status === 'Online' ? 'default' : 'outline'} className={cn(profileData.staff.penaksir.status === 'Online' && 'bg-green-600/80')}>
                          {profileData.staff.penaksir.status}
                       </Badge>
                  </CardContent>
              </Card>
               <Card>
                  <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                       <Avatar className="h-12 w-12">
                          <AvatarImage src={profileData.staff.kasir.avatar} />
                          <AvatarFallback>{profileData.staff.kasir.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                          <CardTitle className="text-lg">Kasir Bertugas</CardTitle>
                          <p className="text-base font-semibold">{profileData.staff.kasir.name}</p>
                      </div>
                  </CardHeader>
                   <CardContent>
                        <Badge variant={profileData.staff.kasir.status === 'Online' ? 'default' : 'outline'} className={cn(profileData.staff.kasir.status === 'Online' && 'bg-green-600/80')}>
                          {profileData.staff.kasir.status}
                       </Badge>
                  </CardContent>
              </Card>
          </div>
        )}


        <Card>
            <CardContent className="p-4">
                 <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
                     <div className="flex-grow"></div>
                      <div className="flex items-center gap-2">
                         <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                            <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('table')}>
                                <List className="h-4 w-4" />
                                <span className="ml-2 hidden sm:inline">Table</span>
                            </Button>
                            <Button variant={viewMode === 'kanban' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('kanban')}>
                                <LayoutGrid className="h-4 w-4" />
                                <span className="ml-2 hidden sm:inline">Kanban</span>
                            </Button>
                        </div>
                        <Button onClick={handleAutoPrioritize} disabled={isPrioritizing} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                            {isPrioritizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                            Auto-Prioritize
                        </Button>
                        {viewMode === 'table' && (
                            <Button onClick={handleNotifySelected} disabled={selectedCustomers.size === 0}>
                                <Send className="mr-2 h-4 w-4" />
                                Notify Selected ({selectedCustomers.size})
                            </Button>
                        )}
                    </div>
                </div>

                {viewMode === 'kanban' ? (
                  <KanbanBoard customers={customers} setCustomers={setCustomers} />
                ) : (
                  <>
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
                                <TableRow 
                                    key={customer.id} 
                                    data-state={selectedCustomers.has(customer.id) ? 'selected' : ''}
                                    ref={(el) => customerRowsRef.current[customer.id] = el}
                                    className="transition-all duration-300"
                                >
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
                                    <TableCell className="space-x-1">
                                      <div className="flex items-center gap-1">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button size="sm" variant="outline"><ClipboardCopy className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => handleCopyMessage(customer, 'jatuh-tempo')}>Copy Pengingat</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleCopyMessage(customer, 'keterlambatan')}>Copy Keterlambatan</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleCopyMessage(customer, 'peringatan-lelang')}>Copy Peringatan Lelang</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                 <Button size="sm" variant="outline"><Bell className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => handleSendNotification(customer, 'jatuh-tempo')}>Kirim Pengingat</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleSendNotification(customer, 'keterlambatan')}>Kirim Keterlambatan</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleSendNotification(customer, 'peringatan-lelang')}>Kirim Peringatan Lelang</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button size="sm" disabled={isGeneratingVoicenote}>
                                                    {isGeneratingVoicenote ? <Loader2 className="h-4 w-4 animate-spin"/> : <Mic className="h-4 w-4" />}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => handleGenerateVoicenote(customer, 'jatuh-tempo')}>Buat VN Pengingat</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleGenerateVoicenote(customer, 'keterlambatan')}>Buat VN Keterlambatan</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleGenerateVoicenote(customer, 'peringatan-lelang')}>Buat VN Peringatan Lelang</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button size="sm" variant="outline">
                                                    <CalendarPlus className="h-4 w-4" />
                                                </Button>
                                            </PopoverTrigger>
                                            <ReminderPopoverContent customerId={customer.id} customerName={customer.name} />
                                        </Popover>
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
                </>
                )}
            </CardContent>
        </Card>
      </main>
    </div>
  );
}

    

    

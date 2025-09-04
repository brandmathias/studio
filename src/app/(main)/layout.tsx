
'use client';

import * as React from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { Scale, LogOut, LayoutDashboard, ClipboardList, ChevronDown, FileUp, FileText, FileSpreadsheet, History, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface User {
  name: string;
  email: string;
  avatar?: string;
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    const updateUser = () => {
        try {
          const storedUser = localStorage.getItem('loggedInUser');
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
        } catch (error) {
          console.error("Failed to parse user from localStorage", error);
        }
    };
    
    updateUser();

    // Listen for storage changes to update avatar across tabs
    window.addEventListener('storage', updateUser);
    return () => {
        window.removeEventListener('storage', updateUser);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('loggedInUser');
    router.push('/login');
  };
  
  const isJatuhTempoActive = pathname.startsWith('/pdf-broadcast') || pathname.startsWith('/xlsx-broadcast');

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
           <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-primary"
            >
            <Scale className="h-6 w-6" />
            <span className="font-headline text-lg">GadaiAlert</span>
          </button>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => router.push('/dashboard')}
                isActive={pathname.startsWith('/dashboard')}
                tooltip="Dashboard"
              >
                <LayoutDashboard />
                <span>Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => router.push('/tasks')}
                isActive={pathname.startsWith('/tasks')}
                tooltip="Lacak Tugas"
              >
                <ClipboardList />
                <span>Lacak Tugas</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Jatuh Tempo Broadcast Dropdown */}
             <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <button
                      className={cn(
                        'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 h-8',
                         isJatuhTempoActive && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                      )}
                    >
                      <FileUp />
                      <span>Jatuh Tempo Broadcast</span>
                      <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform duration-200" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="start" side="right" sideOffset={10}>
                    <DropdownMenuLabel>Pilih Jenis Broadcast</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/pdf-broadcast')}>
                      <FileText className="mr-2 h-4 w-4" />
                      <span>Gadaian Broadcast</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/xlsx-broadcast')}>
                       <FileSpreadsheet className="mr-2 h-4 w-4" />
                      <span>Angsuran Broadcast</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
            
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => router.push('/history')}
                isActive={pathname.startsWith('/history')}
                tooltip="Riwayat"
              >
                <History />
                <span>Riwayat</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar} alt={user?.name || 'User'} />
                  <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-medium">{user?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">
                    {user?.email || ''}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                 <DropdownMenuItem onClick={() => router.push('/profile')}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profil</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
         <header className="sticky top-0 h-16 items-center gap-4 border-b bg-background px-4 md:px-6 flex justify-between">
             <nav className="flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 text-lg font-semibold md:text-base text-primary"
              >
                <Scale className="h-6 w-6" />
                <span className="font-headline">GadaiAlert</span>
              </button>
            </nav>
            <div className="flex items-center">
              <Image 
                src="/PegadaianLogo.png"
                alt="Logo Pegadaian"
                width={120}
                height={40}
                priority
              />
            </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

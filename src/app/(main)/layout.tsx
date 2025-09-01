'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Scale, LogOut, TestTube2, LayoutDashboard, FileUp, ClipboardList, FileSpreadsheet } from 'lucide-react';
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

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    router.push('/login');
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" />
            <span className="font-headline text-lg">GadaiAlert</span>
          </div>
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
             <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => router.push('/pdf-broadcast')}
                isActive={pathname.startsWith('/pdf-broadcast')}
                tooltip="PDF Broadcast"
              >
                <FileUp />
                <span>PDF Broadcast</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => router.push('/xlsx-broadcast')}
                isActive={pathname.startsWith('/xlsx-broadcast')}
                tooltip="XLSX Broadcast"
              >
                <FileSpreadsheet />
                <span>XLSX Broadcast</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => router.push('/experiments')}
                isActive={pathname.startsWith('/experiments')}
                tooltip="Experiments"
              >
                <TestTube2 />
                <span>Experiments</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="https://placehold.co/40x40" alt="Admin" data-ai-hint="person portrait" />
                  <AvatarFallback>A</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-medium">Admin</p>
                  <p className="text-xs text-muted-foreground">
                    admin@pegadaian.co.id
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Admin Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}

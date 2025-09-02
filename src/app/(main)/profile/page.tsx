
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, Building, LogOut } from 'lucide-react';

interface UserProfile {
  name: string;
  email: string;
  upc: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = React.useState<UserProfile | null>(null);

  React.useEffect(() => {
    // Ensure this runs only on the client
    const storedUser = localStorage.getItem('loggedInUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      // If no user data, redirect to login
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('loggedInUser');
    router.push('/login');
  };

  if (!user) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center p-4">
        <p>Loading profile...</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8 bg-muted/20">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="items-center text-center">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage src={`https://placehold.co/100x100`} alt={user.name} data-ai-hint="person portrait" />
              <AvatarFallback className="text-3xl">{user.name?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <CardTitle className="text-2xl">{user.name}</CardTitle>
            <CardDescription>Detail Akun Anda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-background rounded-lg border">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                    <p className="text-sm text-muted-foreground">Nama Lengkap</p>
                    <p className="font-medium">{user.name}</p>
                </div>
            </div>
             <div className="flex items-center gap-4 p-3 bg-background rounded-lg border">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                    <p className="text-sm text-muted-foreground">Alamat Email</p>
                    <p className="font-medium">{user.email}</p>
                </div>
            </div>
             <div className="flex items-center gap-4 p-3 bg-background rounded-lg border">
                <Building className="h-5 w-5 text-muted-foreground" />
                <div>
                    <p className="text-sm text-muted-foreground">Unit/Cabang</p>
                    <p className="font-medium">{user.upc === 'all' ? 'Semua Cabang (Super Admin)' : user.upc}</p>
                </div>
            </div>
             <Button onClick={handleLogout} variant="destructive" className="w-full mt-6">
              <LogOut className="mr-2 h-4 w-4" />
              Keluar
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

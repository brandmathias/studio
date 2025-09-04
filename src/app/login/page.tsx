
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Compass, Loader2, Eye, EyeOff } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(1, { message: 'Password cannot be empty.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const allowedAccounts = [
  { email: 'admin.wanea@pegadaian.co.id', password: 'UpcWanea*0', name: 'Admin Wanea', upc: 'Pegadaian Wanea', avatar: '' },
  { email: 'admin.ranotana@pegadaian.co.id', password: 'UpcRanotana*0', name: 'Admin Ranotana', upc: 'Pegadaian Ranotana', avatar: '' },
];


export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  
  const onSubmit = (data: LoginFormValues) => {
    setIsLoading(true);

    const validUser = allowedAccounts.find(
      (account) => account.email.toLowerCase() === data.email.toLowerCase() && account.password === data.password
    );

    setTimeout(() => {
      if (validUser) {
          localStorage.setItem('isLoggedIn', 'true');
          
          // Always set the new user's data, overwriting any previous user data.
          // This ensures the profile page always shows the correct logged-in user.
          localStorage.setItem('loggedInUser', JSON.stringify(validUser));

          toast({
            title: 'Login Successful',
            description: `Welcome back, ${validUser.name}!`,
          });
          router.push('/dashboard');
      } else {
          toast({
            title: 'Login Failed',
            description: 'Invalid email or password. Please try again.',
            variant: 'destructive',
          });
      }
      setIsLoading(false);
    }, 1500);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-2xl animate-in fade-in-0 slide-in-from-bottom-10 duration-500">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center items-center gap-2 mb-2">
            <Compass className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-headline">NAVIGA Admin</CardTitle>
          <CardDescription>Enter your credentials to access the dashboard</CardDescription>
        </CardHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                    <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input placeholder="user@pegadaian.co.id" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <Input 
                                    type={showPassword ? "text" : "password"} 
                                    placeholder="••••••••" 
                                    {...field} 
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Log in
                    </Button>
                </CardFooter>
            </form>
        </Form>
      </Card>
    </main>
  );
}

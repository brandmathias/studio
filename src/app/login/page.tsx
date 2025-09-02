
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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Scale, Loader2 } from 'lucide-react';
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
  { email: 'admin.wanena@pegadaian.co.id', password: 'WaneaPegadaian2024!', name: 'Admin Wanea' },
  { email: 'admin.ranotana@pegadaian.co.id', password: 'RanotanaPastiBisa#', name: 'Admin Ranotana' },
  { email: 'brandomathiasz13@gmail.com', password: 'BrandoM13@Studio', name: 'Brando Mathiasz' },
  { email: 'saviopalendeng506@gmail.com', password: 'SavioP506$Gadai', name: 'Savio Palendeng' },
];


export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

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
          // Store user info to be used across the app
          localStorage.setItem('loggedInUser', JSON.stringify({ name: validUser.name, email: validUser.email }));
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
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center items-center gap-2 mb-2">
            <Scale className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-headline">GadaiAlert Admin</CardTitle>
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
                            <Input type="password" placeholder="••••••••" {...field} />
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

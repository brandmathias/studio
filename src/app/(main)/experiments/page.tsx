'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function ExperimentsPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center">
          <h1 className="text-2xl font-bold tracking-tight font-headline">Experiments</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Welcome to the Lab</CardTitle>
          <CardDescription>
            This is your dedicated space for trying out new ideas and features. Feel free to build, test, and innovate!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>You can start building your experimental components here.</p>
        </CardContent>
      </Card>
    </main>
  );
}

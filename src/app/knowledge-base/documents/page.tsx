import type { Metadata } from 'next';
import Link from 'next/link';
import { Home, Search, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { DocumentLibrary } from '../components/document-library';

export const metadata: Metadata = {
  title: 'Document Library | Knowledge Base & Prompt Management',
  description: 'Browse and manage your knowledge base documents',
};

export default function DocumentsPage() {
  return (
    <div className="container mx-auto py-10 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/">
              <Home className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Document Library</h1>
        </div>
        <Button asChild className="rounded-full">
          <Link href="/upload">
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Link>
        </Button>
      </div>

      <Card className="border-2 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle>Knowledge Base Documents</CardTitle>
          <CardDescription>Browse and manage your uploaded documents</CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search documents..." className="pl-8 bg-white/80" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DocumentLibrary />
        </CardContent>
      </Card>
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { Home } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { DocumentUploader } from '../components/document-uploader';

export const metadata: Metadata = {
  title: 'Upload Document | Knowledge Base & Prompt Management',
  description: 'Upload documents to your knowledge base',
};

export default function UploadPage() {
  return (
    <div className="container mx-auto py-10 px-4 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/">
              <Home className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Upload Document</h1>
        </div>
      </div>

      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
          <CardTitle className="text-2xl">Add to Knowledge Base</CardTitle>
          <CardDescription className="text-base">
            Upload documents to enhance your AI agents' knowledge. Supported formats: PDF, DOCX, TXT, CSV.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <DocumentUploader />
        </CardContent>
      </Card>
    </div>
  );
}

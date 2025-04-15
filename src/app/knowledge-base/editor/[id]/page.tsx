import type { Metadata } from 'next';
import Link from 'next/link';
import { Home } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { PromptEditor } from '../../components/prompt-editor';

export const metadata: Metadata = {
  title: 'Edit Prompt | Knowledge Base & Prompt Management',
  description: 'Edit an existing prompt for your AI agents',
};

interface EditorPageProps {
  params: {
    id: string
  }
}

export default function EditorPage({ params }: EditorPageProps) {
  const { id } = params;
  
  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/knowledge-base">
              <Home className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Edit Prompt</h1>
        </div>
      </div>

      {/* Pass the prompt ID to the editor component */}
      <PromptEditor promptId={id} />
    </div>
  );
}
'use client';
import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, MessageSquare, PlusCircle, Upload } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations } from '@/i18n/translations-context';

import { PromptCarousel } from './components/prompt-carousel';
import { DocumentCarousel } from './components/document-carousel';

// export const metadata: Metadata = {
//   title: "Knowledge Base & Prompt Management",
//   description: "Upload documents, create custom prompts, and connect them to AI agents",
// }

export default function HomePage() {
  const { t } = useTranslations();

  return (
    <div className="container mx-auto py-10 px-4 space-y-10">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight text-amber-700">
          {t('knowledgeBase.title')}
        </h1>
        <p className="text-muted-foreground text-lg">
          {t('knowledgeBase.description')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Link href="/knowledge-base/upload" className="group">
          <div className="relative overflow-hidden rounded-xl border-2 border-dashed p-8 h-60 flex flex-col items-center justify-center text-center transition-all duration-300 hover:border-amber-500 hover:bg-amber-50 group-hover:shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-slate-50 opacity-50 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative z-10">
              <div className="rounded-full bg-amber-100 p-4 mx-auto mb-4 transition-transform duration-300 group-hover:scale-110">
                <Upload className="h-8 w-8 text-amber-600" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">{t('knowledgeBase.uploadDocument.title')}</h2>
              <p className="text-muted-foreground">{t('knowledgeBase.uploadDocument.description')}</p>
            </div>
          </div>
        </Link>

        <Link href="/knowledge-base/editor" className="group">
          <div className="relative overflow-hidden rounded-xl border-2 border-dashed p-8 h-60 flex flex-col items-center justify-center text-center transition-all duration-300 hover:border-amber-500 hover:bg-amber-50 group-hover:shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-slate-50 opacity-50 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative z-10">
              <div className="rounded-full bg-amber-100 p-4 mx-auto mb-4 transition-transform duration-300 group-hover:scale-110">
                <PlusCircle className="h-8 w-8 text-amber-600" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">{t('knowledgeBase.createPrompt.title')}</h2>
              <p className="text-muted-foreground">{t('knowledgeBase.createPrompt.description')}</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="max-w-6xl mx-auto">
        <Tabs defaultValue="prompts" className="w-full">
          <div className="flex justify-center mb-6">
            <TabsList className="h-12 p-1 bg-gradient-to-r from-amber-50 to-slate-50 rounded-full">
              <TabsTrigger
                value="prompts"
                className="flex-1 min-w-[140px] md:min-w-[180px] text-base py-2 px-6 rounded-full data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-300"
              >
                <MessageSquare className="mr-2 h-4 w-4 text-amber-500" />
                {t('knowledgeBase.tabs.prompts')}
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                className="flex-1 min-w-[140px] md:min-w-[180px] text-base py-2 px-6 rounded-full data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-300"
              >
                <FileText className="mr-2 h-4 w-4 text-amber-500" />
                {t('knowledgeBase.tabs.documents')}
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="prompts" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
            <PromptCarousel />
          </TabsContent>
          <TabsContent value="documents" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
            <DocumentCarousel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

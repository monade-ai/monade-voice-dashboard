'use client';

import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';

import { DashboardHeader } from '@/components/dashboard-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVobizWhatsapp } from '@/app/hooks/use-vobiz-whatsapp';

import { ChannelsTab } from './components/channels-tab';
import { TemplatesTab } from './components/templates-tab';

export default function WhatsAppSetupPage() {
  const whatsapp = useVobizWhatsapp();
  const [tab, setTab] = useState('channels');

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <DashboardHeader />
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-10 pb-24">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-border/40 pb-8">
          <div className="space-y-2">
            <h1 className="text-5xl font-medium tracking-tighter text-foreground flex items-center gap-3">
              <MessageCircle className="text-primary" size={40} />
              WhatsApp
            </h1>
            <p className="text-muted-foreground text-sm font-medium">
              Connect WhatsApp Business numbers and manage message templates.
            </p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="bg-muted p-1 rounded-md">
            <TabsTrigger value="channels">Connected Numbers</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>
          <TabsContent value="channels" className="mt-0">
            <ChannelsTab whatsapp={whatsapp} />
          </TabsContent>
          <TabsContent value="templates" className="mt-0">
            <TemplatesTab whatsapp={whatsapp} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

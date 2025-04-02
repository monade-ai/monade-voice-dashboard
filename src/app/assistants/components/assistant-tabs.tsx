'use client';

import { useState, Suspense } from 'react';
import { 
  Bot, 
  Mic, 
  Settings, 
  Terminal, 
  LineChart, 
  Volume2,
  Trash2 
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAssistants } from '../../hooks/use-assistants-context';
import CostDisplay from './cost-display';
import ModelTab from './tab-views/model-tab';
import { Button } from '@/components/ui/button';
import DeleteConfirmationModal from '../delete-confirmation-modal';

// Placeholder components for other tabs that will be implemented later
const PlaceholderTab = ({ title }: { title: string }) => (
  <div className="p-8 text-center text-gray-500">
    <p>{title} tab content will be implemented later</p>
  </div>
);

export default function AssistantTabs() {
  const { currentAssistant } = useAssistants();
  const [activeTab, setActiveTab] = useState('model');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  if (!currentAssistant) {
    return (
      <div className="p-8 text-center text-gray-500">
        Select an assistant or create a new one to get started
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6">
      {/* Metrics display (Cost and Latency) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CostDisplay costPerMinute={currentAssistant.costPerMin || 0.11} totalCost={currentAssistant.totalCost || 0} />
        
        <div className="relative w-full p-4 bg-white rounded-lg border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-1">
              <span className="text-gray-600">Latency</span>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400">
                <path d="M7.49991 0.876892C3.84222 0.876892 0.877075 3.84204 0.877075 7.49972C0.877075 11.1574 3.84222 14.1226 7.49991 14.1226C11.1576 14.1226 14.1227 11.1574 14.1227 7.49972C14.1227 3.84204 11.1576 0.876892 7.49991 0.876892ZM1.82707 7.49972C1.82707 4.36671 4.36689 1.82689 7.49991 1.82689C10.6329 1.82689 13.1727 4.36671 13.1727 7.49972C13.1727 10.6327 10.6329 13.1726 7.49991 13.1726C4.36689 13.1726 1.82707 10.6327 1.82707 7.49972ZM8.24992 4.49999C8.24992 4.9142 7.91413 5.24999 7.49992 5.24999C7.08571 5.24999 6.74992 4.9142 6.74992 4.49999C6.74992 4.08577 7.08571 3.74999 7.49992 3.74999C7.91413 3.74999 8.24992 4.08577 8.24992 4.49999ZM6.00003 5.99999H6.50003H7.50003C7.77618 5.99999 8.00003 6.22384 8.00003 6.49999V9.89999H8.50003H9.00003V10.9H8.50003H7.50003H6.50003H6.00003V9.89999H6.50003H7.00003V6.99999H6.50003H6.00003V5.99999Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
              </svg>
            </div>
          </div>
          
          <div className="w-full text-center">
            <div className="font-mono font-bold text-3xl text-cyan-600">
              ~{currentAssistant.latencyMs || 1800} <span className="text-lg text-gray-500">ms</span>
            </div>
          </div>
          
          {/* Visual latency indicator */}
          <div className="mt-4 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="flex h-full">
              <div className="bg-fuchsia-400 h-full" style={{ width: '25%' }}></div>
              <div className="bg-blue-400 h-full" style={{ width: '30%' }}></div>
              <div className="bg-green-400 h-full" style={{ width: '20%' }}></div>
              <div className="bg-amber-400 h-full" style={{ width: '25%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex bg-gray-50 p-1 rounded-md">
          <TabsTrigger value="model" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Bot className="h-4 w-4 mr-2" />
            Model
          </TabsTrigger>
          <TabsTrigger value="transcriber" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Mic className="h-4 w-4 mr-2" />
            Transcriber
          </TabsTrigger>
          <TabsTrigger value="voice" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Volume2 className="h-4 w-4 mr-2" />
            Voice
          </TabsTrigger>
          <TabsTrigger value="functions" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Terminal className="h-4 w-4 mr-2" />
            Functions
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Settings className="h-4 w-4 mr-2" />
            Advanced
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <LineChart className="h-4 w-4 mr-2" />
            Analysis
          </TabsTrigger>
        </TabsList>

        {/* Tab contents with Suspense for each tab */}
        <TabsContent value="model" className="mt-6">
          <Suspense fallback={<div className="p-4 text-center">Loading model options...</div>}>
            <ModelTab />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="transcriber" className="mt-6">
          <PlaceholderTab title="Transcriber" />
        </TabsContent>
        
        <TabsContent value="voice" className="mt-6">
          <PlaceholderTab title="Voice" />
        </TabsContent>
        
        <TabsContent value="functions" className="mt-6">
          <PlaceholderTab title="Functions" />
        </TabsContent>
        
        <TabsContent value="advanced" className="mt-6">
          <PlaceholderTab title="Advanced" />
        </TabsContent>
        
        <TabsContent value="analysis" className="mt-6">
          <PlaceholderTab title="Analysis" />
        </TabsContent>
      </Tabs>

      {/* Publish button */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button 
          variant="outline" 
          className="border-gray-300"
          onClick={() => setIsDeleteModalOpen(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Discard
        </Button>
        <Button className="bg-amber-500 hover:bg-amber-600 text-white">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2">
            <path d="M7.49991 0.876892C3.84222 0.876892 0.877075 3.84204 0.877075 7.49972C0.877075 11.1574 3.84222 14.1226 7.49991 14.1226C11.1576 14.1226 14.1227 11.1574 14.1227 7.49972C14.1227 3.84204 11.1576 0.876892 7.49991 0.876892ZM1.82707 7.49972C1.82707 4.36671 4.36689 1.82689 7.49991 1.82689C10.6329 1.82689 13.1727 4.36671 13.1727 7.49972C13.1727 10.6327 10.6329 13.1726 7.49991 13.1726C4.36689 13.1726 1.82707 10.6327 1.82707 7.49972ZM7.50003 4.49999C7.77618 4.49999 8.00003 4.72383 8.00003 4.99999V7.49999H10.5C10.7762 7.49999 11 7.72383 11 7.99999C11 8.27614 10.7762 8.49999 10.5 8.49999H8.00003V11C8.00003 11.2761 7.77618 11.5 7.50003 11.5C7.22388 11.5 7.00003 11.2761 7.00003 11V8.49999H4.50003C4.22388 8.49999 4.00003 8.27614 4.00003 7.99999C4.00003 7.72383 4.22388 7.49999 4.50003 7.49999H7.00003V4.99999C7.00003 4.72383 7.22388 4.49999 7.50003 4.49999Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
          </svg>
          Publish
        </Button>
        
        {/* Delete confirmation modal */}
        <DeleteConfirmationModal 
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
        />
      </div>
    </div>
  );
}
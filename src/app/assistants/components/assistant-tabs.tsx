'use client';

import { useState, Suspense, useRef, useEffect } from 'react';
import { 
  Bot, 
  Mic, 
  Settings, 
  Terminal, 
  Volume2,
  Trash2,
  Calendar,
  BarChart3,
  InfoIcon,
} from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

import { useAssistants } from '../../hooks/use-assistants-context';
import DeleteConfirmationModal from '../delete-confirmation-modal';

import CostDisplay from './cost-display';
import ModelTab from './tab-views/model-tab';
import AssistantDualButton from './assistant-dual-button';

import CallScheduling from './tab-views/call-management/call-scheduling';
import CallInsights from './tab-views/call-management/call-insights';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Modern, animated latency card
function LatencyCard({ latencyMs }: { latencyMs: number }) {
  // Animate the latency value on change
  const [displayLatency, setDisplayLatency] = useState(latencyMs);
  const prevLatency = useRef(latencyMs);

  useEffect(() => {
    if (latencyMs !== prevLatency.current) {
      let frame: number;
      const start = prevLatency.current;
      const end = latencyMs;
      const duration = 400;
      const startTime = performance.now();

      function animate(now: number) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setDisplayLatency(start + (end - start) * progress);
        if (progress < 1) {
          frame = requestAnimationFrame(animate);
        } else {
          prevLatency.current = end;
        }
      }
      frame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(frame);
    }
  }, [latencyMs]);

  // Bar width and color based on latency
  const barWidth = Math.min(100, Math.max(10, (latencyMs / 3000) * 100));
  const barColor =
    latencyMs < 1000
      ? "from-cyan-400 to-emerald-500"
      : latencyMs < 2000
      ? "from-amber-400 to-yellow-500"
      : "from-fuchsia-500 to-pink-500";

  return (
    <div className="relative w-full p-4 bg-white rounded-xl border border-gray-100 shadow-md transition-transform duration-200 hover:scale-[1.025] hover:shadow-lg group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-1">
          <span className="text-gray-700 font-semibold tracking-wide uppercase text-xs">
            Latency
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <InfoIcon className="h-4 w-4 text-gray-400 group-hover:text-cyan-500 transition-colors" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Estimated average response latency in milliseconds</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div className="w-full text-center">
        <div
          className="font-extrabold text-4xl bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-amber-500 bg-clip-text text-transparent transition-all duration-300"
          style={{ letterSpacing: "0.01em" }}
        >
          ~{Math.round(displayLatency)}
          <span className="text-lg text-gray-400 font-medium ml-1">ms</span>
        </div>
      </div>
      {/* Animated visual latency indicator */}
      <div className="mt-4 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 bg-gradient-to-r ${barColor}`}
          style={{
            width: `${barWidth}%`,
            minWidth: "10%",
            boxShadow: "0 0 8px 0 rgba(34,211,238,0.18)",
          }}
        ></div>
      </div>
    </div>
  );
}

// Placeholder for tabs not yet implemented
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
        <CostDisplay costPerMinute={currentAssistant.costPerMin || 0.11} />
        <LatencyCard latencyMs={currentAssistant.latencyMs || 1800} />
      </div>

      {/* Tab navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="relative flex items-center">
          <TabsList className="flex bg-gray-50 p-1 rounded-full shadow-sm gap-1 relative overflow-x-auto">
            <TabsTrigger
              value="model"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full transition-all duration-200 font-medium text-gray-600 data-[state=active]:bg-white data-[state=active]:text-cyan-700 data-[state=active]:shadow-lg data-[state=active]:font-semibold hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <Bot className="h-4 w-4" />
              Model
            </TabsTrigger>
            <TabsTrigger
              value="transcriber"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full transition-all duration-200 font-medium text-gray-600 data-[state=active]:bg-white data-[state=active]:text-cyan-700 data-[state=active]:shadow-lg data-[state=active]:font-semibold hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <Mic className="h-4 w-4" />
              Transcriber
            </TabsTrigger>
            <TabsTrigger
              value="voice"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full transition-all duration-200 font-medium text-gray-600 data-[state=active]:bg-white data-[state=active]:text-cyan-700 data-[state=active]:shadow-lg data-[state=active]:font-semibold hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <Volume2 className="h-4 w-4" />
              Voice
            </TabsTrigger>
            <TabsTrigger
              value="functions"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full transition-all duration-200 font-medium text-gray-600 data-[state=active]:bg-white data-[state=active]:text-cyan-700 data-[state=active]:shadow-lg data-[state=active]:font-semibold hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <Terminal className="h-4 w-4" />
              Functions
            </TabsTrigger>
            <TabsTrigger
              value="advanced"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full transition-all duration-200 font-medium text-gray-600 data-[state=active]:bg-white data-[state=active]:text-cyan-700 data-[state=active]:shadow-lg data-[state=active]:font-semibold hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <Settings className="h-4 w-4" />
              Advanced
            </TabsTrigger>
            <TabsTrigger
              value="scheduling"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full transition-all duration-200 font-medium text-gray-600 data-[state=active]:bg-white data-[state=active]:text-cyan-700 data-[state=active]:shadow-lg data-[state=active]:font-semibold hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <Calendar className="h-4 w-4" />
              Scheduling
            </TabsTrigger>
            <TabsTrigger
              value="insights"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full transition-all duration-200 font-medium text-gray-600 data-[state=active]:bg-white data-[state=active]:text-cyan-700 data-[state=active]:shadow-lg data-[state=active]:font-semibold hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <BarChart3 className="h-4 w-4" />
              Insights
            </TabsTrigger>
            {/* Animated active tab indicator */}
            <span
              className="absolute left-0 bottom-0 h-1 rounded-full bg-cyan-400 transition-all duration-300"
              style={{
                width: `calc(100% / 7)`,
                transform: `translateX(${['model','transcriber','voice','functions','advanced','scheduling','insights'].indexOf(activeTab) * 100}%)`,
                opacity: 0.7,
              }}
              aria-hidden="true"
            />
          </TabsList>
          {/* Move test call dual button next to tabs */}
          <div className="ml-4 flex-shrink-0">
            <AssistantDualButton assistant={currentAssistant} />
          </div>
        </div>

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
        
        <TabsContent value="scheduling" className="mt-6">
          <CallScheduling />
        </TabsContent>
        
        <TabsContent value="insights" className="mt-6">
          <CallInsights />
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

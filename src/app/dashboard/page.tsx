'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Phone,
  AudioWaveform,
  TrendingUp,
  Layers,
  PhoneCall,
  ChevronLeft,
  ChevronRight,
  User,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

import { useDashboardData } from '@/app/hooks/use-dashboard-data';
import { useCredits } from '@/app/hooks/use-credits';
import { useTranscripts, Transcript } from '@/app/hooks/use-transcripts';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Button } from '@/components/ui/button';
import { TranscriptViewer } from '@/components/transcript-viewer';

import { DashboardSkeleton } from './components/loading-states';
import { GreetingSection } from './components/greeting-section';
import { FeatureCardsGrid } from './components/feature-card';
import { WalletNav } from './components/wallet-nav';

// Helper to format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  if (isToday) {
    return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

// Transcript Row Component
const TranscriptRow = ({ transcript, onView }: { transcript: Transcript; onView: () => void }) => {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
      <td className="py-3 px-4 text-sm text-gray-900 font-medium">{transcript.call_id}</td>
      <td className="py-3 px-4 text-sm text-gray-500">{transcript.phone_number}</td>
      <td className="py-3 px-4">
        <span className="px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-600">
          Completed
        </span>
      </td>
      <td className="py-3 px-4 text-sm text-gray-400">{formatDate(transcript.created_at)}</td>
      <td className="py-3 px-4">
        <button
          onClick={onView}
          className="text-amber-600 hover:text-amber-700 flex items-center gap-1 hover:underline"
        >
          <ExternalLink className="w-4 h-4" />
          View
        </button>
      </td>
    </tr>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null);
  const [showConnectedOnly, setShowConnectedOnly] = useState(false);
  const callsPerPage = 5;

  const {
    metrics,
    loading,
  } = useDashboardData();

  // Use real credits from API
  const { credits, loading: creditsLoading } = useCredits();

  // Use real transcripts from API
  const { transcripts, loading: transcriptsLoading } = useTranscripts();

  // Handle Talk to AI
  const handleTalkToAI = () => {
    toast.info('AI Assistant coming soon!');
  };

  // Feature cards with design-matching icons
  const features = [
    {
      icon: AudioWaveform,
      title: 'Voice Agents',
      description: 'Create and manage AI agents.',
      onClick: () => router.push('/assistants'),
    },
    {
      icon: TrendingUp,
      title: 'Analytics',
      description: 'Track performance metrics.',
      onClick: () => router.push('/analytics'),
    },
    {
      icon: Layers,
      title: 'Knowledge Base',
      description: "Build your AI's intelligence.",
      onClick: () => router.push('/knowledge-base'),
    },
    {
      icon: PhoneCall,
      title: 'Phone Numbers',
      description: 'Manage virtual numbers.',
      onClick: () => router.push('/phone-numbers'),
    },
  ];

  // Filter and paginate transcripts
  const filteredTranscripts = showConnectedOnly
    ? transcripts.filter(t => t.has_conversation === true) // Connected = has actual conversation
    : transcripts;
  const indexOfLastCall = currentPage * callsPerPage;
  const indexOfFirstCall = indexOfLastCall - callsPerPage;
  const currentTranscripts = filteredTranscripts.slice(indexOfFirstCall, indexOfLastCall);
  const totalPages = Math.ceil(filteredTranscripts.length / callsPerPage);

  // Calculate wallet data - credits are in rupees, 1 credit = 1 rupee, 12 rupees/min
  const walletBalance = credits?.available_credits || 0;
  const minutesRemaining = Math.floor(walletBalance / 12); // ₹12 per minute

  if (loading.initial) {
    return <DashboardSkeleton />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-white">
        {/* Top Nav */}
        <div className="border-b border-gray-100 sticky top-0 z-10 bg-white">
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <span className="text-gray-900 font-medium">Home</span>
              <span className="text-gray-400 hover:text-gray-600 cursor-pointer">Voices</span>
              <span className="text-gray-400 hover:text-gray-600 cursor-pointer">Agents</span>
            </div>
            <div className="flex items-center gap-3 pr-4">
              <WalletNav
                balance={walletBalance}
                minutesRemaining={minutesRemaining}
              />
              <button
                onClick={() => router.push('/account')}
                className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center hover:bg-amber-200 transition-colors"
              >
                <User className="w-5 h-5 text-amber-700" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 py-6">
          {/* Greeting */}
          <GreetingSection userName="User" onTalkToAI={handleTalkToAI} />

          {/* Feature Cards */}
          <FeatureCardsGrid features={features} />

          {/* Quick Stats */}
          <h3 className="text-base font-semibold text-gray-900 mb-3">Quick Stats</h3>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">Total Agents</span>
                <Users className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {metrics?.agents?.total || 0}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">Total Calls</span>
                <Phone className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {transcripts.length}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">Available Credits</span>
                <TrendingUp className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {creditsLoading ? '...' : `₹${walletBalance.toLocaleString()}`}
              </span>
            </div>
          </div>

          {/* Recent Calls / Transcripts */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900">Recent Calls</h3>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className={`text-xs font-medium ${showConnectedOnly ? 'text-green-600' : 'text-gray-500'}`}>
                Connected Only
              </span>
              <div
                onClick={() => { setShowConnectedOnly(!showConnectedOnly); setCurrentPage(1); }}
                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${showConnectedOnly ? 'bg-green-500' : 'bg-gray-300'
                  }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${showConnectedOnly ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                />
              </div>
            </label>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {transcriptsLoading ? (
              <div className="p-8 text-center text-gray-500">Loading call logs...</div>
            ) : transcripts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No call logs yet</div>
            ) : (
              <>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-2 px-4 text-left text-xs font-medium text-gray-500">Call ID</th>
                      <th className="py-2 px-4 text-left text-xs font-medium text-gray-500">Phone Number</th>
                      <th className="py-2 px-4 text-left text-xs font-medium text-gray-500">Status</th>
                      <th className="py-2 px-4 text-left text-xs font-medium text-gray-500">Date</th>
                      <th className="py-2 px-4 text-left text-xs font-medium text-gray-500">Transcript</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentTranscripts.map((transcript) => (
                      <TranscriptRow
                        key={transcript.id}
                        transcript={transcript}
                        onView={() => setSelectedTranscript(transcript)}
                      />
                    ))}
                  </tbody>
                </table>
                {totalPages > 1 && (
                  <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      Showing {indexOfFirstCall + 1} to {Math.min(indexOfLastCall, transcripts.length)} of {transcripts.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => p - 1)}
                        disabled={currentPage === 1}
                        className="h-8"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm font-medium px-2">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => p + 1)}
                        disabled={currentPage >= totalPages}
                        className="h-8"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Transcript Viewer Modal */}
      {selectedTranscript && (
        <TranscriptViewer
          transcriptUrl={selectedTranscript.transcript_url}
          callId={selectedTranscript.call_id}
          onClose={() => setSelectedTranscript(null)}
        />
      )}
    </ErrorBoundary>
  );
}

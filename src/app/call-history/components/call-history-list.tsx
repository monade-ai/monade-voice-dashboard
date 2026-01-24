/**
 * CallHistoryList
 * Displays a list of call logs from the transcripts API with transcript viewer.
 */

'use client';
import React, { useState } from 'react';
import { Phone, ExternalLink, MessageSquare, Calendar, Loader2 } from 'lucide-react';

import { useTranslations } from '@/i18n/translations-context';
import { useTranscripts, Transcript } from '@/app/hooks/use-transcripts';
import { TranscriptViewer } from '@/components/transcript-viewer';

// Format date helper
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

// Call History Item Component
const CallHistoryItem = ({
  transcript,
  onViewTranscript,
}: {
  transcript: Transcript;
  onViewTranscript: () => void;
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <Phone className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{transcript.call_id}</p>
            <p className="text-sm text-gray-500">{transcript.phone_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            {transcript.has_conversation === true ? (
              <span className="px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-600">
                ✓ Connected
              </span>
            ) : transcript.has_conversation === false ? (
              <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-500">
                No Conversation
              </span>
            ) : (
              <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-50 text-yellow-600">
                Completed
              </span>
            )}
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(transcript.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onViewTranscript}
              className="flex items-center gap-2 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors text-sm font-medium"
            >
              <MessageSquare className="w-4 h-4" />
              View Transcript
            </button>
            <a
              href={transcript.transcript_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Open raw file"
            >
              <ExternalLink className="w-4 h-4 text-gray-500" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

const CallHistoryList: React.FC = () => {
  const { t } = useTranslations();
  const { transcripts, loading, error, refetch } = useTranscripts();
  const [search, setSearch] = useState('');
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null);
  const [showConnectedOnly, setShowConnectedOnly] = useState(false);

  // Filter by search and connected status
  const filteredTranscripts = transcripts.filter((transcript) => {
    // Connected filter - use has_conversation flag for actual User/Agent turns
    if (showConnectedOnly) {
      if (transcript.has_conversation !== true) return false;
    }

    if (!search.trim()) return true;
    const searchLower = search.toLowerCase();
    return (
      transcript.call_id.toLowerCase().includes(searchLower) ||
      transcript.phone_number.toLowerCase().includes(searchLower)
    );
  });

  return (
    <>
      {/* Search Bar and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by call ID or phone number..."
          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Toggle Switch */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className={`text-sm font-medium ${showConnectedOnly ? 'text-green-600' : 'text-gray-500'}`}>
            Connected Only
          </span>
          <div
            onClick={() => setShowConnectedOnly(!showConnectedOnly)}
            className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${showConnectedOnly ? 'bg-green-500' : 'bg-gray-300'
              }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${showConnectedOnly ? 'translate-x-6' : 'translate-x-0.5'
                }`}
            />
          </div>
        </label>

        <button
          onClick={() => refetch()}
          className="px-4 py-3 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl transition-colors text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
          {error}
        </div>
      )}

      {/* Call List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading call history...
          </div>
        ) : filteredTranscripts.length > 0 ? (
          filteredTranscripts.map((transcript) => (
            <CallHistoryItem
              key={transcript.id}
              transcript={transcript}
              onViewTranscript={() => setSelectedTranscript(transcript)}
            />
          ))
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-gray-500">
            <Phone className="w-12 h-12 text-gray-300 mb-4" />
            <p>{search ? 'No calls match your search' : 'No call history yet'}</p>
          </div>
        )}
      </div>

      {/* Transcript Viewer Modal */}
      {selectedTranscript && (
        <TranscriptViewer
          transcriptUrl={selectedTranscript.transcript_url}
          callId={selectedTranscript.call_id}
          onClose={() => setSelectedTranscript(null)}
        />
      )}
    </>
  );
};

export default CallHistoryList;

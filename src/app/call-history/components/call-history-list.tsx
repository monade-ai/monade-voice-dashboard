/**
 * CallHistoryList
 * Displays a list of call logs with live updates.
 */

'use client';
import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';

import { useTranslations } from '@/i18n/translations-context';

import { CallLog } from '../../../../types/call-management';

import CallHistoryItem from './call-history-item';
import CallDetailsPanel from './call-details-panel';
import AgentFilterDialog from './agent-filter-dialog';


// Minimal filter options (labels will be translated)
const STATUS_OPTIONS = [
  { value: 'all', labelKey: 'callHistory.filter.status.all' },
  { value: 'completed', labelKey: 'callHistory.filter.status.completed' },
  { value: 'missed', labelKey: 'callHistory.filter.status.missed' },
  { value: 'failed', labelKey: 'callHistory.filter.status.failed' },
  { value: 'ongoing', labelKey: 'callHistory.filter.status.ongoing' },
];
const DIRECTION_OPTIONS = [
  { value: 'all', labelKey: 'callHistory.filter.direction.all' },
  { value: 'inbound', labelKey: 'callHistory.filter.direction.inbound' },
  { value: 'outbound', labelKey: 'callHistory.filter.direction.outbound' },
];

// TODO: Replace with API data and loading state
const mockCalls: CallLog[] = [
  {
    id: '1',
    participants: [
      { name: 'Alice', number: '+1234567890', role: 'contact' },
      { name: 'AI Assistant', number: 'virtual', role: 'assistant' },
    ],
    direction: 'outbound',
    status: 'completed',
    startTime: '2025-04-20T13:00:00Z',
    endTime: '2025-04-20T13:05:00Z',
    durationSeconds: 300,
    transcript: 'Hello, this is Alice...',
    logs: [
      { timestamp: '2025-04-20T13:00:01Z', message: 'Call started', type: 'info' },
      { timestamp: '2025-04-20T13:05:00Z', message: 'Call ended', type: 'info' },
    ],
    telemetry: { quality: 'good' },
  },
  {
    id: '2',
    participants: [
      { name: 'Bob', number: '+1987654321', role: 'contact' },
      { name: 'AI Assistant', number: 'virtual', role: 'assistant' },
    ],
    direction: 'inbound',
    status: 'missed',
    startTime: '2025-04-20T12:30:00Z',
    transcript: '',
    logs: [
      { timestamp: '2025-04-20T12:30:01Z', message: 'Missed call', type: 'warning' },
    ],
    telemetry: { quality: 'n/a' },
  },
];

const CallHistoryList: React.FC = () => {
  const { t } = useTranslations();
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  // Simulate API loading
  useEffect(() => {
    setLoading(true);
    // TODO: Replace with real API call to fetch call logs
    setTimeout(() => {
      setCalls(mockCalls);
      setLoading(false);
    }, 800);
  }, []);

  // Extract unique agent names from all calls (role === "assistant")
  const agentNames = Array.from(
    new Set(
      calls
        .flatMap((call) =>
          call.participants
            .filter((p) => p.role === 'assistant')
            .map((p) => p.name),
        )
        .filter(Boolean),
    ),
  );

  // Filter logic
  const filteredCalls = calls.filter((call) => {
    const statusMatch = statusFilter === 'all' || call.status === statusFilter;
    const directionMatch = directionFilter === 'all' || call.direction === directionFilter;
    const searchMatch =
      search.trim() === '' ||
      call.participants.some((p) =>
        p.name.toLowerCase().includes(search.trim().toLowerCase()),
      );
    const agentMatch =
      selectedAgents.length === 0 ||
      call.participants.some(
        (p) => p.role === 'assistant' && selectedAgents.includes(p.name),
      );

    return statusMatch && directionMatch && searchMatch && agentMatch;
  });

  return (
    <>
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="text"
          placeholder={t('callHistory.filter.searchPlaceholder')}
          className="px-3 py-2 rounded border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="px-2 py-2 rounded border border-input bg-background text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(opt.labelKey)}
            </option>
          ))}
        </select>
        <select
          className="px-2 py-2 rounded border border-input bg-background text-sm"
          value={directionFilter}
          onChange={(e) => setDirectionFilter(e.target.value)}
        >
          {DIRECTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(opt.labelKey)}
            </option>
          ))}
        </select>
        <button
          className={`flex items-center gap-2 px-3 py-2 rounded border border-input text-sm transition ${
            selectedAgents.length > 0
              ? 'bg-amber-100 text-amber-900 border-amber-300'
              : 'bg-background text-muted-foreground hover:bg-muted'
          }`}
          onClick={() => setAgentDialogOpen(true)}
          type="button"
        >
          <User size={16} />
          {selectedAgents.length > 0
            ? selectedAgents.join(', ')
            : t('callHistory.agentFilter.button')}
        </button>
        <AgentFilterDialog
          open={agentDialogOpen}
          onClose={() => setAgentDialogOpen(false)}
          agentNames={agentNames}
          selectedAgents={selectedAgents}
          onSelect={setSelectedAgents}
        />
      </div>
      <div className="w-full h-full flex flex-col gap-2">
        {/* Loading state */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <span>{t('callHistory.loading')}</span>
          </div>
        ) : filteredCalls.length > 0 ? (
          filteredCalls.map((call) => (
            <CallHistoryItem
              key={call.id}
              call={call}
              onClick={setSelectedCall}
            />
          ))
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <span>{t('callHistory.empty')}</span>
          </div>
        )}
      </div>
      {selectedCall && (
        <CallDetailsPanel
          call={selectedCall}
          onClose={() => setSelectedCall(null)}
        />
      )}
    </>
  );
};

export default CallHistoryList;

/**
 * CallDetailsPanel
 * Side panel displaying details for a selected call, with tabs for transcript, info, logs, telemetry, etc.
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';

import { useTranslations } from '@/i18n/translations-context';

import { CallLog } from '../../../../types/call-management';

// Minimal tab implementation (labels will be translated)
const TABS = [
  { key: 'transcript', labelKey: 'callHistory.details.tabs.transcript' },
  { key: 'info', labelKey: 'callHistory.details.tabs.info' },
  { key: 'logs', labelKey: 'callHistory.details.tabs.logs' },
  { key: 'telemetry', labelKey: 'callHistory.details.tabs.telemetry' },
];

type CallDetailsPanelProps = {
  call: CallLog;
  onClose: () => void;
};

function formatTime(iso: string) {
  const d = new Date(iso);

  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const CallDetailsPanel: React.FC<CallDetailsPanelProps> = ({ call, onClose }) => {
  const { t } = useTranslations();
  const [tab, setTab] = useState('transcript');

  // TODO: Fetch call details from API if needed (for real-time/live updates)

  // Minimal chat bubble rendering for transcript
  const transcriptBubbles = call.transcript
    ? call.transcript.split(/(?<=\.|\?|!)\s+/).map((line, idx) => (
      <div
        key={idx}
        className={`max-w-[80%] px-4 py-2 my-1 rounded-2xl text-sm shadow-sm ${
          idx % 2 === 0
            ? 'bg-amber-100 text-amber-900 self-end'
            : 'bg-gray-100 text-gray-700 self-start'
        }`}
      >
        {line}
      </div>
    ))
    : [
      <div key="empty" className="text-muted-foreground text-sm">
        {t('callHistory.details.transcript.empty')}
      </div>,
    ];

  // Minimal bar chart for telemetry (e.g., call quality)
  const telemetryBars =
    call.telemetry && call.telemetry.quality === 'good' ? (
      <div className="flex items-end gap-2 h-24 mt-4">
        <div className="w-6 bg-green-400 rounded-t h-16" title={t('callHistory.details.telemetry.speech')} />
        <div className="w-6 bg-green-300 rounded-t h-12" title={t('callHistory.details.telemetry.network')} />
        <div className="w-6 bg-green-200 rounded-t h-20" title={t('callHistory.details.telemetry.stability')} />
      </div>
    ) : (
      <div className="text-muted-foreground text-sm mt-4">{t('callHistory.details.telemetry.empty')}</div>
    );

  return (
    <aside className="fixed top-0 right-0 h-full w-full max-w-md bg-background shadow-lg z-50 flex flex-col border-l border-border animate-in slide-in-from-right duration-200">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold">{t('callHistory.details.title')}</h2>
        <button
          className="text-muted-foreground hover:text-foreground transition"
          onClick={onClose}
          aria-label={t('callHistory.details.close')}
        >
          <X size={22} />
        </button>
      </div>
      {/* Tabs */}
      <div className="flex border-b border-border">
        {TABS.map((tTab) => (
          <button
            key={tTab.key}
            className={`flex-1 py-2 text-sm font-medium transition border-b-2 ${
              tab === tTab.key
                ? 'border-amber-500 text-amber-700 bg-amber-50'
                : 'border-transparent text-muted-foreground hover:bg-muted'
            }`}
            onClick={() => setTab(tTab.key)}
          >
            {t(tTab.labelKey)}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        {tab === 'transcript' && (
          <div className="flex flex-col gap-1">{transcriptBubbles}</div>
        )}
        {tab === 'info' && (
          <div className="text-sm space-y-2">
            <div>
              <span className="font-medium">{t('callHistory.details.info.participants')}:</span>{' '}
              {call.participants.map((p) => p.name).join(', ')}
            </div>
            <div>
              <span className="font-medium">{t('callHistory.details.info.status')}:</span> {call.status}
            </div>
            <div>
              <span className="font-medium">{t('callHistory.details.info.direction')}:</span> {call.direction}
            </div>
            <div>
              <span className="font-medium">{t('callHistory.details.info.start')}:</span> {formatTime(call.startTime)}
            </div>
            <div>
              <span className="font-medium">{t('callHistory.details.info.duration')}:</span>{' '}
              {call.durationSeconds ? `${call.durationSeconds}s` : t('callHistory.details.info.durationNA')}
            </div>
          </div>
        )}
        {tab === 'logs' && (
          <div className="text-xs space-y-2">
            {call.logs && call.logs.length > 0 ? (
              call.logs.map((log, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="text-muted-foreground">{formatTime(log.timestamp)}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      log.type === 'info'
                        ? 'bg-blue-100 text-blue-700'
                        : log.type === 'warning'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {log.type}
                  </span>
                  <span>{log.message}</span>
                </div>
              ))
            ) : (
              <div className="text-muted-foreground">{t('callHistory.details.logs.empty')}</div>
            )}
          </div>
        )}
        {tab === 'telemetry' && (
          <div>
            <div className="font-medium text-sm">{t('callHistory.details.telemetry.title')}</div>
            {telemetryBars}
          </div>
        )}
      </div>
    </aside>
  );
};

export default CallDetailsPanel;

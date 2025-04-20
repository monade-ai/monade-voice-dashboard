// types/call-management.ts

export type CallLog = {
  id: string;
  assistantId?: string;
  contactId?: string;
  participants: Array<{
    name: string;
    number: string;
    role: 'assistant' | 'contact' | 'external';
  }>;
  direction: 'inbound' | 'outbound';
  status: 'completed' | 'missed' | 'failed' | 'ongoing';
  startTime: string; // ISO 8601
  endTime?: string; // ISO 8601
  durationSeconds?: number;
  transcript?: string;
  logs?: Array<{
    timestamp: string;
    message: string;
    type: 'info' | 'warning' | 'error';
  }>;
  telemetry?: Record<string, any>;
  error?: string;
};

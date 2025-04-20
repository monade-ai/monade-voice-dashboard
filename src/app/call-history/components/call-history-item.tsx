/**
 * CallHistoryItem
 * Represents a single call log in the call history list.
 */

import React from "react";
import { CallLog } from "../../../../types/call-management";
import { PhoneCall, ArrowDownLeft, ArrowUpRight, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";

type CallHistoryItemProps = {
  call: CallLog;
  onClick?: (call: CallLog) => void;
};

const statusColors: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  missed: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700",
  ongoing: "bg-blue-100 text-blue-700",
};

const statusIcons: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 size={16} className="text-green-500" />,
  missed: <AlertTriangle size={16} className="text-yellow-500" />,
  failed: <XCircle size={16} className="text-red-500" />,
  ongoing: <Clock size={16} className="text-blue-500" />,
};

const directionIcons: Record<string, React.ReactNode> = {
  inbound: <ArrowDownLeft size={18} className="text-amber-500" />,
  outbound: <ArrowUpRight size={18} className="text-cyan-500" />,
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const CallHistoryItem: React.FC<CallHistoryItemProps> = ({ call, onClick }) => {
  return (
    <div
      className="flex items-center gap-4 p-4 rounded-xl border border-border bg-white shadow-sm hover:shadow-md hover:bg-amber-50 cursor-pointer transition group"
      onClick={() => onClick?.(call)}
      tabIndex={0}
      role="button"
      aria-label={`View details for call with ID ${call.id}`}
    >
      {/* Direction Icon */}
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100">
        {directionIcons[call.direction]}
      </div>
      {/* Call Info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">
          {call.participants.map((p) => p.name).join(", ")}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
          <span>{formatTime(call.startTime)}</span>
          <span>&middot;</span>
          <span className="capitalize">{call.direction}</span>
          <span>&middot;</span>
          <span className="capitalize">{call.status}</span>
        </div>
      </div>
      {/* Status Badge */}
      <div
        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${statusColors[call.status] || "bg-gray-100 text-gray-700"}`}
      >
        {statusIcons[call.status]}
        <span className="capitalize">{call.status}</span>
      </div>
    </div>
  );
};

export default CallHistoryItem;

'use client';

import React, { useState, useEffect } from 'react';
import {
    ArrowLeft,
    PhoneOff,
    Phone,
    Clock,
    Loader2,
    RefreshCw,
    Radio,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { DashboardHeader } from '@/components/dashboard-header';
import { PaperCard, PaperCardContent } from '@/components/ui/paper-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSessions, ActiveSession } from '@/app/hooks/use-sessions';

// --- Helpers ---

function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTime(dateString: string): string {
    try {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    } catch {
        return dateString;
    }
}

// --- Session Card ---

function SessionCard({
    session,
    onDisconnect,
    isDisconnecting,
}: {
    session: ActiveSession;
    onDisconnect: () => void;
    isDisconnecting: boolean;
}) {
    const [elapsed, setElapsed] = useState(session.duration_seconds || 0);

    // Live ticking duration
    useEffect(() => {
        setElapsed(session.duration_seconds || 0);
        const startedAt = new Date(session.started_at).getTime();
        const interval = setInterval(() => {
            const now = Date.now();
            setElapsed(Math.floor((now - startedAt) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [session.started_at, session.duration_seconds]);

    return (
        <PaperCard variant="default" className="bg-card/50 border-border/40">
            <PaperCardContent className="p-6">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                            <Phone size={18} className="text-green-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-base font-semibold tracking-tight text-foreground">
                                {session.phone_number}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
                                {session.call_id?.substring(0, 12) || 'N/A'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-green-600">Live</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="space-y-1">
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Duration</p>
                        <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-muted-foreground" />
                            <span className="text-lg font-mono font-bold tracking-tighter text-foreground tabular-nums">
                                {formatDuration(elapsed)}
                            </span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Started At</p>
                        <span className="text-xs font-medium text-foreground">{formatTime(session.started_at)}</span>
                    </div>
                </div>

                <div className="mb-6">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">Room</p>
                    <span className="text-[11px] font-mono text-muted-foreground break-all">{session.room_name}</span>
                </div>

                <button
                    onClick={onDisconnect}
                    disabled={isDisconnecting}
                    className={cn(
                        'w-full h-10 rounded-[4px] flex items-center justify-center gap-2',
                        'bg-red-500/10 text-red-500 border border-red-500/20',
                        'hover:bg-red-500 hover:text-white hover:border-red-500',
                        'transition-all duration-200',
                        'text-[10px] font-bold uppercase tracking-widest',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                >
                    {isDisconnecting ? (
                        <>
                            <Loader2 size={14} className="animate-spin" />
                            Disconnecting...
                        </>
                    ) : (
                        <>
                            <PhoneOff size={14} />
                            Disconnect Call
                        </>
                    )}
                </button>
            </PaperCardContent>
        </PaperCard>
    );
}

// --- Main Page ---

export default function SessionsPage() {
    const router = useRouter();
    const {
        sessions,
        loading,
        error,
        disconnecting,
        fetchSessions,
        disconnectSession,
    } = useSessions();

    return (
        <div className="min-h-screen bg-background flex flex-col font-sans">
            <DashboardHeader />

            <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-10 pb-32">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4 border-b border-border/40">
                    <div className="space-y-4">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
                        >
                            <ArrowLeft size={12} /> Back
                        </button>
                        <div className="flex items-center gap-4">
                            <h1 className="text-5xl font-medium tracking-tighter text-foreground">Sessions</h1>
                            <Badge
                                variant="outline"
                                className={cn(
                                    'text-[10px] font-bold px-2 py-0.5 rounded-[2px] uppercase tracking-widest font-mono',
                                    sessions.length > 0
                                        ? 'border-green-500/30 text-green-600 bg-green-500/5'
                                        : 'border-border text-muted-foreground',
                                )}
                            >
                                {sessions.length} Active
                            </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm font-medium">Monitor and control live call sessions.</p>
                    </div>

                    <Button
                        variant="outline"
                        onClick={() => fetchSessions()}
                        disabled={loading}
                        className="h-10 px-4 gap-2 border-border text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-black transition-all"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </Button>
                </div>

                {/* Auto-refresh indicator */}
                <div className="flex items-center gap-2 px-1">
                    <Radio size={12} className="text-primary animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                        Auto-refreshing every 10s
                    </span>
                </div>

                {/* Content */}
                {loading && sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loading active sessions...</p>
                    </div>
                ) : error && sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <p className="text-sm text-muted-foreground">{error}</p>
                        <Button variant="outline" onClick={() => fetchSessions()} className="text-[10px] font-bold uppercase tracking-widest">
                            Retry
                        </Button>
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                            <Phone size={24} className="text-muted-foreground/30" />
                        </div>
                        <h3 className="text-lg font-medium tracking-tight text-foreground">No Active Calls</h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                            There are no live call sessions at the moment. Active calls will appear here automatically.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sessions.map((session) => (
                            <SessionCard
                                key={session.room_name}
                                session={session}
                                onDisconnect={() => disconnectSession(session.room_name)}
                                isDisconnecting={disconnecting === session.room_name}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

'use client';

import React, { useState } from 'react';
import {
    ArrowLeft,
    Plus,
    Unlink,
    Loader2,
    Server,
    Shield,
    Check,
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

import { DashboardHeader } from '@/components/dashboard-header';
import { PaperCard } from '@/components/ui/paper-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUserTrunks, UserTrunk, CreateTrunkData, UpdateTrunkData } from '@/app/hooks/use-user-trunks';

// --- Inline Form / Edit Component ---

function TrunkEditForm({
    trunk,
    onSave,
    onCancel,
    onUnlink,
    saving,
}: {
    trunk: UserTrunk;
    onSave: (data: UpdateTrunkData) => void;
    onCancel: () => void;
    onUnlink: () => void;
    saving: boolean;
}) {
    const [name, setName] = useState(trunk.name || '');
    const [address, setAddress] = useState(trunk.address || '');
    const [numbersStr, setNumbersStr] = useState(trunk.numbers?.join(', ') || '');
    const [authUsername, setAuthUsername] = useState(trunk.auth_username || '');
    const [authPassword, setAuthPassword] = useState('');

    const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numbers = numbersStr.split(',').map(n => n.trim()).filter(Boolean);
        const data: UpdateTrunkData = {
            name,
            address,
            numbers,
            // Only send auth details if they are filled in (or clear them if empty)
            auth_username: authUsername,
            ...(authPassword ? { auth_password: authPassword } : {}),
        };
        onSave(data);
    };

    if (showUnlinkConfirm) {
        return (
            <div className="p-6 bg-red-500/5 rounded-b-[4px] border-t border-border/20 flex flex-col items-center justify-center space-y-4">
                <AlertTriangle size={24} className="text-red-500" />
                <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-foreground">Unlink {trunk.name}?</p>
                    <p className="text-[11px] text-muted-foreground max-w-sm">
                        This removes the trunk from your account. The trunk will remain globally active in LiveKit.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" size="sm" onClick={() => setShowUnlinkConfirm(false)} className="text-[10px] uppercase font-bold tracking-widest">
                        Cancel
                    </Button>
                    <Button size="sm" onClick={onUnlink} disabled={saving} className="bg-red-500 hover:bg-red-600 text-white gap-2 text-[10px] uppercase font-bold tracking-widest">
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Unlink size={12} />}
                        Confirm Unlink
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="p-6 bg-muted/20 border-t border-border/20 rounded-b-[4px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {/* Left Column */}
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Trunk Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full h-9 px-3 rounded-[3px] border border-border/50 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-medium text-foreground"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Phone Numbers</label>
                        <textarea
                            value={numbersStr}
                            onChange={(e) => setNumbersStr(e.target.value)}
                            placeholder="+1234567890, +1234567891"
                            className="w-full h-20 px-3 py-2 rounded-[3px] border border-border/50 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono resize-none leading-relaxed"
                        />
                        <p className="text-[9px] text-muted-foreground font-medium">Comma-separated</p>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">SIP Base URI</label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            required
                            className="w-full h-9 px-3 rounded-[3px] border border-border/50 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Auth Username</label>
                            <input
                                type="text"
                                value={authUsername}
                                onChange={(e) => setAuthUsername(e.target.value)}
                                placeholder="Leaves blank if none"
                                className="w-full h-9 px-3 rounded-[3px] border border-border/50 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Auth Password</label>
                            <input
                                type="password"
                                value={authPassword}
                                onChange={(e) => setAuthPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full h-9 px-3 rounded-[3px] border border-border/50 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono tracking-widest"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/30">
                <button
                    type="button"
                    onClick={() => setShowUnlinkConfirm(true)}
                    className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors"
                >
                    <Unlink size={12} />
                    Unlink Trunk
                </button>
                <div className="flex items-center gap-3">
                    <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-foreground">
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        size="sm"
                        disabled={saving || !name || !address}
                        className="bg-foreground text-background hover:bg-foreground/90 text-[10px] font-bold uppercase tracking-widest gap-2 h-8 px-4"
                    >
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        Update
                    </Button>
                </div>
            </div>
        </form>
    );
}

// --- Inline Create Form ---

function TrunkCreateForm({
    onSave,
    onCancel,
    saving,
}: {
    onSave: (data: CreateTrunkData) => void;
    onCancel: () => void;
    saving: boolean;
}) {
    const [trunkType, setTrunkType] = useState<'outbound' | 'inbound'>('outbound');
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [numbersStr, setNumbersStr] = useState('');
    const [authUsername, setAuthUsername] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [allowedNumbersStr, setAllowedNumbersStr] = useState('');
    const [krispEnabled, setKrispEnabled] = useState(true);

    const isOutbound = trunkType === 'outbound';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numbers = numbersStr.split(',').map(n => n.trim()).filter(Boolean);
        if (isOutbound) {
            const data: CreateTrunkData = {
                trunk_type: 'outbound',
                name,
                address,
                numbers,
                ...(authUsername ? { auth_username: authUsername } : {}),
                ...(authPassword ? { auth_password: authPassword } : {}),
            };
            onSave(data);
        } else {
            const allowedNumbers = allowedNumbersStr.split(',').map(n => n.trim()).filter(Boolean);
            const data: CreateTrunkData = {
                trunk_type: 'inbound',
                name,
                numbers,
                allowed_numbers: allowedNumbers,
                krisp_enabled: krispEnabled,
            };
            onSave(data);
        }
    };

    const canSubmit = isOutbound
        ? !saving && !!name && !!address
        : !saving && !!name && !!numbersStr.trim();

    return (
        <PaperCard className="bg-card/30 border-primary/20 shadow-none overflow-hidden mb-6">
            <div className="p-4 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                    <Plus size={16} />
                    <span className="text-sm font-semibold tracking-tight">Create New Trunk</span>
                </div>
                <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
                    <X size={16} />
                </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 bg-card">
                {/* Trunk Type Selector */}
                <div className="flex gap-2 mb-6">
                    <button
                        type="button"
                        onClick={() => setTrunkType('outbound')}
                        className={cn(
                            'px-4 py-2 rounded-[3px] text-[10px] font-bold uppercase tracking-widest transition-all',
                            isOutbound
                                ? 'bg-foreground text-background'
                                : 'bg-muted/50 text-muted-foreground hover:text-foreground',
                        )}
                    >
                        Outbound
                    </button>
                    <button
                        type="button"
                        onClick={() => setTrunkType('inbound')}
                        className={cn(
                            'px-4 py-2 rounded-[3px] text-[10px] font-bold uppercase tracking-widest transition-all',
                            !isOutbound
                                ? 'bg-foreground text-background'
                                : 'bg-muted/50 text-muted-foreground hover:text-foreground',
                        )}
                    >
                        Inbound
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Trunk Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                placeholder={isOutbound ? 'e.g. Vobiz Sales' : 'e.g. Support Inbound'}
                                className="w-full h-9 px-3 rounded-[3px] border border-border/50 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-medium text-foreground"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Phone Numbers</label>
                            <textarea
                                value={numbersStr}
                                onChange={(e) => setNumbersStr(e.target.value)}
                                placeholder="+1234567890, +1234567891"
                                className="w-full h-20 px-3 py-2 rounded-[3px] border border-border/50 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono resize-none leading-relaxed"
                            />
                        </div>
                    </div>
                    <div className="space-y-4">
                        {isOutbound ? (
                            <>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">SIP Base URI</label>
                                    <input
                                        type="text"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        required
                                        placeholder="sip.provider.com"
                                        className="w-full h-9 px-3 rounded-[3px] border border-border/50 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Auth Username</label>
                                        <input
                                            type="text"
                                            value={authUsername}
                                            onChange={(e) => setAuthUsername(e.target.value)}
                                            className="w-full h-9 px-3 rounded-[3px] border border-border/50 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Auth Password</label>
                                        <input
                                            type="password"
                                            value={authPassword}
                                            onChange={(e) => setAuthPassword(e.target.value)}
                                            className="w-full h-9 px-3 rounded-[3px] border border-border/50 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono tracking-widest"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Allowed Caller Numbers</label>
                                    <textarea
                                        value={allowedNumbersStr}
                                        onChange={(e) => setAllowedNumbersStr(e.target.value)}
                                        placeholder="+1234567890, +1234567891 (leave empty to allow all)"
                                        className="w-full h-20 px-3 py-2 rounded-[3px] border border-border/50 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono resize-none leading-relaxed"
                                    />
                                    <p className="text-[9px] text-muted-foreground font-medium">Comma-separated. Empty allows all callers.</p>
                                </div>
                                <div className="flex items-center gap-3 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setKrispEnabled(!krispEnabled)}
                                        className={cn(
                                            'w-8 h-5 rounded-full transition-colors relative',
                                            krispEnabled ? 'bg-primary' : 'bg-muted-foreground/30',
                                        )}
                                    >
                                        <span className={cn(
                                            'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                                            krispEnabled ? 'left-3.5' : 'left-0.5',
                                        )} />
                                    </button>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                        Krisp Noise Cancellation
                                    </label>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-border/30">
                    <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-foreground">
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        size="sm"
                        disabled={!canSubmit}
                        className="bg-primary text-black hover:bg-primary/90 text-[10px] font-bold uppercase tracking-widest gap-2 h-8 px-4"
                    >
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                        Create
                    </Button>
                </div>
            </form>
        </PaperCard>
    );
}


// --- Expandable Trunk Card ---

function ExpandableTrunkCard({
    trunk,
    onSave,
    onUnlink,
    saving,
    expandedTrunkId,
    setExpandedTrunkId
}: {
    trunk: UserTrunk;
    onSave: (id: string, data: UpdateTrunkData) => void;
    onUnlink: (id: string) => void;
    saving: boolean;
    expandedTrunkId: string | null;
    setExpandedTrunkId: (id: string | null) => void;
}) {
    const isExpanded = expandedTrunkId === trunk.id;

    return (
        <PaperCard
            variant="default"
            className={cn(
                "bg-card/50 overflow-hidden transition-all duration-300",
                isExpanded ? "border-primary/40 shadow-md ring-1 ring-primary/20" : "border-border/40 hover:border-border/80 cursor-pointer"
            )}
        >
            {/* Header (Always Visible) */}
            <div
                className="p-4 md:p-6 flex items-center justify-between group select-none"
                onClick={() => setExpandedTrunkId(isExpanded ? null : trunk.id)}
            >
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300",
                        isExpanded ? "bg-primary/20 border border-primary/40" : "bg-muted border border-border/50 group-hover:bg-primary/5"
                    )}>
                        <Server size={18} className={isExpanded ? "text-primary" : "text-muted-foreground group-hover:text-primary"} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-base font-semibold tracking-tight text-foreground">{trunk.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground font-mono">{trunk.address}</span>
                            {trunk.numbers && trunk.numbers.length > 0 && (
                                <>
                                    <span className="text-muted-foreground/30">•</span>
                                    <span className="text-[10px] text-muted-foreground/70 font-medium">
                                        {trunk.numbers.length} {trunk.numbers.length === 1 ? 'number' : 'numbers'}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {!isExpanded && (
                        <div className="hidden md:flex items-center justify-end gap-3 mr-4">
                            {trunk.auth_username ? (
                                <span title="Authenticated"><Shield size={14} className="text-green-500/80" /></span>
                            ) : (
                                <span title="No Auth"><Shield size={14} className="text-muted-foreground/30" /></span>
                            )}
                        </div>
                    )}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent group-hover:bg-muted/50 transition-colors">
                        {isExpanded ? (
                            <ChevronDown size={18} className="text-foreground" />
                        ) : (
                            <ChevronRight size={18} className="text-muted-foreground group-hover:text-foreground" />
                        )}
                    </div>
                </div>
            </div>

            {/* Expandable Content (Form) */}
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                        <TrunkEditForm
                            trunk={trunk}
                            onSave={(data) => {
                                onSave(trunk.id, data);
                            }}
                            onUnlink={() => onUnlink(trunk.id)}
                            onCancel={() => setExpandedTrunkId(null)}
                            saving={saving}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </PaperCard>
    );
}

// --- Main Page ---

export default function TrunksPage() {
    const router = useRouter();
    const {
        trunks,
        loading,
        error,
        saving,
        fetchTrunks,
        createTrunk,
        updateTrunk,
        unlinkTrunk,
    } = useUserTrunks();

    const [isCreating, setIsCreating] = useState(false);
    const [expandedTrunkId, setExpandedTrunkId] = useState<string | null>(null);

    const handleCreate = async (data: CreateTrunkData) => {
        try {
            await createTrunk(data);
            setIsCreating(false);
        } catch (err) {
            // Hook handles logging/toast ideally
        }
    };

    const handleUpdate = async (id: string, data: UpdateTrunkData) => {
        const trunk = trunks.find(t => t.id === id);
        if (!trunk) return;
        try {
            await updateTrunk(trunk, data);
            setExpandedTrunkId(null);
        } catch (err) {
            // Hook handles
        }
    };

    const handleUnlink = async (id: string) => {
        const trunk = trunks.find(t => t.id === id);
        if (!trunk) return;
        try {
            await unlinkTrunk(trunk);
            setExpandedTrunkId(null);
        } catch (err) {
            // Hook handles
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col font-sans">
            <DashboardHeader />

            <main className="flex-1 p-6 md:p-8 max-w-4xl mx-auto w-full space-y-10 pb-32">

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
                            <h1 className="text-5xl font-medium tracking-tighter text-foreground">Trunks</h1>
                            <Badge
                                variant="outline"
                                className="text-[10px] font-bold px-2 py-0.5 rounded-[2px] border-border text-muted-foreground uppercase tracking-widest font-mono"
                            >
                                {trunks.length} Configured
                            </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm font-medium">Manage your SIP trunk connections.</p>
                    </div>

                    <Button
                        onClick={() => { setIsCreating(true); setExpandedTrunkId(null); }}
                        disabled={isCreating}
                        className="h-10 px-4 gap-2 bg-foreground text-background hover:bg-foreground/90 text-[10px] font-bold uppercase tracking-widest"
                    >
                        <Plus size={14} />
                        Add Trunk
                    </Button>
                </div>

                {/* Content */}
                <div className="space-y-6">
                    <AnimatePresence>
                        {isCreating && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                            >
                                <TrunkCreateForm
                                    onSave={handleCreate}
                                    onCancel={() => setIsCreating(false)}
                                    saving={saving}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loading trunks...</p>
                        </div>
                    ) : error && trunks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <p className="text-sm text-muted-foreground">{error}</p>
                            <Button variant="outline" onClick={() => fetchTrunks()} className="text-[10px] font-bold uppercase tracking-widest">
                                Retry
                            </Button>
                        </div>
                    ) : trunks.length === 0 && !isCreating ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center border border-dashed border-border/50 rounded-lg">
                            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                                <Server size={24} className="text-muted-foreground/30" />
                            </div>
                            <h3 className="text-lg font-medium tracking-tight text-foreground">No Trunks Configured</h3>
                            <p className="text-sm text-muted-foreground max-w-[300px]">
                                Add a SIP trunk to enable inbound and outbound calling.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Outbound Trunks */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 border-b border-border/30 pb-2">
                                    <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Outbound Trunks</h2>
                                    <span className="w-full h-px bg-border/20 flex-1" />
                                </div>
                                {trunks.filter(t => t.trunk_type !== 'inbound').length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic py-4 text-center">No outbound trunks configured.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {trunks.filter(t => t.trunk_type !== 'inbound').map((trunk) => (
                                            <ExpandableTrunkCard
                                                key={`${trunk.id}:outbound`}
                                                trunk={trunk}
                                                onSave={handleUpdate}
                                                onUnlink={handleUnlink}
                                                saving={saving}
                                                expandedTrunkId={expandedTrunkId}
                                                setExpandedTrunkId={setExpandedTrunkId}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Inbound Trunks */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 border-b border-border/30 pb-2">
                                    <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Inbound Trunks</h2>
                                    <span className="w-full h-px bg-border/20 flex-1" />
                                </div>
                                {trunks.filter(t => t.trunk_type === 'inbound').length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic py-4 text-center">No inbound trunks configured.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {trunks.filter(t => t.trunk_type === 'inbound').map((trunk) => (
                                            <ExpandableTrunkCard
                                                key={`${trunk.id}:inbound`}
                                                trunk={trunk}
                                                onSave={handleUpdate}
                                                onUnlink={handleUnlink}
                                                saving={saving}
                                                expandedTrunkId={expandedTrunkId}
                                                setExpandedTrunkId={setExpandedTrunkId}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

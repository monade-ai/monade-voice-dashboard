'use client';

import React, { useState } from 'react';
import { ArrowLeft, TrendingUp, Clock, Activity, Zap, ArrowUpRight, Filter, CalendarDays, BarChart3, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { PaperCard, PaperCardContent, PaperCardHeader, PaperCardTitle } from '@/components/ui/paper-card';
import { DashboardHeader } from '@/components/dashboard-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// --- Helpers ---

const formatNumber = (num: string) => num.toLocaleString();

// --- Sub-Components ---

const AnalyticsMetric = ({ label, value, change, trend }: { label: string, value: string, change: string, trend: 'up' | 'down' }) => (
  <PaperCard variant="default" className="bg-muted/5 border-border/40">
    <PaperCardContent className="p-6">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">{label}</span>
        <div className={cn(
          'flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] text-[10px] font-bold font-mono',
          trend === 'up' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600',
        )}>
          {trend === 'up' ? '↑' : '↓'} {change}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-mono font-bold tracking-tighter text-foreground">{value}</span>
      </div>
    </PaperCardContent>
  </PaperCard>
);

// --- Main Page ---

export default function AnalyticsPage() {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  // Weekly calls data for line chart
  const weeklyCallsData = [
    { day: 'Mon', calls: 1823, lastWeek: 1654 },
    { day: 'Tue', calls: 2156, lastWeek: 1987 },
    { day: 'Wed', calls: 1987, lastWeek: 2123 },
    { day: 'Thu', calls: 2341, lastWeek: 2056 },
    { day: 'Fri', calls: 2567, lastWeek: 2234 },
    { day: 'Sat', calls: 1234, lastWeek: 1123 },
    { day: 'Sun', calls: 987, lastWeek: 876 },
  ];

  const topAgents = [
    { name: 'Sales Assistant', calls: 3421, success: 96.2 },
    { name: 'Support Bot', calls: 2876, success: 94.8 },
    { name: 'Lead Qualifier', calls: 2234, success: 92.1 },
    { name: 'Appointment Setter', calls: 1987, success: 91.5 },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <DashboardHeader />

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-12 pb-32">
        
        {/* Header Horizon */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4 border-b border-border/40">
          <div className="space-y-4">
            <button 
              onClick={() => router.back()}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft size={12} /> Back
            </button>
            <h1 className="text-5xl font-medium tracking-tighter text-foreground">Intelligence</h1>
            <p className="text-muted-foreground text-sm font-medium">Performance telemetry across your digital fleet.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex p-1 bg-muted rounded-md mr-4">
              {['24h', '7d', '30d'].map((r) => (
                <button 
                  key={r}
                  onClick={() => setTimeRange(r as any)}
                  className={cn(
                    'px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-all',
                    timeRange === r ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <Button variant="outline" className="h-10 px-4 gap-2 border-border text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-black transition-all">
              <CalendarDays size={14} /> Custom Range
            </Button>
          </div>
        </div>

        {/* Telemetry Deck */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnalyticsMetric label="Total Sessions" value="12,847" change="12.5%" trend="up" />
          <AnalyticsMetric label="Avg Conversation" value="04:32" change="8.2%" trend="up" />
          <AnalyticsMetric label="Success Rate" value="94.2%" change="2.1%" trend="up" />
          <AnalyticsMetric label="Throughput" value="58.4k" change="18.7%" trend="up" />
        </div>

        {/* Visual Pulse Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
          {/* Primary Chart Area (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <BarChart3 size={16} className="text-primary" />
                <h3 className="text-xl font-medium tracking-tight">Temporal Flow</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 font-mono">Sessions / 24h cycle</span>
            </div>
                
            <PaperCard variant="default" className="bg-card/30 min-h-[400px]">
              <div className="p-8 h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyCallsData}>
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 600 }} 
                      dy={10}
                      stroke="#9ca3af"
                    />
                    <YAxis 
                      hide 
                    />
                    <Tooltip
                      cursor={{ stroke: 'rgba(250, 204, 21, 0.2)', strokeWidth: 2 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-background border border-border/40 p-3 rounded-md shadow-2xl">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{payload[0].payload.day}</p>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-8">
                                  <span className="text-xs font-medium text-foreground">Current</span>
                                  <span className="text-xs font-mono font-bold text-primary">{payload[0].value}</span>
                                </div>
                                <div className="flex items-center justify-between gap-8">
                                  <span className="text-xs font-medium text-muted-foreground">Baseline</span>
                                  <span className="text-xs font-mono font-bold text-muted-foreground">{payload[1].value}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return null;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="calls"
                      stroke="#facc15"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 4, fill: '#facc15', stroke: '#000', strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="lastWeek"
                      stroke="rgba(156, 163, 175, 0.2)"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </PaperCard>
          </div>

          {/* Sidebar: Ranking (1/3) */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-1">
              <Users size={16} className="text-primary" />
              <h3 className="text-xl font-medium tracking-tight">Agent Performance</h3>
            </div>
                
            <div className="bg-card border border-border/20 rounded-md overflow-hidden">
              {topAgents.map((agent, i) => (
                <div key={i} className="p-4 border-b border-border/10 last:border-0 hover:bg-muted/30 transition-all flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="text-[10px] font-mono font-bold text-muted-foreground/40 w-4">{i + 1}</div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground">{agent.name}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{agent.calls.toLocaleString()} Calls</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-mono font-bold text-primary">{agent.success}%</span>
                    <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-1000" 
                        style={{ width: `${agent.success}%` }} 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <PaperCard className="bg-primary/[0.02] border-primary/20 p-6">
              <div className="flex items-start gap-4">
                <Zap size={20} className="text-primary mt-1" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground uppercase tracking-tight">Optimizer Insight</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                                Lead Qualifier agents are showing 4.2% higher success rates on Tue/Thu cycles. Consider scaling concurrency during these windows.
                  </p>
                </div>
              </div>
            </PaperCard>
          </div>
        </div>

      </main>
    </div>
  );
}
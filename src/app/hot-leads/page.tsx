'use client';

import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, Phone, Calendar, Filter, X, Lightbulb, MessageSquare, Target, BarChart3, ArrowUpDown } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { TranscriptViewer } from '@/components/transcript-viewer';
import { useUserAnalytics, CallAnalytics } from '@/app/hooks/use-analytics';

export default function HotLeadsPage() {
  const { analytics: allAnalytics, loading, fetchAll } = useUserAnalytics();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCall, setSelectedCall] = useState<{ transcriptUrl: string; callId: string } | null>(null);
  const [selectedAnalytics, setSelectedAnalytics] = useState<CallAnalytics | null>(null);
  const [filteredLeads, setFilteredLeads] = useState<typeof allAnalytics>([]);
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [sortBy, setSortBy] = useState<'confidence' | 'date-new' | 'date-old'>('confidence');

  // Fetch analytics on mount
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Filter for REAL hot leads: >= 50% confidence AND positive verdict
  // Positive verdicts: interested, callback, booked, success etc.
  // Negative verdicts (excluded): not_interested, not interested, failed, do not call etc.
  useEffect(() => {
    console.log('[HotLeads] All analytics:', allAnalytics);
    console.log('[HotLeads] Total analytics count:', allAnalytics.length);

    // Helper to check if verdict is positive
    const isPositiveVerdict = (verdict: string | undefined): boolean => {
      if (!verdict) return false;
      const v = verdict.toLowerCase().replace(/_/g, ' ');

      // Exclude negative verdicts
      if (v.includes('not interested') ||
                v.includes('not_interested') ||
                v.includes('failed') ||
                v.includes('do not call') ||
                v.includes('dnc') ||
                v.includes('wrong number') ||
                v.includes('no interest') ||
                v.includes('decline')) {
        return false;
      }

      // Include positive verdicts
      if (v.includes('interested') ||
                v.includes('callback') ||
                v.includes('call back') ||
                v.includes('book') ||
                v.includes('success') ||
                v.includes('hot lead') ||
                v.includes('qualified') ||
                v.includes('demo') ||
                v.includes('meeting')) {
        return true;
      }

      // Default: exclude unknown verdicts from hot leads
      return false;
    };

    // Filter: confidence >= 50 AND positive verdict
    let hotLeads = allAnalytics.filter(a =>
      (a.confidence_score || 0) >= 50 && isPositiveVerdict(a.verdict),
    );
    console.log('[HotLeads] Hot leads after filtering (>= 50% AND positive verdict):', hotLeads);
    console.log('[HotLeads] Hot leads count:', hotLeads.length);

    // Apply date filter
    if (dateFilter.start || dateFilter.end) {
      hotLeads = hotLeads.filter(lead => {
        if (!lead.created_at) return false;
        const leadDate = new Date(lead.created_at);
        const startDate = dateFilter.start ? new Date(dateFilter.start) : null;
        const endDate = dateFilter.end ? new Date(dateFilter.end + 'T23:59:59') : null;

        if (startDate && leadDate < startDate) return false;
        if (endDate && leadDate > endDate) return false;

        return true;
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const searchFiltered = hotLeads.filter(lead =>
        lead.phone_number?.toLowerCase().includes(query) ||
                lead.verdict?.toLowerCase().includes(query) ||
                lead.call_id?.toLowerCase().includes(query),
      );
      console.log('[HotLeads] After search filter:', searchFiltered.length);
      setFilteredLeads(searchFiltered);
    } else {
      setFilteredLeads(hotLeads);
    }
  }, [allAnalytics, searchQuery, dateFilter]);

  // Sort leads based on selected sort option
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    if (sortBy === 'confidence') {
      return (b.confidence_score || 0) - (a.confidence_score || 0);
    } else if (sortBy === 'date-new') {
      // Newest first
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    } else {
      // Oldest first
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    }
  });

  // Get verdict color
  const getVerdictColor = (verdict: string | undefined) => {
    if (!verdict) return 'bg-gray-100 text-gray-700';
    const v = verdict.toLowerCase();
    if (v === 'interested' || v === 'success' || v.includes('book')) return 'bg-green-100 text-green-700';
    if (v === 'not_interested' || v === 'failed') return 'bg-red-100 text-red-700';
    if (v === 'callback' || v === 'partial') return 'bg-yellow-100 text-yellow-700';

    return 'bg-gray-100 text-gray-700';
  };

  // Get quality color
  const getQualityColor = (quality: string | undefined) => {
    if (!quality) return 'bg-gray-100 text-gray-700';
    const q = quality.toLowerCase();
    if (q === 'high' || q === 'completed') return 'bg-green-100 text-green-700';
    if (q === 'medium') return 'bg-yellow-100 text-yellow-700';
    if (q === 'low' || q === 'abrupt_end') return 'bg-red-100 text-red-700';

    return 'bg-gray-100 text-gray-700';
  };

  // Format date
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-6 h-6 text-amber-600" />
          <h1 className="text-2xl font-bold">Hot Leads</h1>
        </div>
        <p className="text-gray-600">Calls with positive verdict AND confidence score ≥ 50%</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-sm text-gray-500 mb-1">Total Hot Leads</div>
          <div className="text-2xl font-bold text-amber-600">{filteredLeads.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500 mb-1">Interested</div>
          <div className="text-2xl font-bold text-green-600">
            {filteredLeads.filter(l => l.verdict?.toLowerCase().includes('interest') || l.verdict?.toLowerCase().includes('book')).length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500 mb-1">Callback</div>
          <div className="text-2xl font-bold text-yellow-600">
            {filteredLeads.filter(l => l.verdict?.toLowerCase() === 'callback').length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500 mb-1">Avg Confidence</div>
          <div className="text-2xl font-bold text-blue-600">
            {filteredLeads.length > 0
              ? Math.round(filteredLeads.reduce((sum, l) => sum + (l.confidence_score || 0), 0) / filteredLeads.length)
              : 0}%
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by phone, verdict..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>

          {/* Sort */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="confidence">Sort: Confidence</option>
                <option value="date-new">Sort: Newest First</option>
                <option value="date-old">Sort: Oldest First</option>
              </select>
            </div>
          </div>

          {/* Date Range */}
          <div className="md:col-span-2 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <Input
              type="date"
              value={dateFilter.start}
              onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
              className="flex-1"
              placeholder="Start date"
            />
            <span className="text-gray-400">to</span>
            <Input
              type="date"
              value={dateFilter.end}
              onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
              className="flex-1"
              placeholder="End date"
            />
            {(dateFilter.start || dateFilter.end || searchQuery) && (
              <button
                onClick={() => {
                  setDateFilter({ start: '', end: '' });
                  setSearchQuery('');
                }}
                className="text-sm text-gray-500 hover:text-gray-700 whitespace-nowrap"
              >
                                Clear All
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
                        Loading hot leads...
          </div>
        ) : sortedLeads.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Filter className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="font-medium">No hot leads found</p>
            <p className="text-sm mt-1">
              {searchQuery || dateFilter.start || dateFilter.end ? 'Try adjusting your filters' : 'Calls with ≥50% confidence will appear here'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Verdict</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLeads.map((lead) => (
                  <TableRow
                    key={lead.id || lead.call_id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedAnalytics(lead)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="font-mono text-sm">{lead.phone_number || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVerdictColor(lead.verdict)}`}>
                        {lead.verdict ? lead.verdict.replace(/_/g, ' ').toUpperCase() : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="w-24">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold">{lead.confidence_score || 0}%</span>
                        </div>
                        <Progress value={lead.confidence_score || 0} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {lead.summary || 'No summary available'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${getQualityColor(lead.call_quality)}`}>
                        {lead.call_quality ? lead.call_quality.replace(/_/g, ' ') : 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {formatDate(lead.created_at)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Analytics Details Modal */}
      {selectedAnalytics && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-amber-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-amber-600" />
                                    Call Analytics Details
                </h2>
                <p className="text-sm text-gray-600">{selectedAnalytics.phone_number}</p>
              </div>
              <button
                onClick={() => setSelectedAnalytics(null)}
                className="p-2 hover:bg-amber-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Verdict & Confidence */}
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getVerdictColor(selectedAnalytics.verdict)}`}>
                  {selectedAnalytics.verdict ? selectedAnalytics.verdict.replace(/_/g, ' ').toUpperCase() : 'N/A'}
                </span>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-600">
                                        Confidence: <span className="font-semibold">{selectedAnalytics.confidence_score || 0}%</span>
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs ${getQualityColor(selectedAnalytics.call_quality)}`}>
                  {selectedAnalytics.call_quality ? selectedAnalytics.call_quality.replace(/_/g, ' ') : 'unknown'}
                </span>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                  <MessageSquare className="w-3 h-3" />
                                    Summary
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{selectedAnalytics.summary || 'No summary available'}</p>
              </div>

              {/* Key Discoveries */}
              {selectedAnalytics.key_discoveries && Object.keys(selectedAnalytics.key_discoveries).length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-1 text-xs text-blue-600 mb-3">
                    <Lightbulb className="w-3 h-3" />
                                        Key Discoveries
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(selectedAnalytics.key_discoveries).map(([key, value]) => {
                      if (!value || (Array.isArray(value) && value.length === 0)) return null;

                      return (
                        <div key={key} className="bg-white rounded px-3 py-2">
                          <span className="text-xs text-gray-500 block mb-1">{key.replace(/_/g, ' ')}</span>
                          <span className="text-sm font-medium text-gray-700">
                            {Array.isArray(value) ? value.join(', ') : String(value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Use Case */}
              {selectedAnalytics.use_case && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center gap-1 text-xs text-purple-600 mb-2">
                    <Target className="w-3 h-3" />
                                        Use Case
                  </div>
                  <p className="text-sm text-gray-700">{selectedAnalytics.use_case}</p>
                </div>
              )}

              {/* Metadata */}
              <div className="pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-xs text-gray-500">
                <div>
                  <span className="font-medium">Call ID:</span> {selectedAnalytics.call_id}
                </div>
                <div>
                  <span className="font-medium">Created:</span> {formatDate(selectedAnalytics.created_at)}
                </div>
              </div>

              {/* View Transcript Button */}
              {selectedAnalytics.transcript_url && (
                <button
                  onClick={() => {
                    setSelectedCall({
                      transcriptUrl: selectedAnalytics.transcript_url!,
                      callId: selectedAnalytics.call_id!,
                    });
                    setSelectedAnalytics(null);
                  }}
                  className="w-full mt-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
                >
                                    View Full Transcript
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transcript Viewer Modal */}
      {selectedCall && (
        <TranscriptViewer
          transcriptUrl={selectedCall.transcriptUrl}
          callId={selectedCall.callId}
          onClose={() => setSelectedCall(null)}
        />
      )}
    </div>
  );
}

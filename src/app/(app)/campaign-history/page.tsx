'use client';

import React, { useState } from 'react';
import { History, Download, Trash2, PieChart, Phone, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCampaignHistory, CampaignRecord } from '@/app/hooks/use-campaign-history';

export default function CampaignHistoryPage() {
  const { campaigns, loading, deleteCampaign, getConnectivityRate } = useCampaignHistory();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Download CSV for a campaign
  const downloadCampaignCSV = (campaign: CampaignRecord) => {
    // Build dynamic headers from calleeInfo keys (from first result)
    const calleeInfoKeys = campaign.results.length > 0 ? Object.keys(campaign.results[0].calleeInfo) : [];

    const headers = [
      'phone_number',
      ...calleeInfoKeys,
      'call_id',
      'call_status',
      'verdict',
      'confidence_score',
      'summary',
      'call_quality',
      'transcript',
    ];

    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }

      return str;
    };

    const rows = campaign.results.map(r => {
      const analytics = r.analytics;

      return [
        escapeCSV(r.phoneNumber),
        ...calleeInfoKeys.map(key => escapeCSV(r.calleeInfo[key] || '')),
        escapeCSV(r.call_id),
        escapeCSV(r.call_status),
        escapeCSV(analytics?.verdict || ''),
        escapeCSV(analytics?.confidence_score || ''),
        escapeCSV(analytics?.summary || ''),
        escapeCSV(analytics?.call_quality || ''),
        escapeCSV(r.transcript),
      ].join(',');
    });

    const BOM = '\uFEFF';
    const csv = BOM + headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${campaign.name}_${new Date(campaign.createdAt).toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Get color for connectivity rate
  const getConnectivityColor = (rate: number) => {
    if (rate >= 70) return 'text-green-600';
    if (rate >= 40) return 'text-yellow-600';

    return 'text-red-600';
  };

  // Calculate aggregate stats
  const totalCampaigns = campaigns.length;
  const totalCalls = campaigns.reduce((sum, c) => sum + c.totalContacts, 0);
  const totalCompleted = campaigns.reduce((sum, c) => sum + c.completed, 0);
  const avgConnectivity = totalCalls > 0 ? Math.round((totalCompleted / totalCalls) * 100) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <History className="w-6 h-6 text-amber-600" />
          <h1 className="text-2xl font-bold">Campaign History</h1>
        </div>
        <p className="text-gray-600">View and download previous campaign results</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-sm text-gray-500 mb-1">Total Campaigns</div>
          <div className="text-2xl font-bold text-amber-600">{totalCampaigns}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500 mb-1">Total Calls</div>
          <div className="text-2xl font-bold text-blue-600">{totalCalls}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500 mb-1">Completed Calls</div>
          <div className="text-2xl font-bold text-green-600">{totalCompleted}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500 mb-1">Avg Connectivity</div>
          <div className={`text-2xl font-bold ${getConnectivityColor(avgConnectivity)}`}>{avgConnectivity}%</div>
        </Card>
      </div>

      {/* Campaign List */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
                        Loading campaigns...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <PieChart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="font-medium">No campaigns yet</p>
            <p className="text-sm mt-1">Run a campaign to see results here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Contacts</TableHead>
                  <TableHead>Results</TableHead>
                  <TableHead>Connectivity</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => {
                  const connectivity = getConnectivityRate(campaign);
                  const isExpanded = expandedId === campaign.id;

                  return (
                    <React.Fragment key={campaign.id}>
                      <TableRow className="hover:bg-gray-50">
                        <TableCell>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : campaign.id)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-xs text-gray-500">{campaign.assistantName}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatDate(campaign.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{campaign.totalContacts}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="flex items-center text-green-600">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              {campaign.completed}
                            </span>
                            <span className="flex items-center text-yellow-600">
                              <Clock className="w-3 h-3 mr-1" />
                              {campaign.noAnswer}
                            </span>
                            <span className="flex items-center text-red-600">
                              <XCircle className="w-3 h-3 mr-1" />
                              {campaign.failed}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {/* Simple bar chart */}
                          <div className="w-24">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className={`font-semibold ${getConnectivityColor(connectivity)}`}>
                                {connectivity}%
                              </span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${connectivity >= 70 ? 'bg-green-500' :
                                  connectivity >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${connectivity}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadCampaignCSV(campaign)}
                              className="text-green-600 border-green-200 hover:bg-green-50"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (confirm('Delete this campaign?')) {
                                  deleteCampaign(campaign.id);
                                }
                              }}
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded Details - Pie Chart */}
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-gray-50 p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Pie Chart Visualization */}
                              <div className="flex items-center justify-center">
                                <div className="relative w-32 h-32">
                                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                    {/* Background circle */}
                                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e5e7eb" strokeWidth="20" />

                                    {/* Completed segment */}
                                    <circle
                                      cx="50" cy="50" r="40"
                                      fill="transparent"
                                      stroke="#22c55e"
                                      strokeWidth="20"
                                      strokeDasharray={`${(campaign.completed / campaign.totalContacts) * 251.2} 251.2`}
                                    />

                                    {/* No Answer segment */}
                                    <circle
                                      cx="50" cy="50" r="40"
                                      fill="transparent"
                                      stroke="#eab308"
                                      strokeWidth="20"
                                      strokeDasharray={`${(campaign.noAnswer / campaign.totalContacts) * 251.2} 251.2`}
                                      strokeDashoffset={`${-(campaign.completed / campaign.totalContacts) * 251.2}`}
                                    />
                                  </svg>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-lg font-bold">{connectivity}%</span>
                                  </div>
                                </div>
                              </div>

                              {/* Details */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="flex items-center gap-2">
                                    <span className="w-3 h-3 bg-green-500 rounded-full" />
                                                                        Completed
                                  </span>
                                  <span className="font-medium">{campaign.completed} ({Math.round((campaign.completed / campaign.totalContacts) * 100)}%)</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="flex items-center gap-2">
                                    <span className="w-3 h-3 bg-yellow-500 rounded-full" />
                                                                        No Answer
                                  </span>
                                  <span className="font-medium">{campaign.noAnswer} ({Math.round((campaign.noAnswer / campaign.totalContacts) * 100)}%)</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="flex items-center gap-2">
                                    <span className="w-3 h-3 bg-red-500 rounded-full" />
                                                                        Failed
                                  </span>
                                  <span className="font-medium">{campaign.failed} ({Math.round((campaign.failed / campaign.totalContacts) * 100)}%)</span>
                                </div>
                                <div className="pt-2 border-t text-xs text-gray-500">
                                                                    From: {campaign.fromNumber}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function AnalyticsPage() {
  const router = useRouter();

  // Dummy analytics data
  const stats = [
    { label: 'Total Calls', value: '12,847', change: '+12.5%', trend: 'up' },
    { label: 'Avg Call Duration', value: '4m 32s', change: '+8.2%', trend: 'up' },
    { label: 'Success Rate', value: '94.2%', change: '+2.1%', trend: 'up' },
    { label: 'Total Minutes', value: '58,432', change: '+18.7%', trend: 'up' },
  ];

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

  // Duration data for area chart
  const durationData = [
    { day: 'Mon', duration: 4.2, target: 4.0 },
    { day: 'Tue', duration: 4.5, target: 4.0 },
    { day: 'Wed', duration: 4.1, target: 4.0 },
    { day: 'Thu', duration: 4.8, target: 4.0 },
    { day: 'Fri', duration: 5.1, target: 4.0 },
    { day: 'Sat', duration: 3.9, target: 4.0 },
    { day: 'Sun', duration: 3.5, target: 4.0 },
  ];

  const topAgents = [
    { name: 'Sales Assistant', calls: 3421, success: 96.2 },
    { name: 'Support Bot', calls: 2876, success: 94.8 },
    { name: 'Lead Qualifier', calls: 2234, success: 92.1 },
    { name: 'Appointment Setter', calls: 1987, success: 91.5 },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-500">Track your voice agent performance</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">{stat.label}</span>
                <span className={`text-xs font-medium ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Weekly Calls Line Chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Weekly Calls</h3>
            <p className="text-sm text-gray-500 mb-4">This week vs last week</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyCallsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="calls"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                    name="This Week"
                  />
                  <Line
                    type="monotone"
                    dataKey="lastWeek"
                    stroke="#d1d5db"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Last Week"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Avg Duration Area Chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Avg Duration (mins)</h3>
            <p className="text-sm text-gray-500 mb-4">Daily average vs 4 min target</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={durationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} domain={[0, 6]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="duration"
                    stroke="#3b82f6"
                    fill="#93c5fd"
                    fillOpacity={0.6}
                    strokeWidth={2}
                    name="Avg Duration"
                  />
                  <Line
                    type="monotone"
                    dataKey="target"
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Target"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Top Agents Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Top Performing Agents</h3>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-6 text-left text-xs font-medium text-gray-500">Agent Name</th>
                <th className="py-3 px-6 text-left text-xs font-medium text-gray-500">Total Calls</th>
                <th className="py-3 px-6 text-left text-xs font-medium text-gray-500">Success Rate</th>
                <th className="py-3 px-6 text-left text-xs font-medium text-gray-500">Performance</th>
              </tr>
            </thead>
            <tbody>
              {topAgents.map((agent, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-6 text-sm font-medium text-gray-900">{agent.name}</td>
                  <td className="py-4 px-6 text-sm text-gray-600">{agent.calls.toLocaleString()}</td>
                  <td className="py-4 px-6 text-sm text-gray-600">{agent.success}%</td>
                  <td className="py-4 px-6">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-amber-500 h-2 rounded-full"
                        style={{ width: `${agent.success}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

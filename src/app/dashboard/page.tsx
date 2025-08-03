'use client';

import React, { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import DashboardCarousel from './components/carousel';

const WalletCard = () => (
  <div className="bg-yellow-400 p-6 rounded-xl shadow-lg border border-yellow-500 flex flex-col justify-between h-full">
    <div>
      <h3 className="font-semibold text-lg text-yellow-900 mb-2">Wallet</h3>
      <p className="text-5xl font-bold text-yellow-900">₹12,345</p>
    </div>
    <div className="flex items-baseline justify-between">
      <p className="text-lg text-yellow-800">3.4k mins left</p>
      <button className="bg-yellow-900 text-yellow-400 p-3 rounded-full hover:bg-yellow-800 transition-colors">
        <Plus size={24} />
      </button>
    </div>
  </div>
);

const StatCard = ({ title, value }) => (
  <div className="bg-card p-4 rounded-lg shadow-md border border-border flex flex-col items-center justify-center text-center h-full">
    <p className="text-5xl font-bold text-foreground">{value}</p>
    <p className="text-lg font-bold text-muted-foreground mt-2">{title}</p>
  </div>
);

const CallLogItem = ({ agent, to, contactBucket, status, duration, integrations }) => {
  const getStatusClass = (status) => {
    switch (status) {
      case 'Ended':
        return 'border-green-500 bg-green-500/10 text-green-500';
      case 'Started':
        return 'border-blue-500 bg-blue-500/10 text-blue-500';
      case 'Disconnected':
        return 'border-red-500 bg-red-500/10 text-red-500';
      default:
        return 'border-gray-500 bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <tr className="border-b border-border hover:bg-muted/50 transition-colors">
      <td className="p-4 flex items-center">
        <img src={agent.avatar} alt={agent.name} className="w-8 h-8 rounded-full mr-3" />
        <p className="font-medium text-foreground">{agent.name}</p>
      </td>
      <td className="p-4 text-muted-foreground">{to}</td>
      <td className="p-4 text-muted-foreground">{contactBucket}</td>
      <td className="p-4">
        <span className={`px-2 py-1 rounded-full border text-xs font-semibold ${getStatusClass(status)}`}>
          {status}
        </span>
      </td>
      <td className="p-4 text-muted-foreground">{duration}</td>
      <td className="p-4 flex items-center space-x-2">
        {integrations.map(src => <img key={src} src={src} className="w-6 h-6 rounded-full" />)}
      </td>
    </tr>
  );
};

export default function DashboardPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const callsPerPage = 6;

  const calls = [
    { agent: { name: 'Agent Smith', avatar: '/avatars/01.png' }, to: '+91 98765 43210', contactBucket: 'Leads', status: 'Ended', duration: '5m 23s', integrations: ['/integrations/hubspot.png', '/integrations/salesforce.png'] },
    { agent: { name: 'Agent 007', avatar: '/avatars/02.png' }, to: '+91 91234 56789', contactBucket: 'Customers', status: 'Started', duration: '1m 12s', integrations: ['/integrations/sheets.png'] },
    { agent: { name: 'Agent Carter', avatar: '/avatars/04.png' }, to: '+91 87654 32109', contactBucket: 'Follow-ups', status: 'Disconnected', duration: '0m 30s', integrations: ['/integrations/hubspot.png'] },
    { agent: { name: 'Agent Romanoff', avatar: '/avatars/05.png' }, to: '+91 78901 23456', contactBucket: 'Leads', status: 'Ended', duration: '12m 45s', integrations: ['/integrations/salesforce.png', '/integrations/sheets.png'] },
    { agent: { name: 'Agent Coulson', avatar: '/avatars/06.png' }, to: '+91 98765 12345', contactBucket: 'Customers', status: 'Ended', duration: '3m 2s', integrations: ['/integrations/hubspot.png'] },
    { agent: { name: 'Agent May', avatar: '/avatars/07.png' }, to: '+91 87654 67890', contactBucket: 'Leads', status: 'Started', duration: '2m 5s', integrations: ['/integrations/sheets.png'] },
    { agent: { name: 'Agent Fitz', avatar: '/avatars/08.png' }, to: '+91 78901 65432', contactBucket: 'Follow-ups', status: 'Ended', duration: '8m 15s', integrations: ['/integrations/hubspot.png', '/integrations/salesforce.png'] },
    { agent: { name: 'Agent Simmons', avatar: '/avatars/09.png' }, to: '+91 98765 54321', contactBucket: 'Customers', status: 'Disconnected', duration: '0m 10s', integrations: ['/integrations/hubspot.png'] },
    { agent: { name: 'Agent Mack', avatar: '/avatars/10.png' }, to: '+91 87654 12345', contactBucket: 'Leads', status: 'Ended', duration: '6m 50s', integrations: ['/integrations/sheets.png'] },
    { agent: { name: 'Agent Daisy', avatar: '/avatars/12.png' }, to: '+91 78901 98765', contactBucket: 'Follow-ups', status: 'Started', duration: '0m 55s', integrations: ['/integrations/salesforce.png'] },
    { agent: { name: 'Agent Yo-Yo', avatar: '/avatars/13.png' }, to: '+91 98765 98765', contactBucket: 'Customers', status: 'Ended', duration: '4m 33s', integrations: ['/integrations/hubspot.png', '/integrations/sheets.png'] },
    { agent: { name: 'Agent Deke', avatar: '/avatars/15.png' }, to: '+91 87654 54321', contactBucket: 'Leads', status: 'Ended', duration: '9m 21s', integrations: ['/integrations/hubspot.png'] },
  ];

  const indexOfLastCall = currentPage * callsPerPage;
  const indexOfFirstCall = indexOfLastCall - callsPerPage;
  const currentCalls = calls.slice(indexOfFirstCall, indexOfLastCall);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="min-h-screen bg-background text-foreground p-8 font-sans">
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          Deploy Agent
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-12" style={{ gridAutoRows: '1fr' }}>
        <div className="lg:col-span-1">
          <WalletCard />
        </div>
        <div className="lg:col-span-1 grid grid-rows-2 gap-4">
          <StatCard title="Agents" value="23" />
          <StatCard title="Calls" value="1,234" />
        </div>
        <div className="lg:col-span-1">
          <DashboardCarousel />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6">Call Logs</h2>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30">
                <th className="p-4 text-left text-xs font-semibold text-muted-foreground">AGENT</th>
                <th className="p-4 text-left text-xs font-semibold text-muted-foreground">TO</th>
                <th className="p-4 text-left text-xs font-semibold text-muted-foreground">CONTACT BUCKET</th>
                <th className="p-4 text-left text-xs font-semibold text-muted-foreground">STATUS</th>
                <th className="p-4 text-left text-xs font-semibold text-muted-foreground">DURATION</th>
                <th className="p-4 text-left text-xs font-semibold text-muted-foreground">INTEGRATIONS</th>
              </tr>
            </thead>
            <tbody>
              {currentCalls.map((call, i) => <CallLogItem key={i} {...call} />)}
            </tbody>
          </table>
          <div className="p-4 flex justify-end items-center">
            <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-full hover:bg-muted disabled:opacity-50">
              <ChevronLeft size={20} />
            </button>
            <span className="mx-4 text-sm">Page {currentPage}</span>
            <button onClick={() => paginate(currentPage + 1)} disabled={indexOfLastCall >= calls.length} className="p-2 rounded-full hover:bg-muted disabled:opacity-50">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

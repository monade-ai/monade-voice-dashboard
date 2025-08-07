/**
 * Call History - Main Page
 * Entry point for the Call History module.
 * Displays a list of recent calls with live updates.
 */

import React from 'react';

import CallHistoryList from './components/call-history-list';

const CallHistoryPage = () => {
  return (
    <main className="flex flex-col h-full w-full p-6">
      <h1 className="text-2xl font-bold mb-4">Call History</h1>
      <CallHistoryList />
    </main>
  );
};

export default CallHistoryPage;

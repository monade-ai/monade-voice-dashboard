'use client';

import { useEffect } from 'react';
import { WorkflowEditor } from './components/workflow-editor';

export default function WorkflowPage() {
  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 w-full">
        <WorkflowEditor />
      </div>
    </div>
  );
}
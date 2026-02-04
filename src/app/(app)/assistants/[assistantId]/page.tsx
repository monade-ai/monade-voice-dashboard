// src/app/assistants/[assistantId]/page.tsx
// Minimal dynamic page using params for Next.js 15+
import { AssistantParams } from './layout';

export default async function AssistantPage({ params }: { params: AssistantParams }) {
  const { assistantId } = await params;

  return <div>Assistant Page: {assistantId}</div>;
}

import { KnowledgeBaseProvider } from '@/app/hooks/use-knowledge-base';

export default function KnowledgeBaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <KnowledgeBaseProvider>
      {children}
    </KnowledgeBaseProvider>
  );
}

import { KnowledgeBaseProvider } from '@/app/hooks/use-knowledge-base'; // Adjust path if needed

export default function KnowledgeBaseLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        // Wrap the children (which will be page.tsx for different routes)
        // with the provider here.
        <KnowledgeBaseProvider>
            {/* You might have other shared layout elements here */}
            <div className="container mx-auto px-4 py-8">
                {children}
            </div>
        </KnowledgeBaseProvider>
    );
}

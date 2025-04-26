'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { FileText, Trash2, Search, Plus, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { useToast } from '../hooks/use-toast';
import { useKnowledgeBase, KnowledgeBase } from '@/app/hooks/use-knowledge-base';

const formatDate = (date: Date): string => {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffSeconds = Math.floor(diffTime / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes === 1) return '1 min ago';
  if (diffMinutes < 60) return `${diffMinutes} mins ago`;
  if (diffHours === 1) return '1 hr ago';
  if (diffHours < 24) return `${diffHours} hrs ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString();
};

export function DocumentLibrary() {
  const { knowledgeBases, isLoading, error, deleteKnowledgeBase } = useKnowledgeBase();
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) {
      return knowledgeBases;
    }
    const searchLower = searchQuery.toLowerCase();
    return knowledgeBases.filter(kb =>
      kb.filename.toLowerCase().includes(searchLower) ||
      kb.id.toLowerCase().includes(searchLower)
    );
  }, [searchQuery, knowledgeBases]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleDelete = async (document: KnowledgeBase) => {
    if (confirm(`Are you sure you want to delete "${document.filename}"? This cannot be undone.`)) {
      await deleteKnowledgeBase(document.id);
    }
  };

  if (isLoading && knowledgeBases.length === 0) {
    return (
      <div>
        <div className="p-4 flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search documents..."
              className="pl-10 w-full"
              value={searchQuery}
              onChange={handleSearchChange}
              disabled
            />
          </div>
          <Button asChild className="ml-4" disabled>
            <Link href="/knowledge-base/upload">
              <Plus className="mr-2 h-4 w-4" />
              Upload
            </Link>
          </Button>
        </div>
        <div className="rounded-md">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-3 px-4 text-left font-medium"><Skeleton className="h-4 w-1/2" /></th>
                <th className="py-3 px-4 text-left font-medium"><Skeleton className="h-4 w-1/4" /></th>
                <th className="py-3 px-4 text-right font-medium"><Skeleton className="h-4 w-1/4" /></th>
              </tr>
            </thead>
            <tbody>
              {[...Array(3)].map((_, index) => (
                <tr key={index} className={index !== 2 ? 'border-b' : ''}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-md" />
                      <div>
                        <Skeleton className="h-4 w-48 mb-1" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Documents</AlertTitle>
          <AlertDescription>
            {error} - Please try refreshing the page or contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <div className="p-4 flex items-center justify-between border-b mb-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search documents by name or ID..."
            className="pl-10 w-full"
            value={searchQuery}
            onChange={handleSearchChange}
            disabled={isLoading}
          />
        </div>
        <Button asChild className="ml-4 rounded-full" disabled={isLoading}>
          <Link href="/knowledge-base/upload">
            <Plus className="mr-2 h-4 w-4" />
            Upload Document
          </Link>
        </Button>
      </div>

      {!isLoading && filteredDocuments.length === 0 && (
        <div className="p-10 text-center">
          {searchQuery ? (
            <>
              <Search className="mx-auto h-10 w-10 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-1">No Documents Found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Your search for "{searchQuery}" did not match any documents.
              </p>
              <Button variant="outline" onClick={() => setSearchQuery('')} className="rounded-full">
                Clear Search
              </Button>
            </>
          ) : (
            <>
              <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Documents Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload your first document to build your knowledge base.
              </p>
              <Button asChild className="rounded-full bg-amber-500 hover:bg-amber-600">
                <Link href="/knowledge-base/upload">Upload Document</Link>
              </Button>
            </>
          )}
        </div>
      )}

      {filteredDocuments.length > 0 && (
        <div className="rounded-md border mx-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="py-2 px-4 text-left font-medium">Filename</th>
                <th className="py-2 px-4 text-left font-medium">Created</th>
                <th className="py-2 px-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((doc, index) => (
                <tr key={doc.id} className={index !== filteredDocuments.length - 1 ? 'border-b' : ''}>
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-amber-50 p-2">
                        <FileText className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <div className="font-medium truncate max-w-xs md:max-w-md lg:max-w-lg" title={doc.filename}>{doc.filename}</div>
                        <div className="text-xs text-muted-foreground">ID: {doc.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-4 text-muted-foreground">{formatDate(doc.createdAt)}</td>
                  <td className="py-2 px-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(doc)}
                        disabled={isLoading}
                        className="h-8 w-8 rounded-full bg-red-50 hover:bg-red-100 text-red-600 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-70"
                        title="Delete Knowledge Base"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

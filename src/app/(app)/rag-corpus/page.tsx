'use client';

import React, { useState, useRef } from 'react';
import {
  Database,
  Plus,
  Trash2,
  Loader2,
  FileUp,
  Calendar,
  Layers,
  ArrowLeft,
  RefreshCw,
  FilePlus,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { DashboardHeader } from '@/components/dashboard-header';
import { PaperCard, PaperCardContent } from '@/components/ui/paper-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useRagCorpus } from '@/app/hooks/use-rag-corpus';

function CorpusCard({
  corpus,
  onDelete,
  onAddFile,
  deleting,
}: {
  corpus: any;
  onDelete: (id: string) => void;
  onAddFile: (id: string) => void;
  deleting: boolean;
}) {
  return (
    <div className={cn(
      'group flex items-center justify-between p-5 rounded-md border transition-all',
      'bg-card/50 border-border/30 hover:border-border/60',
    )}>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <Database size={18} />
        </div>
        <div className="flex flex-col min-w-0 gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground truncate">
              {corpus.name}
            </span>
            <Badge
              variant="outline"
              className={cn(
                'text-[8px] font-bold uppercase tracking-widest px-1.5 py-0 h-4 flex-shrink-0',
                corpus.status === 'active'
                  ? 'border-green-500/30 text-green-600 bg-green-500/5'
                  : 'border-yellow-500/30 text-yellow-600 bg-yellow-500/5',
              )}
            >
              {corpus.status || 'active'}
            </Badge>
          </div>
          {corpus.description && (
            <span className="text-[11px] text-muted-foreground truncate">{corpus.description}</span>
          )}
          <div className="flex items-center gap-3 mt-0.5">
            <span className="flex items-center gap-1 text-[9px] text-muted-foreground/60 font-medium uppercase tracking-widest">
              <Layers size={9} />
              {corpus.fileCount || 0} file{(corpus.fileCount || 0) !== 1 ? 's' : ''}
            </span>
            {corpus.createdAt && (
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground/60 font-medium uppercase tracking-widest">
                <Calendar size={9} />
                {new Date(corpus.createdAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0 ml-4">
        <button
          onClick={() => onAddFile(corpus.id)}
          className="h-8 w-8 inline-flex items-center justify-center rounded-[4px] border border-border/30 text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all"
          title="Add file to corpus"
        >
          <FilePlus size={13} />
        </button>
        <button
          onClick={() => onDelete(corpus.id)}
          disabled={deleting}
          className="h-8 w-8 inline-flex items-center justify-center rounded-[4px] border border-border/30 text-muted-foreground hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 transition-all disabled:opacity-50"
          title="Delete corpus"
        >
          {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        </button>
      </div>
    </div>
  );
}

export default function RagCorpusPage() {
  const router = useRouter();
  const { corpora, loading, saving, fetchCorpora, createCorpus, addFile, deleteCorpus } = useRagCorpus();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddFileDialog, setShowAddFileDialog] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [newFilename, setNewFilename] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);

  // Add file form state
  const [addFileContent, setAddFileContent] = useState('');
  const [addFilename, setAddFilename] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setContent: (s: string) => void, setName: (s: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setContent(ev.target?.result as string || '');
    };
    reader.readAsText(file);
  };

  const handleCreate = async () => {
    if (!newName.trim() || (!newFileContent.trim() && !newFilename)) return;
    setIsUploading(true);
    const result = await createCorpus({
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      file_text: newFileContent,
      filename: newFilename || `${newName.trim().toLowerCase().replace(/\s+/g, '-')}.txt`,
    });
    if (result) {
      setShowCreateDialog(false);
      setNewName('');
      setNewDescription('');
      setNewFileContent('');
      setNewFilename('');
    }
    setIsUploading(false);
  };

  const handleAddFile = async () => {
    if (!showAddFileDialog || !addFileContent.trim()) return;
    setIsUploading(true);
    const success = await addFile(showAddFileDialog, {
      file_text: addFileContent,
      filename: addFilename || 'document.txt',
    });
    if (success) {
      setShowAddFileDialog(null);
      setAddFileContent('');
      setAddFilename('');
    }
    setIsUploading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this corpus? It will be automatically detached from any assistants using it.')) return;
    setDeletingId(id);
    await deleteCorpus(id);
    setDeletingId(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <DashboardHeader />

      <main className="flex-1 p-6 md:p-8 max-w-4xl mx-auto w-full space-y-10 pb-32">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4 border-b border-border/40">
          <div className="space-y-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft size={12} /> Back
            </button>
            <div className="flex items-center gap-4">
              <h1 className="text-5xl font-medium tracking-tighter text-foreground">RAG Corpora</h1>
              <Badge
                variant="outline"
                className="text-[10px] font-bold px-2 py-0.5 rounded-[2px] border-border text-muted-foreground uppercase tracking-widest font-mono"
              >
                {corpora.length} total
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              Upload documents to create searchable corpora. Attach them to assistants for real-time retrieval during calls.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => fetchCorpora()}
              disabled={loading}
              className="h-10 px-4 gap-2 border-border text-[10px] font-bold uppercase tracking-widest"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </Button>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="h-10 px-4 gap-2 bg-foreground text-background hover:bg-foreground/90 text-[10px] font-bold uppercase tracking-widest"
            >
              <Plus size={14} />
              New Corpus
            </Button>
          </div>
        </div>

        {/* Info banner */}
        <PaperCard className="bg-primary/5 border-primary/10">
          <PaperCardContent className="p-4 flex items-start gap-3">
            <Database size={16} className="text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-foreground">How RAG works</p>
              <p className="text-[11px] text-muted-foreground">
                Create a corpus, upload documents, then attach it to an assistant from the assistant's Advanced settings.
                During live calls, the agent searches your documents in real-time to answer questions accurately.
              </p>
            </div>
          </PaperCardContent>
        </PaperCard>

        {/* Corpus List */}
        <div className="space-y-3">
          {loading && corpora.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loading corpora...</p>
            </div>
          ) : corpora.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center border border-dashed border-border/50 rounded-lg">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                <Database size={24} className="text-muted-foreground/30" />
              </div>
              <h3 className="text-lg font-medium tracking-tight text-foreground">No RAG Corpora</h3>
              <p className="text-sm text-muted-foreground max-w-[300px]">
                Create your first corpus by uploading a document. Your assistants can then search through it during calls.
              </p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="h-9 gap-2 bg-foreground text-background hover:bg-foreground/90 text-[10px] font-bold uppercase tracking-widest"
              >
                <Plus size={12} /> Create First Corpus
              </Button>
            </div>
          ) : (
            corpora.map((corpus) => (
              <CorpusCard
                key={corpus.id}
                corpus={corpus}
                onDelete={handleDelete}
                onAddFile={(id) => setShowAddFileDialog(id)}
                deleting={deletingId === corpus.id}
              />
            ))
          )}
        </div>
      </main>

      {/* Create Corpus Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg border-border/40 bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-medium tracking-tight">
              <Database className="text-primary" size={20} />
              New RAG Corpus
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Upload a document to create a searchable knowledge corpus.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Product FAQ, Company Policies"
                className="h-10 text-sm bg-background border-border/40"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Description (optional)</label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Brief description of what this corpus contains"
                className="h-10 text-sm bg-background border-border/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Document</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 border-2 border-dashed border-border/40 hover:border-primary/40 rounded-md flex flex-col items-center justify-center gap-2 cursor-pointer bg-muted/[0.02] hover:bg-primary/[0.02] transition-all"
              >
                <FileUp size={20} className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{newFilename || 'Click to upload a text file'}</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.csv,.json,.html,.xml"
                className="hidden"
                onChange={(e) => handleFileUpload(e, setNewFileContent, setNewFilename)}
              />
              {!newFilename && (
                <div className="space-y-1.5 mt-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Or paste text content</label>
                  <textarea
                    value={newFileContent}
                    onChange={(e) => setNewFileContent(e.target.value)}
                    placeholder="Paste your document content here..."
                    rows={4}
                    className="w-full px-3 py-2 border border-border/40 rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isUploading || !newName.trim() || (!newFileContent.trim())}
              className="gap-2 bg-foreground text-background hover:bg-foreground/90"
            >
              {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create Corpus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add File Dialog */}
      <Dialog open={!!showAddFileDialog} onOpenChange={(open) => !open && setShowAddFileDialog(null)}>
        <DialogContent className="sm:max-w-lg border-border/40 bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-medium tracking-tight">
              <FilePlus className="text-primary" size={20} />
              Add File to Corpus
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Upload an additional document to this corpus.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div
              onClick={() => addFileInputRef.current?.click()}
              className="p-6 border-2 border-dashed border-border/40 hover:border-primary/40 rounded-md flex flex-col items-center justify-center gap-2 cursor-pointer bg-muted/[0.02] hover:bg-primary/[0.02] transition-all"
            >
              <FileUp size={20} className="text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{addFilename || 'Click to upload a text file'}</p>
            </div>
            <input
              ref={addFileInputRef}
              type="file"
              accept=".txt,.md,.csv,.json,.html,.xml"
              className="hidden"
              onChange={(e) => handleFileUpload(e, setAddFileContent, setAddFilename)}
            />
            {!addFilename && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Or paste text</label>
                <textarea
                  value={addFileContent}
                  onChange={(e) => setAddFileContent(e.target.value)}
                  placeholder="Paste document content..."
                  rows={4}
                  className="w-full px-3 py-2 border border-border/40 rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowAddFileDialog(null)} disabled={isUploading}>
              Cancel
            </Button>
            <Button
              onClick={handleAddFile}
              disabled={isUploading || !addFileContent.trim()}
              className="gap-2 bg-foreground text-background hover:bg-foreground/90"
            >
              {isUploading ? <Loader2 size={14} className="animate-spin" /> : <FilePlus size={14} />}
              Add File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

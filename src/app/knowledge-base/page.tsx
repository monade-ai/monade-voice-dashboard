'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  FileText,
  Search,
  Plus,
  Upload,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
  FileUp,
  X,
} from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useKnowledgeBase, KnowledgeBase } from '@/app/hooks/use-knowledge-base';
import { useAssistants } from '@/app/hooks/use-assistants-context';
import { useTranslations } from '@/i18n/translations-context';

import { useToast } from './hooks/use-toast';

// Format relative date
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

// Helper to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const rawResult = reader.result as string;
      const base64Content = rawResult.includes(',') ? rawResult.split(',')[1] : rawResult;
      resolve(base64Content);
    };
    reader.onerror = (error) => reject(error);
  });
};

// ============ ALL ENTRIES TAB ============
function AllEntriesTab() {
  const { knowledgeBases, isLoading, error, deleteKnowledgeBase } = useKnowledgeBase();
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return knowledgeBases;
    const searchLower = searchQuery.toLowerCase();
    return knowledgeBases.filter(
      (kb) =>
        kb.filename.toLowerCase().includes(searchLower) ||
        kb.id.toLowerCase().includes(searchLower)
    );
  }, [searchQuery, knowledgeBases]);

  const handleDelete = async (entry: KnowledgeBase) => {
    if (confirm(`Delete "${entry.filename}"? This cannot be undone.`)) {
      await deleteKnowledgeBase(entry.id);
    }
  };

  if (isLoading && knowledgeBases.length === 0) {
    return (
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search entries..." className="pl-10" disabled />
        </div>
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-3 px-4 text-left"><Skeleton className="h-4 w-20" /></th>
                <th className="py-3 px-4 text-left"><Skeleton className="h-4 w-16" /></th>
                <th className="py-3 px-4 text-right"><Skeleton className="h-4 w-16" /></th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((i) => (
                <tr key={i} className="border-b last:border-0">
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
                  <td className="py-3 px-4 text-right"><Skeleton className="h-8 w-8 rounded-full" /></td>
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
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Entries</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or ID..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredEntries.length === 0 ? (
        <div className="py-12 text-center">
          {searchQuery ? (
            <>
              <Search className="mx-auto h-10 w-10 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-1">No Results</h3>
              <p className="text-sm text-muted-foreground mb-4">
                No entries match "{searchQuery}"
              </p>
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Clear Search
              </Button>
            </>
          ) : (
            <>
              <FileText className="mx-auto h-10 w-10 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Entries Yet</h3>
              <p className="text-sm text-muted-foreground">
                Create or upload your first knowledge base entry.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="py-2 px-4 text-left font-medium">Name</th>
                <th className="py-2 px-4 text-left font-medium">Created</th>
                <th className="py-2 px-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry, idx) => (
                <tr key={entry.id} className={idx !== filteredEntries.length - 1 ? 'border-b' : ''}>
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-amber-50 p-2">
                        <FileText className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <div className="font-medium truncate max-w-xs" title={entry.filename}>
                          {entry.filename}
                        </div>
                        <div className="text-xs text-muted-foreground">ID: {entry.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-4 text-muted-foreground">{formatDate(entry.createdAt)}</td>
                  <td className="py-2 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(entry)}
                      disabled={isLoading}
                      className="h-8 w-8 rounded-full bg-red-50 hover:bg-red-100 text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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

// ============ CREATE NEW TAB ============
function CreateNewTab() {
  const { createKnowledgeBase, isLoading } = useKnowledgeBase();
  const { assistants } = useAssistants();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: 'Error', description: 'Please enter a title.' });
      return;
    }
    if (!content.trim()) {
      toast({ title: 'Error', description: 'Please enter content.' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert content to base64
      const base64Content = btoa(unescape(encodeURIComponent(content)));

      const success = await createKnowledgeBase({
        kb_text: content,
        filename: `${title.trim()}.txt`,
      });

      if (success) {
        setTitle('');
        setContent('');
        setSelectedAgent('');
        toast({ title: 'Success', description: 'Knowledge base entry created.' });
      }
    } catch (error) {
      console.error('Failed to create entry:', error);
      toast({ title: 'Error', description: 'Failed to create entry.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="Enter a title for this entry..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Content (Markdown)</Label>
        <Textarea
          id="content"
          placeholder="Write your knowledge base content here...&#10;&#10;Supports markdown formatting."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isSubmitting}
          className="min-h-[300px] font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="agent">Attach to Agent (Optional)</Label>
        <Select value={selectedAgent} onValueChange={setSelectedAgent} disabled={isSubmitting}>
          <SelectTrigger id="agent">
            <SelectValue placeholder="Select an agent..." />
          </SelectTrigger>
          <SelectContent>
            {assistants.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          The knowledge base will be available to the selected agent.
        </p>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !title.trim() || !content.trim()}
        className="bg-amber-500 hover:bg-amber-600"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" />
            Create Entry
          </>
        )}
      </Button>
    </div>
  );
}

// ============ UPLOAD FILE TAB ============
function UploadFileTab() {
  const { createKnowledgeBase } = useKnowledgeBase();
  const { assistants } = useAssistants();
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = useCallback(
    async (selectedFile: File) => {
      // Only allow .txt files
      if (!selectedFile.name.toLowerCase().endsWith('.txt')) {
        toast({ title: 'Invalid File', description: 'Only .txt files are supported.' });
        return;
      }

      setFile(selectedFile);
      setIsUploading(true);
      setUploadComplete(false);

      try {
        const base64Content = await fileToBase64(selectedFile);
        const success = await createKnowledgeBase({
          kb_file_base64: base64Content,
          filename: selectedFile.name,
        });

        if (success) {
          setUploadComplete(true);
          toast({ title: 'Success', description: `"${selectedFile.name}" uploaded.` });
        } else {
          setFile(null);
        }
      } catch (error) {
        console.error('Upload failed:', error);
        toast({ title: 'Error', description: 'Failed to upload file.' });
        setFile(null);
      } finally {
        setIsUploading(false);
      }
    },
    [createKnowledgeBase, toast]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      processFile(e.target.files[0]);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setUploadComplete(false);
    const input = document.getElementById('kb-file-upload') as HTMLInputElement;
    if (input) input.value = '';
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <Label>Upload .txt File</Label>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
            isDragging
              ? 'border-amber-500 bg-amber-50'
              : uploadComplete
              ? 'border-green-500 bg-green-50'
              : 'border-muted-foreground/20 hover:border-amber-500/50 hover:bg-amber-50/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-10 w-10 text-amber-500 animate-spin mb-4" />
              <h3 className="text-lg font-semibold">Uploading...</h3>
              <p className="mt-1 text-sm text-muted-foreground">Please wait</p>
            </div>
          ) : uploadComplete && file ? (
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-green-100 p-3 mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-green-700">Upload Complete!</h3>
              <p className="mt-1 text-sm text-green-600 truncate max-w-xs">
                "{file.name}" uploaded successfully.
              </p>
              <Button variant="outline" className="mt-4" onClick={resetUpload}>
                Upload Another File
              </Button>
            </div>
          ) : (
            <>
              <FileUp className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-2 text-lg font-semibold">Drag & Drop .txt File</h3>
              <p className="mt-1 text-sm text-muted-foreground">Or click to browse</p>
              <Input
                id="kb-file-upload"
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".txt"
              />
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => document.getElementById('kb-file-upload')?.click()}
              >
                Browse Files
              </Button>
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Only .txt files are supported.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="upload-agent">Attach to Agent (Optional)</Label>
        <Select value={selectedAgent} onValueChange={setSelectedAgent} disabled={isUploading}>
          <SelectTrigger id="upload-agent">
            <SelectValue placeholder="Select an agent..." />
          </SelectTrigger>
          <SelectContent>
            {assistants.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          The uploaded file will be available to the selected agent.
        </p>
      </div>
    </div>
  );
}

// ============ MAIN PAGE ============
export default function KnowledgeBasePage() {
  const { t } = useTranslations();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{t('knowledgeBase.title')}</h1>
        <p className="text-muted-foreground">{t('knowledgeBase.description')}</p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            All Entries
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload File
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <AllEntriesTab />
        </TabsContent>

        <TabsContent value="create" className="mt-0">
          <CreateNewTab />
        </TabsContent>

        <TabsContent value="upload" className="mt-0">
          <UploadFileTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

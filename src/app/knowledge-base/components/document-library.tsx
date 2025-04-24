'use client';

import { useState, useEffect } from 'react';
import { useAssistants } from '@/app/hooks/use-assistants-context';
import Link from 'next/link';
import { Download, FileText, Trash2, Zap, FileType, FileSpreadsheet, File, FileCode, Search, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { areSimilar } from '@/lib/utils/levenshtein';

import { DocumentMetadata, DocumentStorage } from '../api/knowldege-api';
import { PublishPromptDialog } from '../components/publish-prompt-dialog';
import { useToast } from '../hooks/use-toast';

// Helper function to get the appropriate icon based on file type
const getFileIcon = (fileType: string) => {
  switch (fileType.toLowerCase()) {
  case 'pdf':
    return <FileText className="h-5 w-5 text-red-600" />;
  case 'docx':
  case 'doc':
    return <FileType className="h-5 w-5 text-blue-600" />;
  case 'csv':
  case 'xlsx':
  case 'xls':
    return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  case 'txt':
    return <File className="h-5 w-5 text-slate-600" />;
  case 'html':
  case 'json':
  case 'xml':
    return <FileCode className="h-5 w-5 text-purple-600" />;
  default:
    return <FileText className="h-5 w-5 text-amber-600" />;
  }
};

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';

  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// Helper function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString();
};

export function DocumentLibrary() {
  const { assistants } = useAssistants();
  const assistantPhoneNumbers = assistants.map(a => a.phoneNumber).filter((p): p is string => !!p);

  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentMetadata | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentMetadata[]>([]);
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const { toast } = useToast();

  // Load documents from storage when component mounts
  useEffect(() => {
    const loadDocuments = () => {
      const docs = DocumentStorage.getAllDocuments();
      setDocuments(docs);
      setFilteredDocuments(docs);
    };
    
    loadDocuments();
    
    // Set up event listener for storage changes
    window.addEventListener('storage', loadDocuments);
    
    return () => {
      window.removeEventListener('storage', loadDocuments);
    };
  }, []);

  // Filter documents based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredDocuments(documents);

      return;
    }

    const filtered = documents.filter(doc => {
      const searchLower = searchQuery.toLowerCase();

      return (
        areSimilar(doc.title, searchQuery) ||
        (doc.description && doc.description.toLowerCase().includes(searchLower)) ||
        doc.fileType.toLowerCase().includes(searchLower)
      );
    });

    setFilteredDocuments(filtered);
  }, [searchQuery, documents]);

  // Handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handlePublish = (document: DocumentMetadata) => {
    setSelectedDocument(document);
    setIsPublishOpen(true);
  };

  const handleDownload = (document: DocumentMetadata) => {
    try {
      // Convert base64 to blob
      const byteCharacters = atob(document.content);
      const byteArrays = [];
      
      for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
        const slice = byteCharacters.slice(offset, offset + 1024);
        
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      const blob = new Blob(byteArrays);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.title;
      window.document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        window.document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
      
      toast({
        title: 'Download started',
        description: `${document.title} is being downloaded.`,
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: 'Download failed',
        description: 'Failed to download the document. Please try again.',
      });
    }
  };
  
  const handleDelete = (document: DocumentMetadata) => {
    if (confirm(`Are you sure you want to delete "${document.title}"?`)) {
      const success = DocumentStorage.deleteDocument(document.id);
      
      if (success) {
        setDocuments(prev => prev.filter(doc => doc.id !== document.id));
        setFilteredDocuments(prev => prev.filter(doc => doc.id !== document.id));
        
        toast({
          title: 'Document deleted',
          description: `${document.title} has been removed from your knowledge base.`,
        });
      } else {
        toast({
          title: 'Deletion failed',
          description: 'Failed to delete the document. Please try again.',
        });
      }
    }
  };

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
          />
        </div>
        <Button asChild className="ml-4">
          <Link href="/knowledge-base/upload">
            <Plus className="mr-2 h-4 w-4" />
            Upload
          </Link>
        </Button>
      </div>
      
      {filteredDocuments.length === 0 && (
        <div className="p-10 text-center">
          {searchQuery ? (
            <>
              <Search className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No documents found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Try adjusting your search query or upload a new document
              </p>
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Clear Search
              </Button>
            </>
          ) : (
            <>
              <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No documents yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload your first document to enhance your AI agents' knowledge
              </p>
              <Button asChild>
                <Link href="/knowledge-base/upload">Upload Document</Link>
              </Button>
            </>
          )}
        </div>
      )}
      
      {filteredDocuments.length > 0 && (
        <div className="rounded-md">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-3 px-4 text-left font-medium">Document</th>
                <th className="py-3 px-4 text-left font-medium">Size</th>
                <th className="py-3 px-4 text-left font-medium">Uploaded</th>
                <th className="py-3 px-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((doc, index) => (
                <tr key={doc.id} className={index !== filteredDocuments.length - 1 ? 'border-b' : ''}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-blue-50 p-2">
                        {getFileIcon(doc.fileType)}
                      </div>
                      <div>
                        <div className="font-medium">{doc.title}</div>
                        <div className="text-sm text-muted-foreground">{doc.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className="font-normal">
                      {formatFileSize(doc.fileSize)} • {doc.fileType}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{formatDate(doc.uploadedAt)}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePublish(doc)}
                        className="h-9 w-9 rounded-full bg-amber-50 hover:bg-amber-100 shadow-sm hover:shadow transition-all duration-200"
                      >
                        <Zap className="h-4 w-4 text-amber-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(doc)}
                        className="h-9 w-9 rounded-full bg-blue-50 hover:bg-blue-100 shadow-sm hover:shadow transition-all duration-200"
                      >
                        <Download className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(doc)}
                        className="h-9 w-9 rounded-full bg-red-50 hover:bg-red-100 shadow-sm hover:shadow transition-all duration-200"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedDocument && (
        <PublishPromptDialog
          open={isPublishOpen}
          onOpenChange={setIsPublishOpen}
          promptTitle={selectedDocument.title}
        />
      )}
    </div>
  );
}

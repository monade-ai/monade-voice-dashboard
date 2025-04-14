"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useTranslations } from "@/i18n/translations-context"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  FileText, 
  FileType,
  FileSpreadsheet,
  File, 
  FileCode,
  Trash2, 
  Zap
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PublishPromptDialog } from "../components/publish-prompt-dialog"
import { DocumentMetadata, DocumentStorage } from "../api/knowldege-api"
import { useToast } from "../hooks/use-toast"

// Helper function to get the appropriate icon based on file type
const getFileIcon = (fileType: string) => {
  switch(fileType.toLowerCase()) {
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
  
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
};

export function DocumentCarousel() {
  const { t } = useTranslations();
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPublishOpen, setIsPublishOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<DocumentMetadata | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleCards, setVisibleCards] = useState(3)
  const [documents, setDocuments] = useState<DocumentMetadata[]>([])
  const { toast } = useToast()

  // Load documents from storage on mount
  useEffect(() => {
    const loadDocuments = () => {
      const docs = DocumentStorage.getAllDocuments();
      setDocuments(docs);
    };
    
    loadDocuments();
    
    // Set up event listener for storage changes
    window.addEventListener('storage', loadDocuments);
    
    return () => {
      window.removeEventListener('storage', loadDocuments);
    };
  }, []);

  useEffect(() => {
    const updateVisibleCards = () => {
      if (window.innerWidth < 640) {
        setVisibleCards(1)
      } else if (window.innerWidth < 1024) {
        setVisibleCards(2)
      } else {
        setVisibleCards(3)
      }
    }

    updateVisibleCards()
    window.addEventListener("resize", updateVisibleCards)
    return () => window.removeEventListener("resize", updateVisibleCards)
  }, [])

  const maxIndex = Math.max(0, documents.length - visibleCards)

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1))
  }

  const handlePublish = (document: DocumentMetadata) => {
    setSelectedDocument(document)
    setIsPublishOpen(true)
  }
  
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
      const a = document.createElement('a');
      a.href = url;
      a.download = document.title;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
      
      toast({
        title: "Download started",
        description: `${document.title} is being downloaded.`
      });
    } catch (error) {
      console.error("Error downloading document:", error);
      toast({
        title: "Download failed",
        description: "Failed to download the document. Please try again."
      });
    }
  }
  
  const handleDelete = (document: DocumentMetadata) => {
    if (confirm(`Are you sure you want to delete "${document.title}"?`)) {
      const success = DocumentStorage.deleteDocument(document.id);
      
      if (success) {
        setDocuments(prev => prev.filter(doc => doc.id !== document.id));
        
        toast({
          title: "Document deleted",
          description: `${document.title} has been removed from your knowledge base.`
        });
      } else {
        toast({
          title: "Deletion failed",
          description: "Failed to delete the document. Please try again."
        });
      }
    }
  }

  return (
    <div className="relative">
      {documents.length === 0 ? (
        <div className="py-8 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No documents yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload your first document to enhance your AI agents' knowledge
          </p>
          <Button asChild className="rounded-full">
            <Link href="/knowledge-base/upload">Upload Document</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="overflow-hidden px-1 py-4">
            <div
              ref={containerRef}
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentIndex * (100 / visibleCards)}%)` }}
            >
              {documents.map((document) => (
                <div key={document.id} className={cn("px-2 transition-opacity duration-300", `w-full sm:w-1/2 lg:w-1/3`)}>
                  <Card className="h-full transform transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-amber-50 p-2 flex-shrink-0">
                          {getFileIcon(document.fileType)}
                        </div>
                        <div>
                          <CardTitle className="text-base font-medium leading-tight">{document.title}</CardTitle>
                          <CardDescription className="mt-1 line-clamp-2 text-xs">{document.description}</CardDescription>
                          <div className="mt-2 flex items-center text-xs text-muted-foreground">
                            <span className="inline-block px-2 py-0.5 bg-slate-100 rounded-full text-[10px] font-medium">
                              {formatFileSize(document.fileSize)} • {document.fileType}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardFooter className="flex justify-between border-t pt-2 pb-2 mt-1">
                      <div className="text-[10px] text-muted-foreground">{formatDate(document.uploadedAt)}</div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePublish(document)}
                          className="h-7 w-7 rounded-full bg-amber-50 hover:bg-amber-100 shadow-sm hover:shadow transition-all duration-200"
                        >
                          <Zap className="h-3.5 w-3.5 text-amber-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(document)}
                          className="h-7 w-7 rounded-full bg-slate-50 hover:bg-slate-100 shadow-sm hover:shadow transition-all duration-200"
                        >
                          <Download className="h-3.5 w-3.5 text-slate-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(document)}
                          className="h-7 w-7 rounded-full bg-red-50 hover:bg-red-100 shadow-sm hover:shadow transition-all duration-200"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrev}
              disabled={currentIndex === 0 || documents.length === 0}
              className={cn(
                "rounded-full transition-opacity",
                (currentIndex === 0 || documents.length === 0) ? "opacity-50 cursor-not-allowed" : "hover:bg-amber-50",
              )}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <Button variant="outline" asChild className="rounded-full px-6">
              <Link href="/knowledge-base/documents">View All Documents</Link>
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              disabled={currentIndex >= maxIndex || documents.length <= visibleCards}
              className={cn(
                "rounded-full transition-opacity",
                (currentIndex >= maxIndex || documents.length <= visibleCards) ? "opacity-50 cursor-not-allowed" : "hover:bg-amber-50",
              )}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </>
      )}

      {selectedDocument && (
        <PublishPromptDialog
          open={isPublishOpen}
          onOpenChange={setIsPublishOpen}
          promptTitle={selectedDocument.title}
        />
      )}
    </div>
  )
}
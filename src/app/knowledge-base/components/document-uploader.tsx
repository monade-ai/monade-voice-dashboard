'use client';

import { useState, useCallback } from 'react';
import { FileUp, X, Check, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useToast } from '../hooks/use-toast';
import { useKnowledgeBase } from '@/app/hooks/use-knowledge-base';
import { useHasPermission } from '@/lib/auth/useHasPermission';

export function DocumentUploader() {
  const canUploadDocument = useHasPermission('knowledgeBase.upload');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const { toast } = useToast();
  const { createKnowledgeBase } = useKnowledgeBase();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processAndUploadFile = useCallback(async (selectedFile: File) => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setUploadComplete(false);

    try {
      const base64Content = await fileToBase64(selectedFile);

      console.log('[DocumentUploader] base64Content generated:', base64Content ? base64Content.substring(0, 50) + '...' : '(falsy)');

      const payload = {
        kb_file_base64: base64Content,
        filename: selectedFile.name,
      };
      console.log('[DocumentUploader] Payload for createKnowledgeBase:', payload);

      const success = await createKnowledgeBase(payload);

      console.log("Success:", success);

      if (success) {
        setUploadComplete(true);
        setFile(selectedFile);
        toast({
          title: 'Upload Initiated',
          description: `"${selectedFile.name}" processing started successfully.`,
        });
      } else {
        setFile(null);
        toast({
          title: 'Upload Failed',
          description: `Processing failed for "${selectedFile.name}". Check console or previous errors for details.`,
        });
      }
    } catch (error) {
      console.error('Failed to process or upload file:', error);
      toast({
        title: 'Component Error',
        description: 'An error occurred within the uploader component during file processing.',
      });
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  }, [createKnowledgeBase, toast]);

  const handleDrop = (e: React.DragEvent) => {
    console.log('[DocumentUploader] handleDrop triggered');
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      console.log('[DocumentUploader] Calling processAndUploadFile from handleDrop');
      processAndUploadFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[DocumentUploader] handleFileChange triggered');
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      console.log('[DocumentUploader] Calling processAndUploadFile from handleFileChange');
      processAndUploadFile(selectedFile);
    }
  };

  const removeFile = () => {
    setFile(null);
    setUploadComplete(false);
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const rawResult = reader.result as string;
        console.log('[DocumentUploader] fileToBase64 rawResult:', rawResult ? rawResult.substring(0, 100) + '...' : '(falsy)');
        const base64Content = rawResult.includes(',') ? rawResult.split(',')[1] : rawResult;
        console.log('[DocumentUploader] fileToBase64 processed base64Content:', base64Content ? base64Content.substring(0, 50) + '...' : '(falsy)');
        resolve(base64Content);
      };
      reader.onerror = error => {
        console.error('[DocumentUploader] fileToBase64 FileReader error:', error);
        reject(error);
      };
    });
  };

  return (
    <div className="space-y-6">
      {canUploadDocument ? (
        <div className="space-y-2">
          <Label>Upload Document</Label>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${isDragging
              ? 'border-primary bg-primary/5'
              : uploadComplete
                ? 'border-green-500 bg-green-50'
                : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5'
              }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isProcessing ? (
              <div className="flex flex-col items-center">
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                <h3 className="text-lg font-semibold">Processing...</h3>
                <p className="mt-1 text-sm text-muted-foreground">Please wait while we process and upload your document</p>
              </div>
            ) : uploadComplete && file ? (
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-green-100 p-3 mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-green-700">Upload Complete!</h3>
                <p className="mt-1 text-sm text-green-600 truncate max-w-xs" title={file.name}>"{file.name}" uploaded successfully.</p>
                <Button variant="outline" className="mt-4" onClick={removeFile}>
                  Upload Another File
                </Button>
              </div>
            ) : (
              <>
                <FileUp className="mx-auto h-10 w-10 text-muted-foreground" />
                <h3 className="mt-2 text-lg font-semibold">Drag & Drop File Here</h3>
                <p className="mt-1 text-sm text-muted-foreground">Or click to browse your files (upload one at a time)</p>
                <Input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".txt,.pdf,.docx,.html,.json,.csv,.md" />
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  type="button"
                  disabled={isProcessing}
                >
                  Browse File
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
          You do not have permission to upload documents.
        </div>
      )}

      {file && !uploadComplete && !isProcessing && (
        <div className="space-y-2">
          <Label>Selected File</Label>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-2 overflow-hidden">
                <FileUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium truncate" title={file.name}>{file.name}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
              <Button variant="ghost" size="icon" onClick={removeFile} type="button">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

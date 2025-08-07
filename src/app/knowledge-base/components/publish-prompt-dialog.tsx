'use client';

import { useState, useEffect } from 'react';
import { Check, Zap, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';

import { useAssistants } from '@/app/hooks/use-assistants-context';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

import { RadioGroup, RadioGroupItem } from '../../../components/ui/radio-group';
import { updateSystemPrompt, DocumentStorage } from '../api/knowldege-api';
import { useToast } from '../hooks/use-toast';

interface PublishPromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  promptTitle: string
  documentContent?: { 
    file?: File;
    title: string;
    markdown?: string;
  } | null
}

export function PublishPromptDialog({ 
  open, 
  onOpenChange, 
  promptTitle,
  documentContent,
}: PublishPromptDialogProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setError(null);
      
      // Only reset success and selected agent if we've completed an operation
      if (isSuccess) {
        setIsSuccess(false);
        setSelectedAgent(null);
      }
    }
  }, [open, isSuccess]);

  const { assistants } = useAssistants();
  console.log('[PublishPromptDialog] assistants from context:', assistants);
  const agents = assistants.map(a => ({
    id: a.id,
    name: a.name,
    description: a.description || '',
    active: true,
  }));

  const fileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      // Use readAsArrayBuffer to get raw binary data
      reader.readAsArrayBuffer(file);
      
      reader.onload = () => {
        try {
          // Convert ArrayBuffer to UTF-8 encoded string if it's a text file
          // or keep as binary for non-text files
          const arrayBuffer = reader.result as ArrayBuffer;
          const bytes = new Uint8Array(arrayBuffer);
          
          // Convert bytes to binary string
          let binaryString = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binaryString += String.fromCharCode(bytes[i]);
          }
          
          // Base64 encode the binary string
          const base64Content = btoa(binaryString);
          console.log(`Base64 encoded file: ${file.name}, first 50 chars:`, base64Content.substring(0, 50));
          
          resolve(base64Content);
        } catch (error) {
          console.error('Error in base64 encoding:', error);
          reject(error);
        }
      };
      
      reader.onerror = error => {
        console.error('Error reading file:', error);
        reject(error);
      };
    });
  };

  const handlePublish = async () => {
    if (!selectedAgent) return;
    
    setIsPublishing(true);
    setError(null);

    try {
      let base64Content = '';
      
      // Handle document content if provided
      if (documentContent) {
        // Case 1: Document with file
        if (documentContent.file) {
          base64Content = await fileToBase64(documentContent.file);
        } 
        // Case 2: Prompt with markdown content
        else if (documentContent.markdown) {
          // Properly encode markdown content to Base64
          try {
            // 1. Encode as UTF-8
            const encoder = new TextEncoder();
            const utf8Bytes = encoder.encode(documentContent.markdown);
            
            // 2. Convert to base64
            // Convert the Uint8Array to a binary string
            let binaryString = '';
            for (let i = 0; i < utf8Bytes.length; i++) {
              binaryString += String.fromCharCode(utf8Bytes[i]);
            }
            
            // Base64 encode the binary string
            base64Content = btoa(binaryString);
            
            console.log('Publishing markdown content (first 50 chars):', documentContent.markdown.substring(0, 50));
            console.log('Base64 encoded markdown (first 50 chars):', base64Content.substring(0, 50));
          } catch (error) {
            console.error('Error encoding markdown to base64:', error);
            throw new Error(`Failed to encode markdown: ${error}`);
          }
        }
        // Case 3: Neither file nor markdown - check storage
        else {
          // Check if we have the document in storage
          const documents = DocumentStorage.getAllDocuments();
          const latestDoc = documents[documents.length - 1];
          
          if (latestDoc) {
            base64Content = latestDoc.content;
          } else {
            throw new Error('No document content found to publish');
          }
        }
      } else {
        // Fallback to last document in storage
        const documents = DocumentStorage.getAllDocuments();
        const latestDoc = documents[documents.length - 1];
        
        if (latestDoc) {
          base64Content = latestDoc.content;
        } else {
          throw new Error('No document content found to publish');
        }
      }
      
      // Call the API to update the system prompt
      // The API expects a prompt_base64 field with the base64 string
      // Make sure we're sending exactly in the expected format
      console.log('Sending base64 content to API - first 50 chars:', base64Content.substring(0, 50));
      const response = await fetch('https://039f-2405-201-d003-d814-fc48-8886-8dad-ad9.ngrok-free.app/update_system_prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt_base64: base64Content,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`API responded with status ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('API Response:', result);
      
      // Update success state
      setIsSuccess(true);
      
      toast({
        title: 'Document published successfully',
        description: `${promptTitle} has been connected to ${agents.find(a => a.id === selectedAgent)?.name}`,
      });
      
      // Auto-close after success
      setTimeout(() => {
        onOpenChange(false);
        setIsSuccess(false);
        setSelectedAgent(null);
      }, 1500);
    } catch (err) {
      console.error('Error publishing document:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      
      toast({
        title: 'Failed to publish',
        description: 'There was an error connecting your document to the agent.',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!isPublishing) {
          onOpenChange(newOpen);
          if (!newOpen) {
            setIsSuccess(false);
            setSelectedAgent(null);
          }
        }
      }}
    >
      <DialogContent className="sm:max-w-[425px] overflow-hidden p-5 shadow-sm border border-border/60">
        {isSuccess ? (
          <div className="py-6 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-[#43B02A]/5 p-3.5 mb-4 ring-1 ring-[#43B02A]/20">
              <CheckCircle2 className="h-8 w-8 text-[#43B02A]" />
            </div>
            <DialogTitle className="text-lg font-medium text-[#43B02A]">Published Successfully!</DialogTitle>
            <DialogDescription className="mt-1.5 text-sm text-foreground/80">
              "{promptTitle}" has been connected to the selected agent
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader className="pb-1">
              <DialogTitle className="text-lg font-medium">Publish Document</DialogTitle>
              <DialogDescription className="text-sm text-foreground/70 mt-1">Connect this document to an AI agent to use it in conversations.</DialogDescription>
            </DialogHeader>
            
            {error && (
              <div className="bg-[#E11900]/5 border border-[#E11900]/20 rounded-md p-2.5 text-[#E11900] text-xs flex items-center gap-2 mb-3 ring-1 ring-[#E11900]/10">
                <AlertTriangle className="h-3.5 w-3.5 text-[#E11900]/90" />
                <span className="leading-tight">{error}</span>
              </div>
            )}
            
            <div className="py-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/90 mb-1.5 inline-block">Select Agent</Label>
                <div className="max-h-[240px] overflow-y-auto pr-1.5 custom-scrollbar rounded-md">
                  <RadioGroup value={selectedAgent || ''} onValueChange={setSelectedAgent} className="space-y-2">
                    {agents.map((agent) => (
                      <div
                        key={agent.id}
                        className={`flex items-center space-x-3 rounded-lg border transition-all duration-150 ${
                          selectedAgent === agent.id
                            ? 'border-primary/50 bg-primary/3 ring-1 ring-primary/20'
                            : 'border-muted/60 hover:border-primary/30 hover:bg-muted/30'
                        } p-2.5`}
                      >
                        <RadioGroupItem 
                          value={agent.id} 
                          id={agent.id} 
                          className="mt-0.5"
                        />
                        <Label htmlFor={agent.id} className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`rounded-full p-1.5 ${selectedAgent === agent.id ? 'bg-primary/10' : 'bg-muted/70'} transition-colors duration-150`}
                              >
                                <Zap
                                  className={`h-3.5 w-3.5 ${selectedAgent === agent.id ? 'text-primary' : 'text-muted-foreground/80'}`}
                                />
                              </div>
                              <span className={`font-medium ${selectedAgent === agent.id ? 'text-primary' : 'text-foreground/90'}`}>
                                {agent.name}
                              </span>
                            </div>
                            {agent.active && (
                              <span className="flex items-center text-xs text-[#43B02A] bg-[#43B02A]/5 px-2 py-0.5 rounded-full ml-2">
                                <Check className="mr-0.5 h-2.5 w-2.5" /> 
                              </span>
                            )}
                          </div>
                          {agent.description && (
                            <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">{agent.description}</p>
                          )}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPublishing}
                className="rounded-md border-muted/70 text-foreground/90 hover:bg-muted/30 hover:text-foreground transition-colors duration-150"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePublish}
                disabled={!selectedAgent || isPublishing}
                className={`rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-150 ${isPublishing ? 'opacity-80' : ''}`}
                size="sm"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> 
                    <span>Publishing...</span>
                  </>
                ) : (
                  <span>Publish</span>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

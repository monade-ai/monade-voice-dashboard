"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "../../../components/ui/radio-group"
import { Check, Zap, CheckCircle2, Loader2, AlertTriangle } from "lucide-react"
import { updateSystemPrompt, DocumentStorage } from "../api/knowldege-api"
import { useToast } from "../hooks/use-toast"

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
  documentContent
}: PublishPromptDialogProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setError(null)
      
      // Only reset success and selected agent if we've completed an operation
      if (isSuccess) {
        setIsSuccess(false)
        setSelectedAgent(null)
      }
    }
  }, [open, isSuccess])

  const agents = [
    {
      id: "support-bot",
      name: "Support Bot",
      description: "Handles customer support inquiries and troubleshooting",
      active: true,
    },
    {
      id: "sales-assistant",
      name: "Sales Assistant",
      description: "Helps with product recommendations and sales inquiries",
      active: true,
    },
    {
      id: "website-bot",
      name: "Website Bot",
      description: "Provides website navigation assistance and general information",
      active: false,
    },
  ]

  const fileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      // Use readAsArrayBuffer to get raw binary data
      reader.readAsArrayBuffer(file)
      
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
          console.error("Error in base64 encoding:", error);
          reject(error);
        }
      }
      
      reader.onerror = error => {
        console.error("Error reading file:", error);
        reject(error);
      }
    })
  }

  const handlePublish = async () => {
    if (!selectedAgent) return
    
    setIsPublishing(true)
    setError(null)

    try {
      let base64Content = ""
      
      // Handle document content if provided
      if (documentContent) {
        // Case 1: Document with file
        if (documentContent.file) {
          base64Content = await fileToBase64(documentContent.file)
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
            
            console.log("Publishing markdown content (first 50 chars):", documentContent.markdown.substring(0, 50));
            console.log("Base64 encoded markdown (first 50 chars):", base64Content.substring(0, 50));
          } catch (error) {
            console.error("Error encoding markdown to base64:", error);
            throw new Error(`Failed to encode markdown: ${error}`);
          }
        }
        // Case 3: Neither file nor markdown - check storage
        else {
          // Check if we have the document in storage
          const documents = DocumentStorage.getAllDocuments()
          const latestDoc = documents[documents.length - 1]
          
          if (latestDoc) {
            base64Content = latestDoc.content
          } else {
            throw new Error("No document content found to publish")
          }
        }
      } else {
        // Fallback to last document in storage
        const documents = DocumentStorage.getAllDocuments()
        const latestDoc = documents[documents.length - 1]
        
        if (latestDoc) {
          base64Content = latestDoc.content
        } else {
          throw new Error("No document content found to publish")
        }
      }
      
      // Call the API to update the system prompt
      // The API expects a prompt_base64 field with the base64 string
      // Make sure we're sending exactly in the expected format
      console.log("Sending base64 content to API - first 50 chars:", base64Content.substring(0, 50));
      const response = await fetch('https://a0f5-122-171-20-156.ngrok-free.app/update_system_prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt_base64: base64Content
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", response.status, errorText);
        throw new Error(`API responded with status ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log("API Response:", result);
      
      // Update success state
      setIsSuccess(true)
      
      toast({
        title: "Document published successfully",
        description: `${promptTitle} has been connected to ${agents.find(a => a.id === selectedAgent)?.name}`,
      })
      
      // Auto-close after success
      setTimeout(() => {
        onOpenChange(false)
        setIsSuccess(false)
        setSelectedAgent(null)
      }, 1500)
    } catch (err) {
      console.error("Error publishing document:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      
      toast({
        title: "Failed to publish",
        description: "There was an error connecting your document to the agent.",
      })
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!isPublishing) {
          onOpenChange(newOpen)
          if (!newOpen) {
            setIsSuccess(false)
            setSelectedAgent(null)
          }
        }
      }}
    >
      <DialogContent className="sm:max-w-[425px] overflow-hidden">
        {isSuccess ? (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-green-100 p-4 mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <DialogTitle className="text-xl text-green-700">Published Successfully!</DialogTitle>
            <DialogDescription className="mt-2">
              "{promptTitle}" has been connected to the selected agent
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Publish Document</DialogTitle>
              <DialogDescription>Connect this document to an AI agent to use it in conversations.</DialogDescription>
            </DialogHeader>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-800 text-sm flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                {error}
              </div>
            )}
            
            <div className="py-4">
              <div className="space-y-2">
                <Label>Select Agent</Label>
                <RadioGroup value={selectedAgent || ""} onValueChange={setSelectedAgent} className="space-y-3">
                  {agents.map((agent) => (
                    <div
                      key={agent.id}
                      className={`flex items-center space-x-2 rounded-md border-2 p-3 transition-all duration-200 ${
                        selectedAgent === agent.id
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "hover:border-primary/30 hover:bg-primary/5"
                      }`}
                    >
                      <RadioGroupItem value={agent.id} id={agent.id} />
                      <Label htmlFor={agent.id} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={`rounded-full p-1 ${selectedAgent === agent.id ? "bg-primary/10" : "bg-muted"}`}
                            >
                              <Zap
                                className={`h-4 w-4 ${selectedAgent === agent.id ? "text-primary" : "text-muted-foreground"}`}
                              />
                            </div>
                            <span className="font-medium">{agent.name}</span>
                          </div>
                          {agent.active && (
                            <span className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                              <Check className="mr-1 h-3 w-3" /> Active
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{agent.description}</p>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPublishing}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePublish}
                disabled={!selectedAgent || isPublishing}
                className={`rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 ${isPublishing ? "opacity-80" : ""}`}
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                    Publishing...
                  </>
                ) : (
                  "Publish"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
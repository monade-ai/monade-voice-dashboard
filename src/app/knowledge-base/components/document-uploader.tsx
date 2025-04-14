"use client"

import { useState, useCallback } from "react"
import { v4 as uuidv4 } from 'uuid'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FileUp, X, Check, Loader2 } from "lucide-react"
import { PublishPromptDialog } from "../components/publish-prompt-dialog"
import { DocumentMetadata, DocumentStorage } from "../api/knowldege-api"
import { useToast } from "../hooks/use-toast"

export function DocumentUploader() {
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [documentTitle, setDocumentTitle] = useState("")
  const [documentDescription, setDocumentDescription] = useState("")
  const [isPublishOpen, setIsPublishOpen] = useState(false)
  const { toast } = useToast()

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files)
      setFiles((prev) => [...prev, ...newFiles])

      // Auto-upload when files are dropped
      if (newFiles.length > 0) {
        setDocumentTitle(newFiles[0].name)
        simulateUpload(newFiles[0])
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...newFiles])

      // Auto-upload when files are selected
      if (newFiles.length > 0) {
        setDocumentTitle(newFiles[0].name)
        simulateUpload(newFiles[0])
      }
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        // Extract the base64 part from the data URL
        const base64 = reader.result as string
        const base64Content = base64.split(',')[1]
        resolve(base64Content)
      }
      reader.onerror = error => reject(error)
    })
  }

  const simulateUpload = async (file: File) => {
    setIsUploading(true)
    try {
      const base64 = await fileToBase64(file)

      // Create document metadata
      const documentMetadata: DocumentMetadata = {
        id: uuidv4(),
        title: documentTitle || file.name,
        description: documentDescription,
        fileType: file.type.split('/')[1]?.toUpperCase() || 'UNKNOWN',
        fileSize: file.size,
        content: base64,
        uploadedAt: new Date().toISOString()
      }

      // Save to storage
      DocumentStorage.saveDocument(documentMetadata)
      
      toast({
        title: "Document uploaded",
        description: `${file.name} has been added to your knowledge base.`
      })

      setUploadComplete(true)
    } catch (error) {
      console.error("Failed to process file:", error)
      toast({
        title: "Upload failed",
        description: "Failed to process the document. Please try again.",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handlePublish = () => {
    setIsPublishOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="document-title">Document Title</Label>
        <Input
          id="document-title"
          placeholder="Enter a title for this document"
          value={documentTitle}
          onChange={(e) => setDocumentTitle(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="document-description">Description (Optional)</Label>
        <Textarea
          id="document-description"
          placeholder="Add a brief description of this document"
          rows={3}
          value={documentDescription}
          onChange={(e) => setDocumentDescription(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Upload Document</Label>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
            isDragging
              ? "border-primary bg-primary/5"
              : uploadComplete
                ? "border-green-500 bg-green-50"
                : "border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {uploadComplete ? (
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-green-100 p-3 mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-green-700">Upload Complete!</h3>
              <p className="mt-1 text-sm text-green-600">Your document has been uploaded successfully</p>
              <Button className="mt-4 bg-green-600 hover:bg-green-700 text-white" onClick={handlePublish}>
                Publish Document
              </Button>
            </div>
          ) : isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <h3 className="text-lg font-semibold">Uploading...</h3>
              <p className="mt-1 text-sm text-muted-foreground">Please wait while we process your document</p>
            </div>
          ) : (
            <>
              <FileUp className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-2 text-lg font-semibold">Drag & Drop Files Here</h3>
              <p className="mt-1 text-sm text-muted-foreground">Or click to browse your files</p>
              <Input id="file-upload" type="file" className="hidden" onChange={handleFileChange} multiple />
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => document.getElementById("file-upload")?.click()}
                type="button"
              >
                Browse Files
              </Button>
            </>
          )}
        </div>
      </div>

      {files.length > 0 && !uploadComplete && (
        <div className="space-y-2">
          <Label>Selected Files</Label>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <FileUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeFile(index)} type="button">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <PublishPromptDialog
        open={isPublishOpen}
        onOpenChange={setIsPublishOpen}
        promptTitle={documentTitle || files[0]?.name || "Document"}
        documentContent={files.length > 0 ? { file: files[0], title: documentTitle } : null}
      />
    </div>
  )
}
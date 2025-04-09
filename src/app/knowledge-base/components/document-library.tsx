"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, Trash2, Zap } from "lucide-react"
import { useState } from "react"
import { PublishPromptDialog } from "@/components/publish-prompt-dialog"

export function DocumentLibrary() {
  const [isPublishOpen, setIsPublishOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<any>(null)

  const documents = [
    {
      id: "1",
      title: "Product Manual v2.3.pdf",
      description: "Complete user guide for the latest product version",
      size: "2.4 MB",
      type: "PDF",
      uploadedAt: "3 days ago",
    },
    {
      id: "2",
      title: "FAQ Database.docx",
      description: "Comprehensive list of frequently asked questions and answers",
      size: "1.1 MB",
      type: "DOCX",
      uploadedAt: "1 week ago",
    },
    {
      id: "3",
      title: "Technical Specifications.pdf",
      description: "Detailed technical specifications for all products",
      size: "3.7 MB",
      type: "PDF",
      uploadedAt: "2 days ago",
    },
    {
      id: "4",
      title: "Customer Feedback.csv",
      description: "Compiled customer feedback and ratings",
      size: "0.8 MB",
      type: "CSV",
      uploadedAt: "5 days ago",
    },
    {
      id: "5",
      title: "Installation Guide.txt",
      description: "Step-by-step installation instructions",
      size: "0.2 MB",
      type: "TXT",
      uploadedAt: "1 day ago",
    },
  ]

  const handlePublish = (document: any) => {
    setSelectedDocument(document)
    setIsPublishOpen(true)
  }

  return (
    <div>
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
            {documents.map((doc, index) => (
              <tr key={doc.id} className={index !== documents.length - 1 ? "border-b" : ""}>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-blue-50 p-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">{doc.title}</div>
                      <div className="text-sm text-muted-foreground">{doc.description}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <Badge variant="outline" className="font-normal">
                    {doc.size} • {doc.type}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">{doc.uploadedAt}</td>
                <td className="py-3 px-4 text-right">
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePublish(doc)}
                      className="h-9 w-9 rounded-full bg-green-50 hover:bg-green-100 shadow-sm hover:shadow transition-all duration-200"
                    >
                      <Zap className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full bg-blue-50 hover:bg-blue-100 shadow-sm hover:shadow transition-all duration-200"
                    >
                      <Download className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
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

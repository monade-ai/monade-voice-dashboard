"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Download, FileText, Trash2, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { PublishPromptDialog } from "../components/publish-prompt-dialog"

export function DocumentCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPublishOpen, setIsPublishOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleCards, setVisibleCards] = useState(3)

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

  const handlePublish = (document: any) => {
    setSelectedDocument(document)
    setIsPublishOpen(true)
  }

  return (
    <div className="relative">
      <div className="overflow-hidden px-1 py-4">
        <div
          ref={containerRef}
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * (100 / visibleCards)}%)` }}
        >
          {documents.map((document) => (
            <div key={document.id} className={cn("px-2 transition-opacity duration-300", `w-full sm:w-1/2 lg:w-1/3`)}>
              <Card className="h-full transform transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-blue-50 p-3 flex-shrink-0">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{document.title}</CardTitle>
                      <CardDescription className="mt-1">{document.description}</CardDescription>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {document.size} • {document.type}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardFooter className="flex justify-between border-t pt-4">
                  <div className="text-xs text-muted-foreground">Uploaded {document.uploadedAt}</div>
                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePublish(document)}
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
          disabled={currentIndex === 0}
          className={cn(
            "rounded-full transition-opacity",
            currentIndex === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-primary/10",
          )}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <Button variant="outline" asChild className="rounded-full px-6">
          <Link href="/documents">View All Documents</Link>
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          disabled={currentIndex >= maxIndex}
          className={cn(
            "rounded-full transition-opacity",
            currentIndex >= maxIndex ? "opacity-50 cursor-not-allowed" : "hover:bg-primary/10",
          )}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
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

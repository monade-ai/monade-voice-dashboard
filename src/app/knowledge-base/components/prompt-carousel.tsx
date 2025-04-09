"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Edit, Trash2, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { PublishPromptDialog } from "../components/publish-prompt-dialog"

export function PromptCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPublishOpen, setIsPublishOpen] = useState(false)
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleCards, setVisibleCards] = useState(3)

  const prompts = [
    {
      id: "1",
      title: "Customer Support Assistant",
      description: "Handles common customer inquiries and provides helpful responses",
      agents: ["Support Bot"],
      updatedAt: "2 days ago",
    },
    {
      id: "2",
      title: "Product Recommendation Engine",
      description: "Suggests products based on customer preferences and browsing history",
      agents: ["Sales Assistant", "Website Bot"],
      updatedAt: "1 week ago",
    },
    {
      id: "3",
      title: "Technical Troubleshooting Guide",
      description: "Walks users through common technical issues and solutions",
      agents: ["Support Bot"],
      updatedAt: "3 days ago",
    },
    {
      id: "4",
      title: "Onboarding Sequence",
      description: "Guides new users through product features and setup",
      agents: ["Website Bot"],
      updatedAt: "5 days ago",
    },
    {
      id: "5",
      title: "Feature Announcement",
      description: "Introduces users to new product features and updates",
      agents: [],
      updatedAt: "1 day ago",
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

  const maxIndex = Math.max(0, prompts.length - visibleCards)

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1))
  }

  const handlePublish = (prompt: any) => {
    setSelectedPrompt(prompt)
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
          {prompts.map((prompt) => (
            <div key={prompt.id} className={cn("px-2 transition-opacity duration-300", `w-full sm:w-1/2 lg:w-1/3`)}>
              <Card className="h-full transform transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <CardHeader>
                  <div>
                    <CardTitle>{prompt.title}</CardTitle>
                    <CardDescription className="mt-1">{prompt.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardFooter className="flex justify-between border-t pt-4">
                  <div className="text-xs text-muted-foreground">Updated {prompt.updatedAt}</div>
                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePublish(prompt)}
                      className="h-9 w-9 rounded-full bg-purple-50 hover:bg-purple-100 shadow-sm hover:shadow transition-all duration-200"
                    >
                      <Zap className="h-4 w-4 text-purple-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="h-9 w-9 rounded-full bg-blue-50 hover:bg-blue-100 shadow-sm hover:shadow transition-all duration-200"
                    >
                      <Link href={`/editor/${prompt.id}`}>
                        <Edit className="h-4 w-4 text-blue-600" />
                      </Link>
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
          <Link href="/prompts">View All Prompts</Link>
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

      {selectedPrompt && (
        <PublishPromptDialog open={isPublishOpen} onOpenChange={setIsPublishOpen} promptTitle={selectedPrompt.title} />
      )}
    </div>
  )
}

"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useTranslations } from "@/i18n/translations-context"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Edit, Trash2, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { PublishPromptDialog } from "../components/publish-prompt-dialog"
import { Badge } from "@/components/ui/badge"

export function PromptCarousel() {
  const { t } = useTranslations();
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPublishOpen, setIsPublishOpen] = useState(false)
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleCards, setVisibleCards] = useState(3)
  const [prompts, setPrompts] = useState([
    
    {
      id: "1",
      title: t("promptCarousel.customerSupportAssistant"),
      description: t("promptCarousel.handlesCommonCustomerInquiries"),
      agents: [t("promptCarousel.supportBot")],
      updatedAt: "2 days ago",
    },
    {
      id: "2",
      title: t("promptCarousel.productRecommendationEngine"),
      description: t("promptCarousel.suggestsProductsBasedOnCustomer"),
      agents: [t("promptCarousel.salesAssistant"), t("promptCarousel.websiteBot")],
      updatedAt: "1 week ago",
    },
    {
      id: "3",
      title: t("promptCarousel.technicalTroubleshootingGuide"),
      description: t("promptCarousel.walksUsersThroughCommonTechnical"),
      agents: [t("promptCarousel.supportBot")],
      updatedAt: "3 days ago",
    },
    {
      id: "4",
      title: t("promptCarousel.onboardingSequence"),
      description: t("promptCarousel.guidesNewUsersThroughProduct"),
      agents: [t("promptCarousel.websiteBot")],
      updatedAt: "5 days ago",
    },
    {
      id: "5",
      title: t("promptCarousel.featureAnnouncement"),
      description: t("promptCarousel.introducesUsersToNewProduct"),
      agents: [],
      updatedAt: "1 day ago",
    }
  ])
  
  const handleDelete = (promptId: string) => {
    // Remove the prompt from the prompts array
    const updatedPrompts = prompts.filter(prompt => prompt.id !== promptId);
    setPrompts(updatedPrompts);
  }
  
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
                <CardHeader className="pb-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium leading-tight">{prompt.title}</CardTitle>
                      {prompt.agents.length > 0 && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 text-[10px] px-2 py-0.5">
                          {prompt.agents.length} {t(prompt.agents.length === 1 ? 'promptCarousel.agent' : 'promptCarousel.agents')}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1 line-clamp-2 text-xs">{prompt.description}</CardDescription>
                    
                    {/* {prompt.agents.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {prompt.agents.map((agent) => (
                          <span 
                            key={agent} 
                            className="inline-block px-2 py-0.5 bg-slate-100 rounded-full text-[10px] font-medium text-slate-600"
                          >
                            {agent}
                          </span>
                        ))}
                      </div>
                    )} */}
                  </div>
                </CardHeader>
                <CardFooter className="flex justify-between border-t h-[44px] py-2 mt-1">
                  <div className="text-[10px] text-muted-foreground">{t("promptCarousel.updated")} {prompt.updatedAt}</div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePublish(prompt)}
                      className="h-7 w-7 rounded-full bg-amber-50 hover:bg-amber-100 shadow-sm hover:shadow transition-all duration-200"
                    >
                      <Zap className="h-3.5 w-3.5 text-amber-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="h-7 w-7 rounded-full bg-slate-50 hover:bg-slate-100 shadow-sm hover:shadow transition-all duration-200"
                    >
                      <Link href={`/knowledge-base/editor/${prompt.id}`}>
                        <Edit className="h-3.5 w-3.5 text-slate-600" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(prompt.id)}
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
          disabled={currentIndex === 0}
          className={cn(
            "rounded-full transition-opacity",
            currentIndex === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-amber-50",
          )}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <Button variant="outline" asChild className="rounded-full px-6">
          <Link href="/knowledge-base/prompts">{t("promptCarousel.viewAllPrompts")}</Link>
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          disabled={currentIndex >= maxIndex}
          className={cn(
            "rounded-full transition-opacity",
            currentIndex >= maxIndex ? "opacity-50 cursor-not-allowed" : "hover:bg-amber-50",
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

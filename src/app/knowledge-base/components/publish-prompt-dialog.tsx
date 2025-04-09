"use client"

import { useState } from "react"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Check, Zap, CheckCircle2 } from "lucide-react"

interface PublishPromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  promptTitle: string
}

export function PublishPromptDialog({ open, onOpenChange, promptTitle }: PublishPromptDialogProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

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

  const handlePublish = () => {
    if (!selectedAgent) return

    // Simulate publishing process
    setIsPublishing(true)

    setTimeout(() => {
      setIsPublishing(false)
      setIsSuccess(true)

      // Auto-close after success
      setTimeout(() => {
        onOpenChange(false)
        setIsSuccess(false)
        setSelectedAgent(null)
      }, 1500)
    }, 1500)
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
              <DialogTitle>Publish Prompt</DialogTitle>
              <DialogDescription>Connect this prompt to an AI agent to use it in conversations.</DialogDescription>
            </DialogHeader>
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
                {isPublishing ? "Publishing..." : "Publish"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

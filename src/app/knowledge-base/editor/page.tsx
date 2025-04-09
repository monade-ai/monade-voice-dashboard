import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home } from "lucide-react"
import { PromptEditor } from "../components/prompt-editor"

export const metadata: Metadata = {
  title: "Prompt Editor | Knowledge Base & Prompt Management",
  description: "Create and edit custom prompts for your AI agents",
}

export default function EditorPage() {
  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/">
              <Home className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Prompt Editor</h1>
        </div>
      </div>

      <PromptEditor />
    </div>
  )
}

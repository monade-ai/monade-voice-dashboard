import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Home, PlusCircle, Search } from "lucide-react"
import { PromptLibrary } from "@/components/prompt-library"

export const metadata: Metadata = {
  title: "Prompt Library | Knowledge Base & Prompt Management",
  description: "Browse and manage your custom prompts",
}

export default function PromptsPage() {
  return (
    <div className="container mx-auto py-10 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/">
              <Home className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Prompt Library</h1>
        </div>
        <Button asChild className="rounded-full">
          <Link href="/editor">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Prompt
          </Link>
        </Button>
      </div>

      <Card className="border-2 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
          <CardTitle>Your Custom Prompts</CardTitle>
          <CardDescription>Browse, edit, and manage your saved prompts</CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search prompts..." className="pl-8 bg-white/80" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <PromptLibrary />
        </CardContent>
      </Card>
    </div>
  )
}

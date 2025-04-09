import type { Metadata } from "next"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, MessageSquare, PlusCircle, Upload } from "lucide-react"
import { PromptCarousel } from "./components/prompt-carousel"
import { DocumentCarousel } from "./components/document-carousel"

export const metadata: Metadata = {
  title: "Knowledge Base & Prompt Management",
  description: "Upload documents, create custom prompts, and connect them to AI agents",
}

export default function HomePage() {
  return (
    <div className="container mx-auto py-10 px-4 space-y-10">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Knowledge Base & Prompt Management
        </h1>
        <p className="text-muted-foreground text-lg">
          Upload documents to your knowledge base or create custom prompts for your AI agents
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Link href="/upload" className="group">
          <div className="relative overflow-hidden rounded-xl border-2 border-dashed p-8 h-60 flex flex-col items-center justify-center text-center transition-all duration-300 hover:border-primary hover:bg-primary/5 group-hover:shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-50 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative z-10">
              <div className="rounded-full bg-blue-100 p-4 mx-auto mb-4 transition-transform duration-300 group-hover:scale-110">
                <Upload className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Upload Document</h2>
              <p className="text-muted-foreground">Add documents to your knowledge base to enhance your AI agents</p>
            </div>
          </div>
        </Link>

        <Link href="/editor" className="group">
          <div className="relative overflow-hidden rounded-xl border-2 border-dashed p-8 h-60 flex flex-col items-center justify-center text-center transition-all duration-300 hover:border-primary hover:bg-primary/5 group-hover:shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 opacity-50 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative z-10">
              <div className="rounded-full bg-purple-100 p-4 mx-auto mb-4 transition-transform duration-300 group-hover:scale-110">
                <PlusCircle className="h-8 w-8 text-purple-600" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Create Prompt</h2>
              <p className="text-muted-foreground">Create custom prompts to guide your AI agents' responses</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="max-w-6xl mx-auto">
        <Tabs defaultValue="prompts" className="w-full">
          <div className="flex justify-center mb-6">
            <TabsList className="grid w-full max-w-md grid-cols-2 p-1 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full">
              <TabsTrigger
                value="prompts"
                className="text-base py-3 rounded-full data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-300"
              >
                <MessageSquare className="mr-2 h-5 w-5 text-purple-500" />
                Prompts
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                className="text-base py-3 rounded-full data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-300"
              >
                <FileText className="mr-2 h-5 w-5 text-blue-500" />
                Documents
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="prompts" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
            <PromptCarousel />
          </TabsContent>
          <TabsContent value="documents" className="mt-6 focus-visible:outline-none focus-visible:ring-0">
            <DocumentCarousel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

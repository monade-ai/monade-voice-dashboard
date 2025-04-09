"use client"

import type React from "react"

import { useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bold, Italic, List, ListOrdered, Heading2, Sparkles, Save, FileUp, Zap } from "lucide-react"
import { PublishPromptDialog } from "@/components/publish-prompt-dialog"

export function PromptEditor() {
  const [isPublishOpen, setIsPublishOpen] = useState(false)
  const [promptTitle, setPromptTitle] = useState("")
  const [isAIEnhancing, setIsAIEnhancing] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Write your prompt here...",
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "min-h-[200px] p-4 border rounded-md focus:outline-none prose prose-sm max-w-none",
      },
    },
  })

  const handleAIAssist = () => {
    // Simulate AI enhancement
    if (editor) {
      setIsAIEnhancing(true)

      // Simulate AI processing delay
      setTimeout(() => {
        editor.commands.insertContent(" [AI enhanced this prompt] ")
        setIsAIEnhancing(false)
      }, 1500)
    }
  }

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const reader = new FileReader()

      reader.onload = (event) => {
        if (event.target?.result && editor) {
          // Set content from file
          editor.commands.setContent(event.target.result as string)
        }
      }

      reader.readAsText(file)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
          <div className="space-y-2">
            <Label htmlFor="prompt-title" className="text-lg font-medium">
              Prompt Title
            </Label>
            <Input
              id="prompt-title"
              placeholder="Enter a title for this prompt"
              value={promptTitle}
              onChange={(e) => setPromptTitle(e.target.value)}
              className="bg-white/80 border-2 focus-visible:ring-purple-400"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="editor" className="w-full">
            <TabsList className="w-full rounded-none border-b">
              <TabsTrigger value="editor" className="flex-1 py-3 data-[state=active]:bg-white">
                Rich Text Editor
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex-1 py-3 data-[state=active]:bg-white">
                Upload Document
              </TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="p-0 focus-visible:outline-none focus-visible:ring-0">
              <div className="border-b p-3 bg-white flex flex-wrap gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={editor?.isActive("bold") ? "bg-muted" : ""}
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={editor?.isActive("italic") ? "bg-muted" : ""}
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={editor?.isActive("heading", { level: 2 }) ? "bg-muted" : ""}
                >
                  <Heading2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  className={editor?.isActive("bulletList") ? "bg-muted" : ""}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  className={editor?.isActive("orderedList") ? "bg-muted" : ""}
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
                <div className="ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAIAssist}
                    className="gap-1"
                    disabled={isAIEnhancing}
                  >
                    {isAIEnhancing ? (
                      <>
                        <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                        Enhancing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        AI Assist
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div className="bg-white">
                <EditorContent editor={editor} className="min-h-[300px]" />
              </div>
            </TabsContent>

            <TabsContent value="upload" className="p-6 focus-visible:outline-none focus-visible:ring-0 bg-white">
              <div className="border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 hover:border-primary/50 hover:bg-primary/5">
                <FileUp className="mx-auto h-10 w-10 text-muted-foreground" />
                <h3 className="mt-2 text-lg font-semibold">Upload Document as Prompt</h3>
                <p className="mt-1 text-sm text-muted-foreground">Upload a text file to use as your prompt template</p>
                <Input
                  id="prompt-file-upload"
                  type="file"
                  className="hidden"
                  accept=".txt,.md,.docx"
                  onChange={handleUploadFile}
                />
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => document.getElementById("prompt-file-upload")?.click()}
                >
                  Select File
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" className="gap-2 px-4 py-2 rounded-full">
          <Save className="h-4 w-4" />
          Save Draft
        </Button>
        <Button
          onClick={() => setIsPublishOpen(true)}
          className="gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          <Zap className="h-4 w-4" />
          Publish Prompt
        </Button>
      </div>

      <PublishPromptDialog open={isPublishOpen} onOpenChange={setIsPublishOpen} promptTitle={promptTitle} />
    </div>
  )
}

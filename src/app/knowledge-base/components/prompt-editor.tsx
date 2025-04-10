"use client"

import { useState, useCallback } from "react"
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Underline from "@tiptap/extension-underline"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import { common, createLowlight } from "lowlight"
const lowlight = createLowlight(common)
import Link from "@tiptap/extension-link"
import { Markdown } from "tiptap-markdown"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered, 
  Heading2, 
  Sparkles, 
  Save, 
  FileUp, 
  Zap, 
  Code, 
  CodeSquare,
  Quote,
  Link as LinkIcon,
  Eye,
  EyeOff,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Check,
  X,
  Strikethrough
} from "lucide-react"
import { PublishPromptDialog } from "../components/publish-prompt-dialog"
import { Separator } from "@/components/ui/separator"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger, 
} from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function PromptEditor() {
  const [isPublishOpen, setIsPublishOpen] = useState(false)
  const [promptTitle, setPromptTitle] = useState("")
  const [isAIEnhancing, setIsAIEnhancing] = useState(false)
  const [isMarkdownVisible, setIsMarkdownVisible] = useState(false)
  const [markdownContent, setMarkdownContent] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: "Write your prompt here...",
      }),
      Underline,
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Link.configure({
        openOnClick: false,
        linkOnPaste: true,
      }),
      Markdown.configure({
        html: true,
        transformPastedText: true,
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "min-h-[300px] p-4 border rounded-md focus:outline-none prose prose-sm max-w-none",
      },
    },
    onUpdate: ({ editor }) => {
      // Update markdown content when editor changes
      const markdown = editor.storage.markdown.getMarkdown();
      setMarkdownContent(markdown);
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
          const content = event.target.result as string;
          
          // Check if the content is markdown
          if (file.name.endsWith('.md')) {
            // Set markdown content directly
            editor.commands.setContent(content);
          } else {
            // Set as plain text
            editor.commands.setContent(content);
          }
        }
      }

      reader.readAsText(file)
    }
  }

  const downloadMarkdown = useCallback(() => {
    if (!editor) return;
    
    const markdown = editor.storage.markdown.getMarkdown();
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `${promptTitle || "prompt"}.md`;
    a.click();
    
    URL.revokeObjectURL(url);
  }, [editor, promptTitle]);

  const setLink = useCallback(() => {
    if (!editor) return;
    
    // Check if URL is valid
    let url = linkUrl;
    if (url && !/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    
    if (url) {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url })
        .run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .unsetLink()
        .run();
    }
    
    setLinkUrl("");
    setLinkPopoverOpen(false);
  }, [editor, linkUrl]);

  return (
    <div className="space-y-6">
      <Card className="border-2 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
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
              <TabsTrigger value="markdown-preview" className="flex-1 py-3 data-[state=active]:bg-white">
                Markdown Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="p-0 focus-visible:outline-none focus-visible:ring-0">
              <div className="border-b p-3 bg-white">
                <div className="flex flex-wrap gap-1 mb-2">
                  <TooltipProvider>
                    {/* Text Formatting */}
                    <div className="flex items-center gap-1 mr-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editor?.chain().focus().toggleBold().run()}
                            className={editor?.isActive("bold") ? "bg-muted" : ""}
                          >
                            <Bold className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Bold</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editor?.chain().focus().toggleItalic().run()}
                            className={editor?.isActive("italic") ? "bg-muted" : ""}
                          >
                            <Italic className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Italic</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editor?.chain().focus().toggleUnderline().run()}
                            className={editor?.isActive("underline") ? "bg-muted" : ""}
                          >
                            <UnderlineIcon className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Underline</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editor?.chain().focus().toggleStrike().run()}
                            className={editor?.isActive("strike") ? "bg-muted" : ""}
                          >
                            <Strikethrough className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Strikethrough</TooltipContent>
                      </Tooltip>
                    </div>
                    
                    <Separator orientation="vertical" className="h-6 mx-1" />
                    
                    {/* Headings */}
                    <div className="flex items-center gap-1 mr-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                            className={editor?.isActive("heading", { level: 1 }) ? "bg-muted" : ""}
                          >
                            H1
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Heading 1</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                            className={editor?.isActive("heading", { level: 2 }) ? "bg-muted" : ""}
                          >
                            H2
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Heading 2</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                            className={editor?.isActive("heading", { level: 3 }) ? "bg-muted" : ""}
                          >
                            H3
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Heading 3</TooltipContent>
                      </Tooltip>
                    </div>
                    
                    <Separator orientation="vertical" className="h-6 mx-1" />
                    
                    {/* Lists */}
                    <div className="flex items-center gap-1 mr-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editor?.chain().focus().toggleBulletList().run()}
                            className={editor?.isActive("bulletList") ? "bg-muted" : ""}
                          >
                            <List className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Bullet List</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                            className={editor?.isActive("orderedList") ? "bg-muted" : ""}
                          >
                            <ListOrdered className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Ordered List</TooltipContent>
                      </Tooltip>
                    </div>
                    
                    <Separator orientation="vertical" className="h-6 mx-1" />
                    
                    {/* Blocks */}
                    <div className="flex items-center gap-1 mr-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                            className={editor?.isActive("blockquote") ? "bg-muted" : ""}
                          >
                            <Quote className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Blockquote</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                            className={editor?.isActive("codeBlock") ? "bg-muted" : ""}
                          >
                            <CodeSquare className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Code Block</TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editor?.chain().focus().toggleCode().run()}
                            className={editor?.isActive("code") ? "bg-muted" : ""}
                          >
                            <Code className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Inline Code</TooltipContent>
                      </Tooltip>
                    </div>
                    
                    <Separator orientation="vertical" className="h-6 mx-1" />
                    
                    {/* Link */}
                    <div className="flex items-center gap-1 mr-2">
                      <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={editor?.isActive("link") ? "bg-muted" : ""}
                                >
                                  <LinkIcon className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                            </TooltipTrigger>
                            <TooltipContent>Insert Link</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <PopoverContent className="w-80">
                          <div className="flex flex-col space-y-2">
                            <Label htmlFor="link-url">URL</Label>
                            <div className="flex space-x-2">
                              <Input 
                                id="link-url"
                                placeholder="https://example.com" 
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={setLink}
                                className="text-green-600"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setLinkPopoverOpen(false)}
                                className="text-red-600"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TooltipProvider>
                  
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadMarkdown}
                      className="gap-1"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Export Markdown
                    </Button>
                    
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
              </div>

              {editor && (
                <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
                  <div className="flex items-center rounded-md border shadow-sm bg-white px-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => editor.chain().focus().toggleBold().run()}
                      data-active={editor.isActive('bold')}
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => editor.chain().focus().toggleItalic().run()}
                      data-active={editor.isActive('italic')}
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => editor.chain().focus().toggleUnderline().run()}
                      data-active={editor.isActive('underline')}
                    >
                      <UnderlineIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => editor.chain().focus().toggleCode().run()}
                      data-active={editor.isActive('code')}
                    >
                      <Code className="h-4 w-4" />
                    </Button>
                  </div>
                </BubbleMenu>
              )}

              <div className="bg-white">
                <EditorContent editor={editor} className="min-h-[300px]" />
              </div>
            </TabsContent>

            <TabsContent value="upload" className="p-6 focus-visible:outline-none focus-visible:ring-0 bg-white">
              <div className="border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 hover:border-primary/50 hover:bg-primary/5">
                <FileUp className="mx-auto h-10 w-10 text-muted-foreground" />
                <h3 className="mt-2 text-lg font-semibold">Upload Document as Prompt</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Upload a text file to use as your prompt template (.txt, .md, .docx)
                </p>
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
            
            <TabsContent value="markdown-preview" className="focus-visible:outline-none focus-visible:ring-0">
              <div className="p-4 bg-white flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Markdown Preview</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={downloadMarkdown}
                    className="gap-1"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Download Markdown
                  </Button>
                </div>
                
                <div className="border rounded-md p-4 bg-gray-50 min-h-[300px] font-mono text-sm whitespace-pre-wrap overflow-auto">
                  {markdownContent || "*No content yet*"}
                </div>
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
          className="gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
        >
          <Zap className="h-4 w-4" />
          Publish Prompt
        </Button>
      </div>

      <PublishPromptDialog open={isPublishOpen} onOpenChange={setIsPublishOpen} promptTitle={promptTitle} />
    </div>
  )
}
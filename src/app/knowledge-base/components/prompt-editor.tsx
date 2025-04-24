'use client';

import { useState, useCallback, useEffect } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
const lowlight = createLowlight(common);
import Link from '@tiptap/extension-link';
import { Markdown } from 'tiptap-markdown';
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
  Strikethrough,
  Loader2,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger, 
} from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { PublishPromptDialog } from '../components/publish-prompt-dialog';
import { PromptData, PromptManager } from '../api/prompt-editor-integration';
import { useToast } from '../hooks/use-toast';

interface PromptEditorProps {
  promptId?: string;
}

export function PromptEditor({ promptId }: PromptEditorProps) {
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [promptTitle, setPromptTitle] = useState('');
  const [promptDescription, setPromptDescription] = useState('');
  const [isAIEnhancing, setIsAIEnhancing] = useState(false);
  const [isMarkdownVisible, setIsMarkdownVisible] = useState(false);
  const [markdownContent, setMarkdownContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(promptId ? true : false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<PromptData | null>(null);
  const { toast } = useToast();
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Write your prompt here...',
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
    content: '',
    editorProps: {
      attributes: {
        class: 'min-h-[300px] p-4 border border-muted/60 rounded-md focus:outline-none prose prose-sm max-w-none bg-background/80',
      },
    },
    onUpdate: ({ editor }) => {
      // Update markdown content when editor changes
      const markdown = editor.storage.markdown.getMarkdown();
      setMarkdownContent(markdown);
    },
  });

  // Load prompt data if promptId is provided
  useEffect(() => {
    if (promptId && editor) {
      setIsLoading(true);
      
      try {
        // Try to get prompt from storage first
        const savedPrompt = PromptManager.getPromptById(promptId);
        
        if (savedPrompt) {
          // Existing prompt found in storage
          setPromptTitle(savedPrompt.title);
          setPromptDescription(savedPrompt.description || '');
          editor.commands.setContent(savedPrompt.content);
          setCurrentPrompt(savedPrompt);
        } else {
          // If not in storage, check sample prompts by id
          const samplePrompts = [
            {
              id: '1',
              title: 'Customer Support Assistant',
              description: 'Handles common customer inquiries and provides helpful responses',
              content: '# Customer Support Assistant\n\nYou are a helpful customer support assistant. Your goal is to provide clear, concise answers to customer questions and resolve their issues efficiently.\n\n## Guidelines\n\n- Be polite and professional at all times\n- Ask clarifying questions when needed\n- Provide step-by-step instructions for technical issues\n- Offer alternative solutions when possible',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              id: '2',
              title: 'Product Recommendation Engine',
              description: 'Suggests products based on customer preferences and browsing history',
              content: '# Product Recommendation Engine\n\nYou are a product recommendation assistant. Your goal is to help customers find products that match their needs and preferences.\n\n## Guidelines\n\n- Ask about customer preferences and requirements\n- Consider budget constraints\n- Highlight key features and benefits\n- Compare similar products when relevant',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              id: '3',
              title: 'Technical Troubleshooting Guide',
              description: 'Walks users through common technical issues and solutions',
              content: '# Technical Troubleshooting Guide\n\nYou are a technical support specialist. Your goal is to help users diagnose and resolve technical issues with our products.\n\n## Guidelines\n\n- Start with basic troubleshooting steps\n- Ask for error messages and system information\n- Provide clear, step-by-step instructions\n- Escalate complex issues when necessary',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ];
          
          const prompt = samplePrompts.find(p => p.id === promptId);
          
          if (prompt) {
            setPromptTitle(prompt.title);
            setPromptDescription(prompt.description);
            editor.commands.setContent(prompt.content);
            setCurrentPrompt(prompt);
            
            // Save to storage for future use
            PromptManager.savePrompt(prompt);
          } else {
            // Neither found - create new
            toast({
              title: 'Prompt not found',
              description: 'Creating a new prompt instead.',
            });
            
            // Create a new empty prompt with this ID
            const newPrompt: PromptData = {
              id: promptId,
              title: 'New Prompt',
              content: '# Write your prompt here\n\nThis is a new prompt template. Replace this text with your instructions for the AI assistant.',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            
            setPromptTitle(newPrompt.title);
            editor.commands.setContent(newPrompt.content);
            setCurrentPrompt(newPrompt);
            
            // Save to storage
            PromptManager.savePrompt(newPrompt);
          }
        }
      } catch (error) {
        console.error('Error loading prompt:', error);
        toast({
          title: 'Error loading prompt',
          description: 'There was an error loading the prompt data.',
        });
      } finally {
        setIsLoading(false);
      }
    }
  }, [promptId, editor, toast]);

  // Create a new prompt
  useEffect(() => {
    if (!promptId && editor && !currentPrompt) {
      // Create a new prompt with a unique ID
      const newPrompt: PromptData = {
        id: uuidv4(),
        title: 'New Prompt',
        content: '# Write your prompt here\n\nThis is a new prompt template. Replace this text with your instructions for the AI assistant.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      setPromptTitle(newPrompt.title);
      editor.commands.setContent(newPrompt.content);
      setCurrentPrompt(newPrompt);
    }
  }, [promptId, editor, currentPrompt]);

  const handleAIAssist = () => {
    if (!editor) return;
    
    setIsAIEnhancing(true);

    // Simulate AI enhancement with a delay
    setTimeout(() => {
      // Get current content
      const currentContent = editor.getHTML();
      
      // Enhance with some additional text
      const enhancedText = ' [AI enhanced this prompt with additional context and examples to improve clarity and effectiveness] ';
      
      // Insert at cursor position or at the end
      editor.commands.insertContent(enhancedText);
      
      setIsAIEnhancing(false);
      
      toast({
        title: 'AI Enhancement Complete',
        description: 'Your prompt has been enhanced with additional context.',
      });
    }, 1500);
  };

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editor || !e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      if (!event.target?.result) return;
      
      const content = event.target.result as string;
      
      // Check if the content is markdown
      if (file.name.endsWith('.md')) {
        // Set markdown content directly
        editor.commands.setContent(content);
      } else {
        // Set as plain text
        editor.commands.setContent(content);
      }
      
      // Update the title if it's still the default
      if (promptTitle === 'New Prompt') {
        // Remove file extension for the title
        const titleWithoutExtension = file.name.replace(/\.[^/.]+$/, '');
        setPromptTitle(titleWithoutExtension);
      }
      
      toast({
        title: 'File loaded',
        description: `${file.name} has been loaded into the editor.`,
      });
    };

    reader.readAsText(file);
  };

  const downloadMarkdown = useCallback(() => {
    if (!editor) return;
    
    const markdown = editor.storage.markdown.getMarkdown();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${promptTitle || 'prompt'}.md`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Download started',
      description: `${promptTitle || 'prompt'}.md is being downloaded.`,
    });
  }, [editor, promptTitle, toast]);

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
    
    setLinkUrl('');
    setLinkPopoverOpen(false);
  }, [editor, linkUrl]);

  const handleSavePrompt = async () => {
    if (!editor || !currentPrompt) return;
    
    setIsSaving(true);
    
    try {
      // Get the current markdown content
      const content = editor.storage.markdown.getMarkdown();
      
      // Update the prompt data
      const updatedPrompt: PromptData = {
        ...currentPrompt,
        title: promptTitle,
        description: promptDescription,
        content: content,
        updatedAt: new Date().toISOString(),
      };
      
      // Save to storage
      PromptManager.savePrompt(updatedPrompt);
      
      // Update current prompt
      setCurrentPrompt(updatedPrompt);
      
      toast({
        title: 'Prompt saved',
        description: 'Your prompt has been saved successfully.',
      });
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast({
        title: 'Save failed',
        description: 'There was an error saving your prompt.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = () => {
    if (!currentPrompt) return;
    setIsPublishOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <span className="text-foreground/80">Loading prompt...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b">
          <div className="space-y-2">
            <Label htmlFor="prompt-title" className="text-lg font-medium text-foreground/90">
              Prompt Title
            </Label>
            <Input
              id="prompt-title"
              placeholder="Enter a title for this prompt"
              value={promptTitle}
              onChange={(e) => setPromptTitle(e.target.value)}
              className="bg-background border focus-visible:ring-primary/50 focus-visible:border-primary/50"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="editor" className="w-full">
            <TabsList className="w-full rounded-none border-b bg-muted/20">
              <TabsTrigger value="editor" className="flex-1 py-3 data-[state=active]:bg-background data-[state=active]:text-foreground/90 data-[state=active]:border-b-2 data-[state=active]:border-primary/70 text-muted-foreground/80">
                Rich Text Editor
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex-1 py-3 data-[state=active]:bg-background data-[state=active]:text-foreground/90 data-[state=active]:border-b-2 data-[state=active]:border-primary/70 text-muted-foreground/80">
                Upload Document
              </TabsTrigger>
              <TabsTrigger value="markdown-preview" className="flex-1 py-3 data-[state=active]:bg-background data-[state=active]:text-foreground/90 data-[state=active]:border-b-2 data-[state=active]:border-primary/70 text-muted-foreground/80">
                Markdown Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="p-0 focus-visible:outline-none focus-visible:ring-0">
              <div className="border-b p-3 bg-background">
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
                            className={editor?.isActive('bold') ? 'bg-primary/10 text-primary' : 'text-muted-foreground/80 hover:text-foreground hover:bg-muted/30'}
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
                            className={editor?.isActive('italic') ? 'bg-primary/10 text-primary' : 'text-muted-foreground/80 hover:text-foreground hover:bg-muted/30'}
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
                            className={editor?.isActive('underline') ? 'bg-primary/10 text-primary' : 'text-muted-foreground/80 hover:text-foreground hover:bg-muted/30'}
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
                            className={editor?.isActive('strike') ? 'bg-primary/10 text-primary' : 'text-muted-foreground/80 hover:text-foreground hover:bg-muted/30'}
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
                            className={editor?.isActive('heading', { level: 1 }) ? 'bg-primary/10 text-primary' : 'text-muted-foreground/80 hover:text-foreground hover:bg-muted/30'}
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
                            className={editor?.isActive('heading', { level: 2 }) ? 'bg-primary/10 text-primary' : 'text-muted-foreground/80 hover:text-foreground hover:bg-muted/30'}
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
                            className={editor?.isActive('heading', { level: 3 }) ? 'bg-primary/10 text-primary' : 'text-muted-foreground/80 hover:text-foreground hover:bg-muted/30'}
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
                            className={editor?.isActive('bulletList') ? 'bg-primary/10 text-primary' : 'text-muted-foreground/80 hover:text-foreground hover:bg-muted/30'}
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
                            className={editor?.isActive('orderedList') ? 'bg-primary/10 text-primary' : 'text-muted-foreground/80 hover:text-foreground hover:bg-muted/30'}
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
                            className={editor?.isActive('blockquote') ? 'bg-primary/10 text-primary' : 'text-muted-foreground/80 hover:text-foreground hover:bg-muted/30'}
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
                            className={editor?.isActive('codeBlock') ? 'bg-primary/10 text-primary' : 'text-muted-foreground/80 hover:text-foreground hover:bg-muted/30'}
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
                            className={editor?.isActive('code') ? 'bg-primary/10 text-primary' : 'text-muted-foreground/80 hover:text-foreground hover:bg-muted/30'}
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
                                  className={editor?.isActive('link') ? 'bg-primary/10 text-primary' : 'text-muted-foreground/80 hover:text-foreground hover:bg-muted/30'}
                                >
                                  <LinkIcon className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                            </TooltipTrigger>
                            <TooltipContent>Insert Link</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <PopoverContent className="w-80 border border-border/60 shadow-sm">
                          <div className="flex flex-col space-y-2">
                            <Label htmlFor="link-url" className="text-foreground/90">URL</Label>
                            <div className="flex space-x-2">
                              <Input 
                                id="link-url"
                                placeholder="https://example.com" 
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                className="border-muted/60 focus-visible:ring-primary/50 focus-visible:border-primary/50"
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={setLink}
                                className="text-[#43B02A] hover:bg-[#43B02A]/10 hover:text-[#43B02A] transition-colors duration-150"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setLinkPopoverOpen(false)}
                                className="text-[#E11900] hover:bg-[#E11900]/10 hover:text-[#E11900] transition-colors duration-150"
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
                      onClick={handleSavePrompt}
                      className="gap-1"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5" />
                          Save Draft
                        </>
                      )}
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

            <TabsContent value="upload" className="p-0 focus-visible:outline-none focus-visible:ring-0">
                <div className="p-6 flex flex-col items-center justify-center bg-background">
                  <div className="mb-4 text-center">
                    <h3 className="text-lg font-medium text-foreground/90">Upload a Prompt Document</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Import an existing prompt from a Markdown (.md) file
                    </p>
                  </div>
                  
                  <div className="w-full max-w-sm">
                    <Label htmlFor="file-upload" className="block text-sm font-medium mb-2 text-foreground/90">
                      Select File
                    </Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".md,.txt"
                      onChange={handleUploadFile}
                      className="cursor-pointer border-muted/60 focus-visible:ring-primary/50 focus-visible:border-primary/50"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Supported formats: Markdown (.md), Text (.txt)
                    </p>
                  </div>
                </div>
            </TabsContent>
            
            <TabsContent value="markdown-preview" className="p-0 focus-visible:outline-none focus-visible:ring-0">
                <div className="p-4 border-b bg-background">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foreground/90">Markdown Preview</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMarkdownVisible(!isMarkdownVisible)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150"
                    >
                      {isMarkdownVisible ? (
                        <>
                          <Eye className="h-3.5 w-3.5 mr-1 text-primary/80" />
                          Hide Raw Markdown
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3.5 w-3.5 mr-1 text-primary/80" />
                          Show Raw Markdown
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                
                {isMarkdownVisible ? (
                  <div className="p-4 font-mono text-sm whitespace-pre-wrap bg-muted/20 border-b">
                    {markdownContent}
                  </div>
                ) : (
                  <div className="p-4 prose prose-sm max-w-none bg-background">
                    <div dangerouslySetInnerHTML={{ __html: editor?.getHTML() || '' }} />
                  </div>
                )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex justify-between mt-6 space-x-2">
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAIAssist}
            disabled={isAIEnhancing || !editor}
            className="flex items-center border-muted/70 text-foreground/90 hover:bg-muted/30 hover:text-foreground transition-colors duration-150"
          >
            {isAIEnhancing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                Enhancing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4 text-primary/80" />
                AI Assist
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={downloadMarkdown}
            disabled={!editor}
            className="flex items-center border-muted/70 text-foreground/90 hover:bg-muted/30 hover:text-foreground transition-colors duration-150"
          >
            <FileUp className="mr-2 h-4 w-4 text-primary/80" />
            Export
          </Button>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSavePrompt}
            disabled={isSaving || !editor}
            className="flex items-center border-muted/70 text-foreground/90 hover:bg-muted/30 hover:text-foreground transition-colors duration-150"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4 text-primary/80" />
                Save
              </>
            )}
          </Button>
          
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={!currentPrompt}
            className="flex items-center bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-150"
          >
            <Zap className="mr-2 h-4 w-4" />
            Publish
          </Button>
        </div>
      </div>

      <PublishPromptDialog 
        open={isPublishOpen} 
        onOpenChange={setIsPublishOpen} 
        promptTitle={promptTitle}
        documentContent={currentPrompt ? {
          title: promptTitle,
          markdown: markdownContent,
        } : null}
      />
    </div>
  );
}
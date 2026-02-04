'use client';

import React from 'react';
import { toast } from 'sonner';
import { AlertCircle, Terminal } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  PaperCard,
  PaperCardContent,
  PaperCardFooter,
  PaperCardHeader,
  PaperCardTitle,
} from '@/components/ui/paper-card';

export default function DesignSystemPage() {
  const { setTheme, theme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-8 md:p-12 lg:p-20 space-y-20 max-w-7xl mx-auto">
      
      {/* --- Header --- */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-8">
        <div>
          <h1 className="text-4xl font-medium tracking-tight mb-2">Monade Design System</h1>
          <p className="text-muted-foreground text-lg">v1.1 &quot;Sharp &amp; Accessible&quot;</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Theme</span>
          <div className="flex items-center border border-border rounded-md p-1 bg-card">
            <button 
              onClick={() => setTheme('light')}
              className={`px-3 py-1 text-sm font-medium rounded-sm transition-all ${theme === 'light' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Light
            </button>
            <button 
              onClick={() => setTheme('dark')}
              className={`px-3 py-1 text-sm font-medium rounded-sm transition-all ${theme === 'dark' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Dark
            </button>
          </div>
        </div>
      </header>

      {/* --- Section: Typography --- */}
      <section className="space-y-8">
        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-2xl font-medium">Typography</h2>
          <Separator className="flex-1" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground font-mono">H1 / Medium / Tracking-Tight</span>
              <h1 className="text-4xl font-medium tracking-tight">The quick brown fox jumps over the lazy dog</h1>
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground font-mono">H2 / Medium / Tracking-Tight</span>
              <h2 className="text-3xl font-medium tracking-tight">The quick brown fox jumps over the lazy dog</h2>
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground font-mono">H3 / Medium</span>
              <h3 className="text-2xl font-medium">The quick brown fox jumps over the lazy dog</h3>
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground font-mono">H4 / Medium</span>
              <h4 className="text-xl font-medium">The quick brown fox jumps over the lazy dog</h4>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground font-mono">Body / Regular</span>
              <p className="leading-relaxed">
                Monade&apos;s design philosophy prioritizes clarity. We use ample negative space and high contrast to ensure that data is not just visible, but legible. The interface should feel like a precision instrument—unobtrusive, reliable, and sharp.
              </p>
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground font-mono">Muted / Regular</span>
              <p className="text-muted-foreground text-sm">
                This is secondary text used for descriptions, captions, and helper text. It should recede visually but remain accessible.
              </p>
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground font-mono">Micro Label / Uppercase</span>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                System Status
              </p>
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground font-mono">Monospace / Code</span>
              <p className="font-mono text-sm bg-muted p-2 rounded-md border border-border inline-block">
                npm install @monade/core
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- Section: Colors --- */}
      <section className="space-y-8">
        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-2xl font-medium">Colors</h2>
          <Separator className="flex-1" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <ColorSwatch name="Primary (Lemon)" color="bg-[#facc15]" hex="#facc15" text="text-black" />
          <ColorSwatch name="Primary Fg" color="bg-primary-foreground" hex="var(--primary-fg)" text="text-white border border-white/20" />
            
          <ColorSwatch name="Background" color="bg-background" hex="var(--bg)" border />
          <ColorSwatch name="Foreground" color="bg-foreground" hex="var(--fg)" text="text-background" />
            
          <ColorSwatch name="Muted" color="bg-muted" hex="var(--muted)" />
          <ColorSwatch name="Border" color="bg-border" hex="var(--border)" />
            
          <ColorSwatch name="Destructive" color="bg-destructive" hex="#ef4444" text="text-white" />
          <ColorSwatch name="Success" color="bg-green-500" hex="#22c55e" text="text-white" />
        </div>
      </section>

      {/* --- Section: Components --- */}
      <section className="space-y-8">
        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-2xl font-medium">Components</h2>
          <Separator className="flex-1" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
          {/* Buttons */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Buttons</h3>
            <div className="flex flex-wrap gap-4 items-center">
              <Button>Primary Action</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" variant="outline"><Terminal className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              <Button disabled>Disabled</Button>
              <Button variant="outline" className="animate-pulse">Loading...</Button>
            </div>
          </div>

          {/* Badges */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Badges</h3>
            <div className="flex flex-wrap gap-4 items-center">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge className="bg-[#facc15] text-black hover:bg-[#facc15]/80">Lemon</Badge>
            </div>
          </div>

          {/* Inputs */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Inputs</h3>
            <div className="grid gap-4 max-w-sm">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" placeholder="name@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="disabled">Disabled</Label>
                <Input id="disabled" disabled placeholder="Cannot type here" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="password">Password</Label>
                  <span className="text-xs text-muted-foreground">Min 8 chars</span>
                </div>
                <Input id="password" type="password" placeholder="••••••••" />
              </div>
            </div>
          </div>

          {/* Cards */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Cards</h3>
                
            {/* Standard Card */}
            <Card className="max-w-sm">
              <CardHeader>
                <CardTitle>Standard Card</CardTitle>
                <CardDescription>Default &quot;flat&quot; style.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Clean, bordered, no shadow. Ideal for high-density data.
                </p>
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="outline">Action</Button>
              </CardFooter>
            </Card>

            {/* Paper Card (New) */}
            <PaperCard className="max-w-sm">
              <PaperCardHeader>
                <PaperCardTitle>Paper Card</PaperCardTitle>
                <p className="text-sm text-muted-foreground">Living &quot;Digital Paper&quot; Shader.</p>
              </PaperCardHeader>
              <PaperCardContent>
                <p className="text-sm text-muted-foreground relative z-10">
                  This card features a subtle, animated grain texture. Use this for &quot;Hero&quot; elements or to draw attention to specific data blocks.
                </p>
              </PaperCardContent>
              <PaperCardFooter>
                <Button size="sm" className="relative z-10">Interact</Button>
              </PaperCardFooter>
            </PaperCard>
          </div>
        </div>
      </section>

      {/* --- Section: Feedback --- */}
      <section className="space-y-8 pb-20">
        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-2xl font-medium">Feedback & Alerts</h2>
          <Separator className="flex-1" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Toasts (Sonner)</h3>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => toast.success('Assistant Deployed', { description: 'Your agent is now live on +1 (555) 000-0000' })}
              >
                Trigger Success
              </Button>
              <Button
                variant="outline"
                onClick={() => toast.error('Deployment Failed', { description: 'Rate limit exceeded.' })}
              >
                Trigger Error
              </Button>
              <Button
                variant="outline"
                onClick={() => toast.info('Update Available', { description: 'New voice models are ready.' })}
              >
                Trigger Info
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Alerts</h3>
            <Alert>
              <Terminal className="h-4 w-4" />
              <AlertTitle>System Notice</AlertTitle>
              <AlertDescription>
                Scheduled maintenance is planned for 02:00 AM UTC.
              </AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Critical Error</AlertTitle>
              <AlertDescription>
                Failed to connect to telephony provider.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </section>
    </div>
  );
}

// --- Helper Component for Color Swatches ---
function ColorSwatch({ name, color, hex, text = 'text-foreground', border = false }: { name: string, color: string, hex: string, text?: string, border?: boolean }) {
  return (
    <div className="space-y-2">
      <div className={`h-24 w-full rounded-md ${color} ${border ? 'border border-border' : ''} flex items-center justify-center`}>
        <span className={`text-xs font-mono font-medium ${text}`}>{hex}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium">{name}</span>
      </div>
    </div>
  );
}

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2 } from "lucide-react"

export function RecentPrompts() {
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
  ]

  return (
    <div className="space-y-4">
      {prompts.map((prompt) => (
        <Card key={prompt.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{prompt.title}</CardTitle>
                <CardDescription className="mt-1">{prompt.description}</CardDescription>
              </div>
              <div className="flex gap-1">
                {prompt.agents.map((agent) => (
                  <Badge key={agent} variant="secondary">
                    {agent}
                  </Badge>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardFooter className="flex justify-between border-t pt-4">
            <div className="text-sm text-muted-foreground">Updated {prompt.updatedAt}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/knowledge-base/editor/${prompt.id}`}>
                  <Edit className="mr-2 h-3.5 w-3.5" />
                  Edit
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="text-destructive">
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </CardFooter>
        </Card>
      ))}

      <div className="flex justify-center">
        <Button variant="outline" asChild>
          <Link href="/knowledge-base/prompts">View All Prompts</Link>
        </Button>
      </div>
    </div>
  )
}

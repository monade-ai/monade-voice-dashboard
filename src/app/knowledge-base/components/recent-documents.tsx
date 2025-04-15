import Link from 'next/link';
import { Download, FileText, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function RecentDocuments() {
  const documents = [
    {
      id: '1',
      title: 'Product Manual v2.3.pdf',
      description: 'Complete user guide for the latest product version',
      size: '2.4 MB',
      uploadedAt: '3 days ago',
    },
    {
      id: '2',
      title: 'FAQ Database.docx',
      description: 'Comprehensive list of frequently asked questions and answers',
      size: '1.1 MB',
      uploadedAt: '1 week ago',
    },
    {
      id: '3',
      title: 'Technical Specifications.pdf',
      description: 'Detailed technical specifications for all products',
      size: '3.7 MB',
      uploadedAt: '2 days ago',
    },
  ];

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <Card key={doc.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-muted p-2">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-base">{doc.title}</CardTitle>
                  <CardDescription className="mt-1">{doc.description}</CardDescription>
                </div>
              </div>
              <Badge variant="outline">{doc.size}</Badge>
            </div>
          </CardHeader>
          <CardFooter className="flex justify-between border-t pt-4">
            <div className="text-sm text-muted-foreground">Uploaded {doc.uploadedAt}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-3.5 w-3.5" />
                Download
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
          <Link href="/documents">View All Documents</Link>
        </Button>
      </div>
    </div>
  );
}

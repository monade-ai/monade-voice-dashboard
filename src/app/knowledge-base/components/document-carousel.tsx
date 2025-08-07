'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Trash2,
  AlertCircle,
} from 'lucide-react';

import { useTranslations } from '@/i18n/translations-context';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useKnowledgeBase, KnowledgeBase } from '@/app/hooks/use-knowledge-base';

import { useToast } from '../hooks/use-toast';

const formatDate = (date: Date): string => {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffSeconds = Math.floor(diffTime / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes === 1) return '1 min ago';
  if (diffMinutes < 60) return `${diffMinutes} mins ago`;
  if (diffHours === 1) return '1 hr ago';
  if (diffHours < 24) return `${diffHours} hrs ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString();
};

export function DocumentCarousel() {
  const { t } = useTranslations();
  const { knowledgeBases, isLoading, error, deleteKnowledgeBase } = useKnowledgeBase();
  const { toast } = useToast();

  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleCards, setVisibleCards] = useState(3);

  useEffect(() => {
    const updateVisibleCards = () => {
      let numCards = 3;
      if (window.innerWidth < 640) {
        numCards = 1;
      } else if (window.innerWidth < 1024) {
        numCards = 2;
      }
      setVisibleCards(numCards);
      setCurrentIndex(0);
    };

    updateVisibleCards();
    window.addEventListener('resize', updateVisibleCards);

    return () => window.removeEventListener('resize', updateVisibleCards);
  }, []);

  const maxIndex = useMemo(() => Math.max(0, knowledgeBases.length - visibleCards), [knowledgeBases.length, visibleCards]);

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  const handleDelete = async (document: KnowledgeBase) => {
    if (confirm(`Are you sure you want to delete "${document.filename}"? This cannot be undone.`)) {
      const success = await deleteKnowledgeBase(document.id);
      if (success) {
        setCurrentIndex(prev => Math.min(prev, Math.max(0, knowledgeBases.length - 1 - visibleCards)));
      }
    }
  };

  if (isLoading && knowledgeBases.length === 0) {
    return (
      <div className="relative">
        <div className="overflow-hidden px-1 py-4">
          <div className="flex">
            {[...Array(visibleCards)].map((_, index) => (
              <div key={index} className={cn('px-2 flex-shrink-0', `w-full sm:w-1/2 lg:w-1/${visibleCards}`)}>
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardFooter className="flex justify-between border-t pt-2 pb-2 mt-1">
                    <Skeleton className="h-3 w-1/4" />
                    <div className="flex gap-1">
                      <Skeleton className="h-7 w-7 rounded-full" />
                    </div>
                  </CardFooter>
                </Card>
              </div>
            ))}
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 rounded-full bg-white/80 backdrop-blur-sm shadow-md hover:bg-white disabled:opacity-50 z-10"
          onClick={handlePrev}
          disabled={true}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 rounded-full bg-white/80 backdrop-blur-sm shadow-md hover:bg-white disabled:opacity-50 z-10"
          onClick={handleNext}
          disabled={true}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto my-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Documents</AlertTitle>
        <AlertDescription>
          {error} - Please try refreshing the page or contact support.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="relative">
      {knowledgeBases.length === 0 ? (
        <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Documents Found</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
            {t('knowledgeBase.uploadDocument.description')}
          </p>
          <Button asChild className="rounded-full bg-amber-500 hover:bg-amber-600">
            <Link href="/knowledge-base/upload">{t('knowledgeBase.uploadDocument.title')}</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="overflow-hidden px-1 py-4">
            <div
              ref={containerRef}
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentIndex * (100 / visibleCards)}%)` }}
            >
              {knowledgeBases.map((document) => (
                <div key={document.id} className={cn('px-2 flex-shrink-0 transition-opacity duration-300', `w-full sm:w-1/2 lg:w-1/${visibleCards}`)}>
                  <Card className="h-full transform transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col">
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-amber-50 p-2 flex-shrink-0">
                          <FileText className="h-5 w-5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-medium leading-tight truncate" title={document.filename}>{document.filename}</CardTitle>
                          <CardDescription className="mt-1 text-xs text-muted-foreground">
                            ID: {document.id}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardFooter className="flex justify-between border-t pt-2 pb-2 mt-auto">
                      <div className="text-[10px] text-muted-foreground">{formatDate(document.createdAt)}</div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(document)}
                          disabled={isLoading}
                          className="h-7 w-7 rounded-full bg-red-50 hover:bg-red-100 text-red-600 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-70"
                          title="Delete Knowledge Base"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          {knowledgeBases.length > visibleCards && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 rounded-full bg-white/80 backdrop-blur-sm shadow-md hover:bg-white disabled:opacity-50 z-10"
                onClick={handlePrev}
                disabled={currentIndex === 0 || isLoading}
                aria-label="Previous Document"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 rounded-full bg-white/80 backdrop-blur-sm shadow-md hover:bg-white disabled:opacity-50 z-10"
                onClick={handleNext}
                disabled={currentIndex >= maxIndex || isLoading}
                aria-label="Next Document"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
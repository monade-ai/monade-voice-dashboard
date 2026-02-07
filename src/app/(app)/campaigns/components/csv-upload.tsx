'use client';

import React, { useCallback, useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  parseCSV,
  saveCSVPreview,
  deleteCSVPreview,
  ParseCSVResult,
  createDedupedCSV,
} from '@/lib/utils/csv-preview';
import { CSVPreviewCache } from '@/types/campaign.types';

interface CSVUploadProps {
  campaignId?: string;
  onUploadComplete?: (file: File, result: ParseCSVResult) => void | Promise<void>;
  onPreviewSaved?: (preview: CSVPreviewCache | null) => void;
  disabled?: boolean;
  existingPreview?: CSVPreviewCache | null;
}

export function CSVUpload({
  campaignId,
  onUploadComplete,
  onPreviewSaved,
  disabled = false,
  existingPreview = null,
}: CSVUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseCSVResult | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CSVPreviewCache | null>(existingPreview);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        toast.error('Please upload a CSV file');

        return;
      }

      setIsProcessing(true);
      try {
        const result = await parseCSV(file);
        setParseResult(result);
        setCurrentFile(file);

        // Save preview to localStorage if we have a campaignId
        if (campaignId) {
          const savedPreview = saveCSVPreview(campaignId, file.name, result);
          setPreview(savedPreview);
          onPreviewSaved?.(savedPreview);
        }

        toast.success(`Loaded ${result.totalContacts} contacts`);

        if (result.duplicates.count > 0) {
          toast.warning(`Found ${result.duplicates.count} duplicate phone numbers`);
        }

      } catch (error) {
        console.error('CSV parsing error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to parse CSV');
      } finally {
        setIsProcessing(false);
      }
    },
    [campaignId, onPreviewSaved],
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (disabled || isProcessing) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        processFile(file);
      }
    },
    [disabled, isProcessing, processFile],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isProcessing) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleRemoveDuplicates = async () => {
    if (!currentFile || !parseResult) return;

    setIsProcessing(true);
    try {
      const dedupedFile = await createDedupedCSV(currentFile);
      const result = await parseCSV(dedupedFile);
      setParseResult(result);
      setCurrentFile(dedupedFile);

      if (campaignId) {
        const savedPreview = saveCSVPreview(campaignId, dedupedFile.name, result);
        setPreview(savedPreview);
        onPreviewSaved?.(savedPreview);
      }

      toast.success(`Removed ${parseResult.duplicates.count} duplicates`);
    } catch (error) {
      console.error('Deduplication error:', error);
      toast.error('Failed to remove duplicates');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setParseResult(null);
    setCurrentFile(null);
    setPreview(null);
    if (campaignId) {
      deleteCSVPreview(campaignId);
    }
    onPreviewSaved?.(null);
  };

  const handleUploadToCampaign = async () => {
    if (!currentFile || !parseResult || !onUploadComplete) return;
    setIsProcessing(true);
    try {
      // Keep backend ingestion aligned with the preview: upload a normalized, deduped CSV when duplicates exist.
      // Backend currently accepts duplicates; this prevents duplicate calls and "preview != uploaded" mismatches.
      const fileToUpload = parseResult.duplicates.count > 0
        ? await createDedupedCSV(currentFile)
        : currentFile;

      await onUploadComplete(fileToUpload, parseResult);
    } catch (error) {
      console.error('Campaign upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload contacts');
    } finally {
      setIsProcessing(false);
    }
  };

  const displayPreview = preview || (parseResult ? {
    campaignId: campaignId || '',
    uploadedAt: new Date().toISOString(),
    fileName: currentFile?.name || '',
    totalContacts: parseResult.totalContacts,
    duplicatesFound: parseResult.duplicates.count,
    duplicateNumbers: parseResult.duplicates.numbers,
    fieldNames: parseResult.fieldNames,
    preview: parseResult.contacts.slice(0, 50),
    phoneColumnName: parseResult.phoneColumnName,
  } : null);

  // If we have existing preview but no parse result, show the preview
  if (existingPreview && !parseResult) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium">
            <FileSpreadsheet className="inline-block mr-2 h-4 w-4" />
            {existingPreview.fileName}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={disabled}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {existingPreview.totalContacts} contacts
              </span>
              {existingPreview.duplicatesFound > 0 && (
                <span className="flex items-center gap-1 text-amber-500">
                  <AlertTriangle className="h-4 w-4" />
                  {existingPreview.duplicatesFound} duplicates
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1">
              {existingPreview.fieldNames.map((field) => (
                <Badge key={field} variant="secondary" className="text-xs">
                  {field === existingPreview.phoneColumnName ? `${field} (phone)` : field}
                </Badge>
              ))}
            </div>

            <ScrollArea className="h-64 rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {existingPreview.fieldNames.map((field) => (
                      <TableHead key={field} className="text-xs">
                        {field}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {existingPreview.preview.map((contact, idx) => (
                    <TableRow key={idx}>
                      {existingPreview.fieldNames.map((field) => (
                        <TableCell key={field} className="text-xs py-1">
                          {field === existingPreview.phoneColumnName
                            ? contact.phone_number
                            : contact[field] || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {existingPreview.preview.length < existingPreview.totalContacts && (
              <p className="text-xs text-muted-foreground text-center">
                Showing {existingPreview.preview.length} of {existingPreview.totalContacts} contacts
              </p>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Different File
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      {!displayPreview && (
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            ${disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !disabled && !isProcessing && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled || isProcessing}
          />

          {isProcessing ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Processing CSV...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">Drop your CSV file here</p>
                <p className="text-sm text-muted-foreground">or click to browse</p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                CSV must have a phone number column (phone, mobile, number, etc.)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {displayPreview && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">
              <FileSpreadsheet className="inline-block mr-2 h-4 w-4" />
              {displayPreview.fileName}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleClear} disabled={disabled || isProcessing}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  {displayPreview.totalContacts} contacts
                </span>
                {displayPreview.duplicatesFound > 0 && (
                  <span className="flex items-center gap-1 text-amber-500">
                    <AlertTriangle className="h-4 w-4" />
                    {displayPreview.duplicatesFound} duplicates
                  </span>
                )}
              </div>

              {/* Duplicates Warning */}
              {displayPreview.duplicatesFound > 0 && (
                <div className="flex items-center justify-between rounded-md bg-amber-500/10 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span>
                      {displayPreview.duplicatesFound} duplicate phone number(s) found
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveDuplicates}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Remove Duplicates'
                    )}
                  </Button>
                </div>
              )}

              {/* Field Names */}
              <div className="flex flex-wrap gap-1">
                {displayPreview.fieldNames.map((field) => (
                  <Badge key={field} variant="secondary" className="text-xs">
                    {field === displayPreview.phoneColumnName ? `${field} (phone)` : field}
                  </Badge>
                ))}
              </div>

              {/* Preview Table */}
              <ScrollArea className="h-64 rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {displayPreview.fieldNames.map((field) => (
                        <TableHead key={field} className="text-xs">
                          {field}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayPreview.preview.map((contact, idx) => (
                      <TableRow key={idx}>
                        {displayPreview.fieldNames.map((field) => (
                          <TableCell key={field} className="text-xs py-1">
                            {field === displayPreview.phoneColumnName
                              ? contact.phone_number
                              : contact[field] || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {displayPreview.preview.length < displayPreview.totalContacts && (
                <p className="text-xs text-muted-foreground text-center">
                  Showing {displayPreview.preview.length} of {displayPreview.totalContacts} contacts
                </p>
              )}

              {/* Actions */}
              {onUploadComplete && (
                <Button
                  className="w-full"
                  onClick={handleUploadToCampaign}
                  disabled={disabled || isProcessing || !currentFile || !parseResult}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Upload Contacts to Campaign
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isProcessing}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Different File
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

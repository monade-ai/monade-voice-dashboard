'use client';

import React, { useCallback, useState, useRef, useMemo } from 'react';
import { Upload, FileSpreadsheet, X, AlertTriangle, CheckCircle2, Loader2, Globe } from 'lucide-react';
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
  generateCSV,
  ExportContact,
} from '@/lib/utils/csv-preview';
import { CSVPreviewCache, CSVContact } from '@/types/campaign.types';

const COUNTRY_CODES = [
  { code: '+91', label: 'India (+91)' },
  { code: '+1', label: 'US / Canada (+1)' },
  { code: '+971', label: 'UAE (+971)' },
  { code: '+44', label: 'UK (+44)' },
  { code: '+65', label: 'Singapore (+65)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+49', label: 'Germany (+49)' },
  { code: '+33', label: 'France (+33)' },
  { code: '+81', label: 'Japan (+81)' },
  { code: '+86', label: 'China (+86)' },
];

interface CSVUploadProps {
  campaignId?: string;
  onUploadComplete?: (file: File, result: ParseCSVResult) => void | Promise<void>;
  onPreviewSaved?: (preview: CSVPreviewCache | null) => void;
  disabled?: boolean;
  existingPreview?: CSVPreviewCache | null;
}

const getUploadFingerprint = (result: ParseCSVResult): string => {
  const phones = result.contacts
    .map((contact) => contact.phone_number)
    .filter(Boolean)
    .sort();

  return `${phones.length}:${phones.join('|')}`;
};

const getUploadFingerprintKey = (campaignId?: string): string | null => {
  if (!campaignId) return null;

  return `campaign_csv_last_upload_${campaignId}`;
};

export function CSVUpload({
  campaignId,
  onUploadComplete,
  onPreviewSaved,
  disabled = false,
  existingPreview = null,
}: CSVUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInFlightRef = useRef(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseCSVResult | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CSVPreviewCache | null>(existingPreview);
  const [countryCodeDraft, setCountryCodeDraft] = useState('');

  // Count contacts missing a country code (no leading +)
  const missingCcCount = useMemo(
    () => parseResult?.contacts.filter((c) => !c.phone_number.startsWith('+')).length ?? 0,
    [parseResult],
  );

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

  const applyCountryCodeToAll = async () => {
    if (!parseResult || !currentFile || !countryCodeDraft) return;

    setIsProcessing(true);
    try {
      const updatedContacts: CSVContact[] = parseResult.contacts.map((contact) => ({
        ...contact,
        phone_number: contact.phone_number.startsWith('+')
          ? contact.phone_number
          : `${countryCodeDraft}${contact.phone_number}`,
      }));

      const updatedResult: ParseCSVResult = {
        ...parseResult,
        contacts: updatedContacts,
      };

      const csvContent = generateCSV(updatedContacts as ExportContact[], parseResult.fieldNames);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const updatedFile = new File([blob], currentFile.name, { type: 'text/csv' });

      setParseResult(updatedResult);
      setCurrentFile(updatedFile);

      if (campaignId) {
        const savedPreview = saveCSVPreview(campaignId, updatedFile.name, updatedResult);
        setPreview(savedPreview);
        onPreviewSaved?.(savedPreview);
      }

      toast.success(`Applied ${countryCodeDraft} to ${missingCcCount} phone number${missingCcCount !== 1 ? 's' : ''}`);
    } catch (err) {
      console.error('Country code application error:', err);
      toast.error('Failed to apply country code');
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
    if (uploadInFlightRef.current) return;

    const fingerprintKey = getUploadFingerprintKey(campaignId);
    const fingerprint = getUploadFingerprint(parseResult);
    if (fingerprintKey) {
      const lastUploadedFingerprint = localStorage.getItem(fingerprintKey);
      if (lastUploadedFingerprint === fingerprint) {
        toast.error('This contact list is already uploaded for this campaign.');

        return;
      }
    }

    uploadInFlightRef.current = true;
    setIsProcessing(true);
    try {
      // Keep backend ingestion aligned with the preview: upload a normalized, deduped CSV when duplicates exist.
      // Backend currently accepts duplicates; this prevents duplicate calls and "preview != uploaded" mismatches.
      const fileToUpload = parseResult.duplicates.count > 0
        ? await createDedupedCSV(currentFile)
        : currentFile;

      await onUploadComplete(fileToUpload, parseResult);
      if (fingerprintKey) {
        localStorage.setItem(fingerprintKey, fingerprint);
      }
      // Mark this file as uploaded so repeated clicks cannot re-ingest the same contacts.
      setParseResult(null);
      setCurrentFile(null);
    } catch (error) {
      console.error('Campaign upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload contacts');
    } finally {
      setIsProcessing(false);
      uploadInFlightRef.current = false;
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

            {/* Country code nudge for cached preview */}
            {existingPreview.preview.some((c) => !c.phone_number.startsWith('+')) && (
              <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 p-3 text-sm">
                <Globe className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-amber-700 text-xs leading-relaxed">
                  Some contacts in this list appear to be missing a country code (e.g., +91, +1).
                  Re-upload your CSV and use the <strong>Add country code</strong> tool to fix them — otherwise calls will fail.
                </p>
              </div>
            )}

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

              {/* Country Code Warning — only when we have a fresh parse to work with */}
              {parseResult && missingCcCount > 0 && (
                <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3 space-y-3">
                  <div className="flex items-start gap-2">
                    <Globe className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-700">
                        {missingCcCount} contact{missingCcCount !== 1 ? 's' : ''} missing country code
                      </p>
                      <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
                        Phone numbers without a country code (e.g., +91, +1) will be rejected by the carrier.
                        Select a code below to add it to all bare numbers in one click.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-6">
                    <select
                      value={countryCodeDraft}
                      onChange={(e) => setCountryCodeDraft(e.target.value)}
                      className="h-8 bg-background border border-amber-300 rounded px-2 text-xs"
                    >
                      <option value="">Select country code…</option>
                      {COUNTRY_CODES.map(({ code, label }) => (
                        <option key={code} value={code}>{label}</option>
                      ))}
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { void applyCountryCodeToAll(); }}
                      disabled={!countryCodeDraft || isProcessing}
                      className="border-amber-400 text-amber-700 hover:bg-amber-50 h-8 text-xs"
                    >
                      {isProcessing
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : `Add ${countryCodeDraft || 'code'} to all missing`}
                    </Button>
                  </div>
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
              {onUploadComplete && parseResult && currentFile && (
                <Button
                  className="w-full"
                  onClick={handleUploadToCampaign}
                  disabled={disabled || isProcessing}
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

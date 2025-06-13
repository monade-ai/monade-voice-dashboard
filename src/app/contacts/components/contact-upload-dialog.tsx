import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, X, AlertTriangle, FileSpreadsheet, Download, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import Papa from 'papaparse';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useContactsContext, Bucket } from '../contexts/contacts-context';

interface ContactUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  // If a bucket is passed, we are in "upload to existing bucket" mode
  bucket?: Bucket | null;
}

const ContactUploadDialog: React.FC<ContactUploadDialogProps> = ({ isOpen, onClose, bucket }) => {
  const { buckets, createBucket, addContactsBulk } = useContactsContext();

  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [enabledHeaders, setEnabledHeaders] = useState<Set<string>>(new Set());
  
  // State for creating a new bucket
  const [newBucketName, setNewBucketName] = useState('');
  const [newBucketDescription, setNewBucketDescription] = useState('');

  // State for uploading to an existing bucket
  const [selectedBucketId, setSelectedBucketId] = useState<string | undefined>(bucket?.id);

  const [status, setStatus] = useState<'idle' | 'parsing' | 'parsed' | 'uploading' | 'error' | 'success'>('idle');
  const [error, setError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCreatingNewBucket = useMemo(() => !bucket, [bucket]);

  // Reset state when dialog opens/closes or mode changes
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setParsedData(null);
      setCsvHeaders([]);
      setNewBucketName('');
      setNewBucketDescription('');
      setSelectedBucketId(bucket?.id);
      setStatus('idle');
      setError('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
        setSelectedBucketId(bucket?.id);
    }
  }, [isOpen, bucket]);

  const toggleHeader = (header: string) => {
    setEnabledHeaders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(header)) {
        newSet.delete(header);
      } else {
        newSet.add(header);
      }
      return newSet;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setStatus('parsing');
    setError('');
    
    Papa.parse<File>(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        if (headers.length === 0) {
          setError('CSV file appears to be empty or has no headers.');
          setStatus('error');
          return;
        }
        setCsvHeaders(headers);
        setEnabledHeaders(new Set(headers)); // Enable all headers by default
        setParsedData(results.data);
        setStatus('parsed');
      },
      error: (err) => {
        setError(`Error parsing file: ${err.message}`);
        setStatus('error');
      },
    });
  };

  const validateAndPrepareContacts = () => {
    if (!parsedData) return [];
    
    // Basic phone number validation (must include country code)
    const normalizePhone = (phone: string) => phone ? String(phone).replace(/\s+/g, '') : '';
    const isValidPhone = (phone: string) => /^\+[1-9]\d{1,14}$/.test(normalizePhone(phone));

    return parsedData.map(row => ({
        phone_number: normalizePhone(row.phone || row.phoneNumber || row.phone_number),
        data: row,
    })).filter(contact => isValidPhone(contact.phone_number));
  };

  const handleSave = async () => {
    setError('');
    setStatus('uploading');

    const validContacts = validateAndPrepareContacts();
    if (validContacts.length === 0) {
      setError('No valid contacts found. Ensure a "phone" column exists and numbers include a country code (e.g., +1).');
      setStatus('error');
      return;
    }

    try {
      let targetBucketId = selectedBucketId;

      // Workflow 1: Create a new bucket from CSV
      if (isCreatingNewBucket) {
        if (!newBucketName.trim()) {
          setError('Bucket name is required.');
          setStatus('error');
          return;
        }
        const finalHeaders = csvHeaders.filter(h => enabledHeaders.has(h));
        if (finalHeaders.length === 0) {
            setError('You must select at least one header to include in the bucket.');
            setStatus('error');
            return;
        }
        const newBucket = await createBucket(newBucketName.trim(), newBucketDescription.trim(), finalHeaders);
        targetBucketId = newBucket.id;
      }

      if (!targetBucketId) {
        setError('Could not determine the target bucket.');
        setStatus('error');
        return;
      }
      
      // Workflow 2: Upload to existing bucket (with validation)
      const targetBucket = buckets.find(b => b.id === targetBucketId);
      if (!isCreatingNewBucket && targetBucket) {
          const bucketFields = new Set(targetBucket.fields);
          const csvFields = new Set(csvHeaders);
          if (targetBucket.fields.some(field => !csvFields.has(field))) {
              setError(`CSV headers do not match bucket fields. Required: ${targetBucket.fields.join(', ')}`);
              setStatus('error');
              return;
          }
      }

      await addContactsBulk(targetBucketId, validContacts.map(c => c.data));
      setStatus('success');
      setTimeout(onClose, 1500);

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setStatus('error');
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {isCreatingNewBucket ? 'Create Bucket from CSV' : `Upload Contacts to "${bucket?.name}"`}
          </DialogTitle>
          <DialogDescription>
            {isCreatingNewBucket 
              ? 'Upload a CSV to automatically create a new bucket and import contacts.'
              : 'Import contacts into your existing bucket. Headers must match bucket fields.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Step 1: File Upload */}
          {!file ? (
            <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-4">
              <div className="flex justify-center">
                <FileSpreadsheet className="h-10 w-10 text-primary" />
              </div>
              <Button onClick={triggerFileInput}>
                <Upload className="h-4 w-4 mr-2" />
                Choose CSV File
              </Button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
            </div>
          ) : (
            <div className="flex items-center justify-between p-2 border rounded-md">
                <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-6 w-6 text-primary" />
                    <span className="font-medium">{file.name}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
          )}

          {/* Step 2: Configure and Preview */}
          {status === 'parsed' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {isCreatingNewBucket && (
                <>
                  <Input placeholder="New Bucket Name *" value={newBucketName} onChange={e => setNewBucketName(e.target.value)} />
                  <Input placeholder="New Bucket Description (Optional)" value={newBucketDescription} onChange={e => setNewBucketDescription(e.target.value)} />
                </>
              )}
              {!isCreatingNewBucket && (
                  <Alert>
                      <AlertDescription>
                          CSV headers must match these fields: <strong>{bucket?.fields.join(', ')}</strong>
                      </AlertDescription>
                  </Alert>
              )}
              <div>
                <h3 className="font-medium text-sm mb-2">Select Headers to Include:</h3>
                <ScrollArea className="h-20">
                  <div className="flex flex-wrap gap-2 w-full max-w-full">
                    {csvHeaders.map(header => (
                      <Badge
                        key={header}
                        variant={enabledHeaders.has(header) ? 'default' : 'outline'}
                        onClick={() => toggleHeader(header)}
                        className="cursor-pointer"
                      >
                        {header}
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {parsedData && parsedData.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium text-sm mb-2">Preview:</h3>
                  <div className="overflow-x-auto border rounded-md max-h-40 w-full max-w-full">
                    <table className="min-w-full text-xs">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          {Array.from(enabledHeaders).map(header => (
                            <th key={header} className="p-2 text-left font-medium whitespace-nowrap">{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.slice(0, 8).map((row, i) => (
                          <tr key={i} className="border-t">
                            {Array.from(enabledHeaders).map(header => (
                              <td key={header} className="p-2 whitespace-nowrap">
                                {row[header] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedData.length > 8 && (
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      + {parsedData.length - 8} more rows
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Status Messages */}
          {status === 'error' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {status === 'success' && (
            <Alert className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-800">Upload successful! Closing...</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={status === 'uploading' || status === 'success'}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={status !== 'parsed' && status !== 'error'}>
            {status === 'uploading' ? 'Uploading...' : 'Upload and Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContactUploadDialog;

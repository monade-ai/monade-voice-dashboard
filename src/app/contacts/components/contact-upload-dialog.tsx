import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, X, AlertTriangle, FileSpreadsheet, Download, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useContactsContext } from '../contexts/contacts-context';
import Papa from 'papaparse';
// Sample data to show in the preview
const sampleData = [
  { name: 'John Doe', phone: '+11234567890' },
  { name: 'Jane Smith', phone: '+11234567891' },
  { name: 'Robert Johnson', phone: '+11234567892' },
];

interface ContactUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: (contacts: any[]) => void;
}

const ContactUploadDialog: React.FC<ContactUploadDialogProps> = ({
  isOpen,
  onClose,
  onUploadComplete
}) => {
  const { selectedList, addContactsToList } = useContactsContext();
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedHeaders, setSelectedHeaders] = useState<Set<string>>(new Set(['name', 'phone']));
  const [showSamplePreview, setShowSamplePreview] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [processingComplete, setProcessingComplete] = useState(false);
  const [processedContacts, setProcessedContacts] = useState<any[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      // Reset on close
      setFile(null);
      setParsedData(null);
      setHeaders([]);
      setSelectedHeaders(new Set(['name', 'phone']));
      setShowSamplePreview(true);
      setUploadStatus('idle');
      setErrorMessage('');
      setProcessingComplete(false);
      setProcessedContacts([]);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setShowSamplePreview(false);
    setUploadStatus('loading');
    
    Papa.parse<File>(selectedFile as File, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<any>) => {
        // Ensure file has necessary headers
        const fileHeaders = results.meta.fields ?? [];
        setHeaders(fileHeaders);
  
        // Pre-select name and phone headers if they exist
        const newSelectedHeaders = new Set<string>();
        if (fileHeaders.includes("name")) newSelectedHeaders.add("name");
        if (fileHeaders.includes("phone")) newSelectedHeaders.add("phone");
  
        setSelectedHeaders(newSelectedHeaders);
        setParsedData(results.data);
        setUploadStatus("success");
      },
      error: (error) => {
        setErrorMessage(`Error parsing file: ${error.message}`);
        setUploadStatus('error');
      }
    });
  };

  // Toggle header selection
  const toggleHeader = (header: string) => {
    const newSelectedHeaders = new Set(selectedHeaders);
    if (newSelectedHeaders.has(header)) {
      newSelectedHeaders.delete(header);
    } else {
      newSelectedHeaders.add(header);
    }
    setSelectedHeaders(newSelectedHeaders);
  };

  // Handle file upload button click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Validate phone numbers
  const normalizePhoneNumber = (phone: string): string => {
    return phone.replace(/\s+/g, '');
  };
  
  const validatePhoneNumber = (phone: string): boolean => {
    const normalizedPhone = normalizePhoneNumber(phone);
    // Validate for international format with a country code (e.g., +916760625387)
    return /^\+[1-9]\d{1,14}$/.test(normalizedPhone);
  };

  // Process and save data
  const handleSave = () => {
    if (!parsedData || !selectedList) return;
  
    // Trim header names to avoid whitespace issues
    const processedData = parsedData.map(row => {
      console.log("Before Mapping - Row:", row);
      
      const newRow: Record<string, any> = {};
      
      Array.from(selectedHeaders).forEach(header => {
        const trimmedHeader = header.trim(); // Trim headers for matching
    
        // 🔥 Ensure row keys are also trimmed
        const matchingKey = Object.keys(row).find(
          key => key.trim().toLowerCase() === trimmedHeader.toLowerCase()
        );
    
        if (matchingKey) {
          newRow[trimmedHeader] = row[matchingKey]; // Use the correct key
        }
    
        console.log("After Mapping - NewRow:", newRow);
      });
    
      return newRow;
    }).filter(row => {
      console.log("Filtered Row:", row); // Debugging output
    
      // Ensure both name and phone exist and phone is valid
      return row.name && row.phone && validatePhoneNumber(row.phone);
    });
  
    if (processedData.length === 0) {
      setErrorMessage(
        "No valid contacts found. Ensure phone numbers include country code (e.g., +11234567890)"
      );
      return;
    }
  
    setProcessingComplete(true);
    setProcessedContacts(processedData);
  
    // Add contacts to the selected list
    const addedContacts = addContactsToList(selectedList.id, processedData);
  
    if (onUploadComplete) {
      onUploadComplete(addedContacts);
    }
  
    // Close after a short delay to show success message
    setTimeout(() => {
      onClose();
    }, 1500);
  };
  

  // Download sample file
  const downloadSample = () => {
    const csvContent = Papa.unparse({
      fields: ["name", "phone"],
      data: sampleData
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'contacts_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Upload Contacts</DialogTitle>
          <DialogDescription>
            Import your contacts from a CSV file. We'll help you map the fields.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Success message when processing is complete */}
          {processingComplete && (
            <Alert className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-800 text-sm flex justify-between items-center">
                <span>Successfully added {processedContacts.length} contacts!</span>
                <span className="text-xs">{selectedList?.name}</span>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Sample data preview that fades out */}
          <AnimatePresence>
            {showSamplePreview && (
              <motion.div 
                initial={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="bg-gray-50 rounded-md p-4"
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium">Sample Format</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={downloadSample}
                    className="flex items-center gap-1 text-xs"
                  >
                    <Download size={14} />
                    Download Sample
                  </Button>
                </div>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-left font-medium">name</th>
                        <th className="p-2 text-left font-medium">phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sampleData.map((row, i) => (
                        <motion.tr 
                          key={i}
                          initial={{ opacity: 1 }}
                          animate={{ opacity: 1 - (i * 0.3) }}
                          className={i === sampleData.length - 1 ? "opacity-30" : ""}
                        >
                          <td className="p-2 border-t">{row.name}</td>
                          <td className="p-2 border-t">{row.phone}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* File upload area */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="hidden"
            />
            
            {!file ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <FileSpreadsheet className="h-10 w-10 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="font-medium">Upload CSV File</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload your file in the same format (Max size 5MB)
                  </p>
                </div>
                <Button onClick={triggerFileInput} className="mt-2">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-2">
                  <FileSpreadsheet className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      setFile(null);
                      setParsedData(null);
                      setHeaders([]);
                      setShowSamplePreview(true);
                      setUploadStatus('idle');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {uploadStatus === 'loading' && (
                  <div className="flex justify-center">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                )}
                
                {uploadStatus === 'error' && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}
                
                {uploadStatus === 'success' && headers.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium text-sm">Select columns to import:</h3>
                    <ScrollArea className="h-20">
                      <div className="flex flex-wrap gap-2">
                        {headers.map(header => (
                          <Badge
                            key={header}
                            variant={selectedHeaders.has(header) ? "default" : "outline"}
                            className={`cursor-pointer ${
                              selectedHeaders.has(header) 
                                ? 'bg-primary' 
                                : 'line-through text-muted-foreground'
                            }`}
                            onClick={() => toggleHeader(header)}
                          >
                            {header}
                            {selectedHeaders.has(header) ? (
                              <X className="ml-1 h-3 w-3" />
                            ) : null}
                          </Badge>
                        ))}
                      </div>
                    </ScrollArea>
                    
                    {/* Preview of parsed data */}
                    {parsedData && parsedData.length > 0 && (
                      <div className="mt-4">
                        <h3 className="font-medium text-sm mb-2">Preview:</h3>
                        <div className="border rounded overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/50">
                              <tr>
                                {Array.from(selectedHeaders).map(header => (
                                  <th key={header} className="p-2 text-left font-medium">{header}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {parsedData.slice(0, 3).map((row, i) => (
                                <tr key={i}>
                                  {Array.from(selectedHeaders).map(header => (
                                    <td key={header} className="p-2 border-t">
                                      {row[header] || '-'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                              {parsedData.length > 3 && (
                                <tr>
                                  <td 
                                    colSpan={selectedHeaders.size} 
                                    className="p-2 border-t text-center text-muted-foreground"
                                  >
                                    + {parsedData.length - 3} more contacts
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Warning note about phone numbers */}
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-800 text-sm">
              <strong>Note:</strong> Please add the country code to all phone numbers in your file before uploading.
              <div className="mt-1 text-xs">For example: Indian numbers should start with +91, like +91234xxxxxxx</div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={processingComplete}>
            Cancel
          </Button>
          <Button 
            disabled={!parsedData || selectedHeaders.size === 0 || uploadStatus !== 'success' || processingComplete} 
            onClick={handleSave}
          >
            {processingComplete ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Processed
              </>
            ) : (
              'Upload Contacts'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContactUploadDialog;
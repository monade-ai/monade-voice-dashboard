'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, X, Loader2, AlertTriangle, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useContactsContext } from '../contexts/contacts-context';

interface CrmProvider {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  description: string;
}

interface CrmList {
  id: string;
  name: string;
  count: number;
}

interface ContactImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (contacts: any[]) => void;
}

const ContactImportDialog: React.FC<ContactImportDialogProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const { selectedList, addContactsToList } = useContactsContext();
  
  const [selectedTab, setSelectedTab] = useState<string>('hubspot');
  const [selectedProvider, setSelectedProvider] = useState<CrmProvider | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');
  const [availableLists, setAvailableLists] = useState<CrmList[]>([]);
  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set());
  const [importComplete, setImportComplete] = useState(false);
  const [importStats, setImportStats] = useState<{total: number, successful: number}>({ total: 0, successful: 0 });
  const [errorMessage, setErrorMessage] = useState('');
  
  // Mock CRM providers with icon paths and descriptions
  const crmProviders: CrmProvider[] = [
    { 
      id: 'hubspot', 
      name: 'HubSpot', 
      icon: '/hubspot-logo.svg', 
      connected: false,
      description: 'Connect to HubSpot to import contacts, companies, and deals directly into your contact lists.',
    },
    { 
      id: 'ghl', 
      name: 'Go High Level', 
      icon: '/ghl-logo.svg', 
      connected: false,
      description: 'Import contacts from Go High Level to streamline your marketing and sales workflows.',
    },
    { 
      id: 'salesforce', 
      name: 'Salesforce', 
      icon: '/salesforce-logo.svg', 
      connected: false,
      description: 'Connect your Salesforce account to sync contacts, leads and opportunities.',
    },
    { 
      id: 'mailchimp', 
      name: 'Mailchimp', 
      icon: '/mailchimp-logo.svg', 
      connected: false,
      description: 'Import subscribers and audience segments from your Mailchimp lists.',
    },
  ];

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedProvider(null);
      setConnectionStatus('idle');
      setAvailableLists([]);
      setSelectedLists(new Set());
      setImportComplete(false);
      setImportStats({ total: 0, successful: 0 });
      setErrorMessage('');
    }
  }, [isOpen]);
  
  // Handle CRM provider selection
  const handleProviderSelect = (provider: CrmProvider) => {
    setSelectedProvider(provider);
  };
  
  // Connect to CRM
  const handleConnect = () => {
    if (!selectedProvider) return;
    
    setIsConnecting(true);
    setConnectionStatus('connecting');
    setErrorMessage('');
    
    // Simulate API connection
    setTimeout(() => {
      // Random chance of connection failure for demo purposes
      if (Math.random() < 0.1) {
        setConnectionStatus('failed');
        setErrorMessage('Could not connect to the CRM provider. Please try again.');
        setIsConnecting(false);

        return;
      }
      
      setConnectionStatus('connected');
      setIsConnecting(false);
      
      // Simulate available lists from CRM
      const mockLists = [
        { id: 'list1', name: 'All Contacts', count: 254 },
        { id: 'list2', name: 'Recent Leads', count: 78 },
        { id: 'list3', name: 'Active Customers', count: 142 },
        { id: 'list4', name: 'Newsletter Subscribers', count: 320 },
        { id: 'list5', name: 'Event Attendees', count: 87 },
        { id: 'list6', name: 'Trial Users', count: 126 },
      ];
      
      setAvailableLists(mockLists);
    }, 2000);
  };
  
  // Toggle list selection
  const toggleListSelection = (listId: string) => {
    const newSelection = new Set(selectedLists);
    if (newSelection.has(listId)) {
      newSelection.delete(listId);
    } else {
      newSelection.add(listId);
    }
    setSelectedLists(newSelection);
  };
  
  // Import selected lists
  const handleImport = async () => {
    if (!selectedList || selectedLists.size === 0) return;

    setIsImporting(true);
    setErrorMessage('');

    try {
      // Simulate import process delay
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // Create sample contacts from selected lists
      const importedContacts = Array.from(selectedLists).flatMap(listId => {
        const list = availableLists.find(l => l.id === listId);
        if (!list) return [];

        // Generate some sample contacts for each list
        return Array(Math.min(list.count, 5)).fill(0).map((_, index) => ({
          name: `Contact ${index + 1} from ${list.name}`,
          phone: `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          source: list.name,
          email: `contact${index + 1}@example.com`,
          company: `Company ${Math.floor(Math.random() * 100)}`,
        }));
      });

      // Add the contacts to the selected list
      const addedContacts = await addContactsToList(selectedList.id, importedContacts);

      setImportComplete(true);
      setImportStats({
        total: importedContacts.length,
        successful: addedContacts.length,
      });

      if (onImportComplete) {
        onImportComplete(addedContacts);
      }

      // Close dialog after a delay to show the success message
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      setErrorMessage('An error occurred during import. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  // Retry connection after failure
  const handleRetry = () => {
    setConnectionStatus('idle');
    setErrorMessage('');
    handleConnect();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Import from CRM</DialogTitle>
          <DialogDescription>
            Connect to your CRM to import contacts directly.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6">
          {/* Success message when import is complete */}
          {importComplete && (
            <Alert className="bg-green-50 border-green-200 mb-6">
              <Check className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-800">
                <div className="font-medium">Import successful!</div>
                <div className="text-sm mt-1">
                  Imported {importStats.successful} of {importStats.total} contacts to "{selectedList?.name}".
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Error message */}
          {errorMessage && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
        
          {!selectedProvider ? (
            // CRM provider selection
            <Tabs defaultValue={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="w-full mb-6">
                {crmProviders.map(provider => (
                  <TabsTrigger key={provider.id} value={provider.id} className="flex-1">
                    {provider.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {crmProviders.map(provider => (
                <TabsContent key={provider.id} value={provider.id} className="mt-0">
                  <div className="flex flex-col items-center justify-center space-y-6 py-8">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="bg-primary/10 p-5 rounded-full">
                        {/* Fallback icon if image fails to load */}
                        <div className="h-20 w-20 flex items-center justify-center text-2xl font-bold text-primary">
                          {provider.name.charAt(0)}
                        </div>
                      </div>
                    </motion.div>
                    <div className="text-center">
                      <h3 className="text-lg font-medium mb-1">Connect to {provider.name}</h3>
                      <p className="text-muted-foreground text-sm mb-4 max-w-sm">
                        {provider.description}
                      </p>
                      <Button 
                        onClick={() => handleProviderSelect(provider)}
                        className="px-6"
                      >
                        Connect
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          ) : connectionStatus === 'connected' ? (
            // CRM list selection
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-primary/10 p-2 rounded-full mr-3">
                    <div className="h-8 w-8 flex items-center justify-center font-bold text-primary">
                      {selectedProvider.name.charAt(0)}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium">{selectedProvider.name}</h3>
                    <p className="text-sm text-muted-foreground">Connected</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Connected
                </Badge>
              </div>
              
              <div className="border rounded-md p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">Select lists to import</h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs"
                    onClick={() => {
                      // Toggle all lists
                      if (selectedLists.size === availableLists.length) {
                        setSelectedLists(new Set());
                      } else {
                        setSelectedLists(new Set(availableLists.map(list => list.id)));
                      }
                    }}
                  >
                    {selectedLists.size === availableLists.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                
                {availableLists.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    Loading lists...
                  </div>
                ) : (
                  <ScrollArea className="max-h-[300px] pr-2">
                    <div className="space-y-3">
                      <AnimatePresence>
                        {availableLists.map((list, index) => (
                          <motion.div 
                            key={list.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.05 }}
                            className={`
                              flex items-center justify-between p-3 rounded-md cursor-pointer border
                              ${selectedLists.has(list.id) 
                            ? 'border-primary bg-primary/5' 
                            : 'border-muted-foreground/20 hover:border-muted-foreground/40'}
                            `}
                            onClick={() => toggleListSelection(list.id)}
                          >
                            <div>
                              <h5 className="font-medium">{list.name}</h5>
                              <p className="text-sm text-muted-foreground">{list.count} contacts</p>
                            </div>
                            <div className={`
                              h-5 w-5 rounded-full border flex items-center justify-center
                              ${selectedLists.has(list.id) 
                            ? 'bg-primary border-primary text-white' 
                            : 'border-muted-foreground/50'}
                            `}>
                              {selectedLists.has(list.id) && (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </ScrollArea>
                )}
                
                {selectedLists.size > 0 && (
                  <div className="mt-4 p-3 bg-muted/20 rounded-md">
                    <div className="text-sm">
                      <span className="font-medium">Selected: </span>
                      {selectedLists.size} lists with approximately{' '}
                      <span className="font-medium">
                        {availableLists
                          .filter(list => selectedLists.has(list.id))
                          .reduce((sum, list) => sum + list.count, 0)} 
                        contacts
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : connectionStatus === 'failed' ? (
            // Connection failure view
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-primary/10 p-2 rounded-full mr-3">
                    <div className="h-8 w-8 flex items-center justify-center font-bold text-primary">
                      {selectedProvider.name.charAt(0)}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium">{selectedProvider.name}</h3>
                    <p className="text-sm text-red-500">Connection failed</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => {
                  setSelectedProvider(null);
                  setConnectionStatus('idle');
                }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="bg-red-100 text-red-500 rounded-full p-4 mb-4">
                  <AlertTriangle className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-medium mb-2">Connection Failed</h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-sm">
                  We couldn't connect to your {selectedProvider.name} account. 
                  Please check your credentials and try again.
                </p>
                <Button onClick={handleRetry}>
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            // Connecting view
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-primary/10 p-2 rounded-full mr-3">
                    <div className="h-8 w-8 flex items-center justify-center font-bold text-primary">
                      {selectedProvider.name.charAt(0)}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium">{selectedProvider.name}</h3>
                    <p className="text-sm text-muted-foreground">Connecting...</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => {
                  setSelectedProvider(null);
                  setConnectionStatus('idle');
                }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <h3 className="text-lg font-medium">Connecting to {selectedProvider.name}</h3>
                <p className="text-muted-foreground text-sm mt-2">
                  This may take a few moments...
                </p>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isConnecting || isImporting || importComplete}
          >
            Cancel
          </Button>
          
          {selectedProvider && connectionStatus === 'idle' && (
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting
                </>
              ) : (
                'Connect'
              )}
            </Button>
          )}
          
          {connectionStatus === 'connected' && (
            <Button 
              onClick={handleImport} 
              disabled={isImporting || selectedLists.size === 0 || importComplete}
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing
                </>
              ) : importComplete ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Imported
                </>
              ) : (
                `Import ${selectedLists.size} ${selectedLists.size === 1 ? 'List' : 'Lists'}`
              )}
            </Button>
          )}
          
          {connectionStatus === 'failed' && (
            <Button onClick={handleRetry} disabled={isConnecting}>
              Try Again
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContactImportDialog;

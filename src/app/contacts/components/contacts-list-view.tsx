import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  User, 
  Upload, 
  Loader2, 
  FileSpreadsheet, 
  Users, 
  CloudUpload, 
  MoreHorizontal,
  Trash2,
  Edit,
  Copy,
  Phone,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { initiateExotelCall } from '@/lib/services/exotel-service';
import { useTranslations } from '@/i18n/translations-context';

import { useContactsContext } from '../contexts/contacts-context';

import { CallAssistantDialog } from './call-assistant-dialog';

interface PhoneAssistant {
  id: string;
  name: string;
  avatar?: string;
}

const MOCK_PHONE_ASSISTANTS: PhoneAssistant[] = [
  { id: '1', name: 'Sales Assistant' },
  { id: '2', name: 'Support Assistant' },
  { id: '3', name: 'Customer Service Assistant' },
];

interface ContactListViewProps {
  onCreateList: () => void;
  onUploadContacts: () => void;
  onImportContacts: () => void;
  onCreateContact: () => void;
}

const ContactListView: React.FC<ContactListViewProps> = ({
  onCreateList,
  onUploadContacts,
  onImportContacts,
  onCreateContact,
}) => {
  // Move the hook call inside the component
  const { t } = useTranslations();
  
  const { 
    contactLists, 
    contacts, 
    selectedList, 
    isLoading, 
    searchResults,
    searchQuery,
    selectContactList,
    removeContactList,
    removeContactFromList,
    searchInCurrentList,
    clearSearch,
  } = useContactsContext();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [newListCreated, setNewListCreated] = useState(false);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [selectedAssistant, setSelectedAssistant] = useState<PhoneAssistant | null>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'initiating' | 'connecting' | 'connected' | 'failed' | 'completed'>('idle');
  const [remainingTime, setRemainingTime] = useState(5);
  const [isCallInitiating, setIsCallInitiating] = useState(false);
  const [activeCall, setActiveCall] = useState<{ startTime: number } | null>(null);
  const [callDuration, setCallDuration] = useState<number>(0);
  
  // Update call duration
  useEffect(() => {
    if (!activeCall) {
      setCallDuration(0);

      return;
    }
    
    const timer = setInterval(() => {
      const duration = Math.floor((Date.now() - activeCall.startTime) / 1000);
      setCallDuration(duration);
    }, 1000);
  
    return () => clearInterval(timer);
  }, [activeCall]);
  
  const itemsPerPage = 10;

  // Reset pagination when list or search changes
  useEffect(() => {
    setCurrentPage(1);
    
    if (selectedList) {
      const currentContacts = searchQuery 
        ? searchResults 
        : (contacts[selectedList.id] || []);
        
      setTotalPages(Math.ceil(currentContacts.length / itemsPerPage));
    } else {
      setTotalPages(1);
    }
  }, [selectedList, searchQuery, searchResults, contacts]);

  // Get current page contacts
  const currentContacts = selectedList 
    ? (searchQuery 
      ? searchResults 
      : (contacts[selectedList.id] || [])
    ).slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage,
    )
    : [];

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    searchInCurrentList(e.target.value);
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  // Empty state when no lists exist
  const EmptyListsState = () => (
    <div className="flex flex-col items-center justify-center h-[400px] text-center">
      <div className="bg-primary/10 p-6 rounded-full mb-4">
        <Users className="w-12 h-12 text-primary" />
      </div>
      <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-400 bg-clip-text text-transparent">
        {t('contacts.emptyState.title')}
      </h2>
      <p className="text-muted-foreground mt-2 mb-6 max-w-md">
        {t('contacts.emptyState.description')}
      </p>
      <Button 
        size="lg" 
        onClick={onCreateList}
        className="flex items-center"
      >
        <Plus className="mr-2 h-4 w-4" />
        {t('contacts.emptyState.createButton')}
      </Button>
    </div>
  );

  // Empty state when no contacts exist in a list
  const EmptyContactsState = () => (
    <div className="flex flex-col items-center justify-center h-[400px] text-center">
      <div className="bg-primary/10 p-6 rounded-full mb-4">
        <User className="w-12 h-12 text-primary" />
      </div>
      <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-400 bg-clip-text text-transparent">
        No contacts in this list
      </h2>
      <p className="text-muted-foreground mt-2 mb-6 max-w-md">
        You can either upload contacts or create manually.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          variant="outline" 
          onClick={onUploadContacts}
          className="flex items-center"
        >
          <CloudUpload className="mr-2 h-4 w-4" />
          Upload Contacts
        </Button>
        <Button 
          onClick={onImportContacts}
          className="flex items-center"
        >
          <Plus className="mr-2 h-4 w-4" />
          Import from CRM
        </Button>
        <Button 
          variant="secondary"
          onClick={onCreateContact}
          className="flex items-center"
        >
          <User className="mr-2 h-4 w-4" />
          Create Manually
        </Button>
      </div>
    </div>
  );

  return (
    <div>
      {/* Header with list creation button */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Contact Lists</h1>
          <p className="text-muted-foreground">
            {contactLists.length} {contactLists.length === 1 ? 'list' : 'lists'} available
          </p>
        </div>
        {contactLists.length > 0 && (
          <Button onClick={onCreateList}>
            <Plus className="mr-2 h-4 w-4" />
            New Contact List
          </Button>
        )}
      </div>

      {isLoading && !selectedList ? (
        <div className="flex justify-center items-center h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : contactLists.length === 0 ? (
        <EmptyListsState />
      ) : (
        <div>
          {/* List/Detail View Selector */}
          <div className="space-y-6">
            {!selectedList ? (
              // List Grid View
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {contactLists.map((list, index) => (
                    <motion.div
                      key={list.id}
                      initial={newListCreated && index === contactLists.length - 1 ? { scale: 0.9, opacity: 0 } : { scale: 1, opacity: 1 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      transition={{ type: 'spring', duration: 0.5 }}
                      layout
                    >
                      <Card 
                        className="cursor-pointer hover:shadow-md transition-shadow h-full" 
                        onClick={() => selectContactList(list.id)}
                      >
                        <CardContent className="p-5 flex flex-col h-full">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center mb-3 mt-1">
                                <FileSpreadsheet className="h-5 w-5 text-primary" />
                              </div>
                              <h3 className="font-semibold text-lg">{list.name}</h3>
                              {list.description && (
                                <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{list.description}</p>
                              )}
                              <div className="mt-auto pt-4 flex items-center justify-between">
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <Users className="h-4 w-4 mr-1" />
                                  {list.count} {list.count === 1 ? 'contact' : 'contacts'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Created {formatDate(list.createdAt)}
                                </div>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  selectContactList(list.id);
                                }}>
                                  <Users className="h-4 w-4 mr-2" />
                                  View Contacts
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Are you sure you want to delete "${list.name}"?`)) {
                                      removeContactList(list.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              // Contact Detail View
              <div>
                {/* List Header with Back Button */}
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center">
                    <Button 
                      variant="ghost" 
                      className="mr-2 p-2"
                      onClick={() => {
                        selectContactList(null);
                        clearSearch();
                      }}
                    >
                      ← Back to Lists
                    </Button>
                    <h2 className="text-xl font-semibold">{selectedList.name}</h2>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground">
                      {selectedList.count} {selectedList.count === 1 ? 'contact' : 'contacts'}
                      {selectedContacts.size > 0 && (
                        <span className="ml-2 text-sm text-muted-foreground">
                          ({selectedContacts.size} selected)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Search and Action Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div className="relative w-full sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search contacts..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={handleSearchChange}
                    />
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    {selectedContacts.size > 0 && (
                      <Button 
                        variant="secondary"
                        onClick={() => {
                          const selectedContactsList = currentContacts.filter(contact => selectedContacts.has(contact.id));
                          if (selectedContactsList.length > 0) {
                            setSelectedContact(selectedContactsList[0]);
                            setIsCallDialogOpen(true);
                          }
                        }}
                        className="flex-1 sm:flex-initial mr-2"
                      >
                        <Phone className="mr-2 h-4 w-4" />
                        Call Selected ({selectedContacts.size})
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      onClick={onUploadContacts}
                      className="flex-1 sm:flex-initial"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </Button>
                    <Button 
                      onClick={onCreateContact}
                      className="flex-1 sm:flex-initial"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Contact
                    </Button>
                  </div>
                </div>
                
                {/* Contact List */}
                {isLoading ? (
                  <div className="flex justify-center items-center h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : currentContacts.length === 0 ? (
                  searchQuery ? (
                    <div className="text-center py-12 border rounded-md">
                      <Search className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <h3 className="text-lg font-medium">No results found</h3>
                      <p className="text-muted-foreground">
                        Try adjusting your search query
                      </p>
                    </div>
                  ) : (
                    <EmptyContactsState />
                  )
                ) : (
                  <div>
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-left p-4 font-medium">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300"
                                checked={currentContacts.length > 0 && selectedContacts.size === currentContacts.length}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedContacts(new Set(currentContacts.map(contact => contact.id)));
                                  } else {
                                    setSelectedContacts(new Set());
                                  }
                                }}
                              />
                            </th>
                            <th className="text-left p-4 font-medium">Name</th>
                            <th className="text-left p-4 font-medium">Phone</th>
                            <th className="text-center p-4 font-medium">Call</th>
                            <th className="text-right p-4 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentContacts.map((contact) => (
                            <tr key={contact.id} className="border-t hover:bg-muted">
                              <td className="p-4">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-gray-300"
                                  checked={selectedContacts.has(contact.id)}
                                  onChange={(e) => {
                                    const newSelected = new Set(selectedContacts);
                                    if (e.target.checked) {
                                      newSelected.add(contact.id);
                                    } else {
                                      newSelected.delete(contact.id);
                                    }
                                    setSelectedContacts(newSelected);
                                  }}
                                />
                              </td>
                              <td className="p-4">{contact.name}</td>
                              <td className="p-4">{contact.phone}</td>
                              <td className="p-4 text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedContact(contact);
                                    setIsCallDialogOpen(true);
                                  }}
                                  className="hover:text-primary"
                                >
                                  <Phone className="h-4 w-4" />
                                </Button>
                              </td>
                              <td className="p-4 text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Copy className="h-4 w-4 mr-2" />
                                      Move to list
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      className="text-destructive"
                                      onClick={() => {
                                        if (confirm('Are you sure you want to delete this contact?')) {
                                          removeContactFromList(selectedList.id, contact.id);
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex justify-center mt-6">
                        <nav className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(page => Math.max(page - 1, 1))}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </Button>
                          
                          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            // Show first, last, current and up to 2 neighbors
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                              if (i === 4) pageNum = totalPages;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                              if (i === 0) pageNum = 1;
                            } else {
                              pageNum = currentPage - 2 + i;
                              if (i === 0) pageNum = 1;
                              if (i === 4) pageNum = totalPages;
                            }
                            
                            // Show ellipses if needed
                            if ((i === 1 && pageNum > 2) || (i === 3 && pageNum < totalPages - 1)) {
                              return (
                                <span 
                                  key={`ellipsis-${i}`} 
                                  className="px-2 text-muted-foreground"
                                >
                                  ...
                                </span>
                              );
                            }
                            
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className="w-9"
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(page => Math.min(page + 1, totalPages))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </Button>
                        </nav>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Phone Assistant Selection Dialog */}
      <Dialog open={isCallDialogOpen && !selectedAssistant} onOpenChange={setIsCallDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Phone Assistant</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {selectedContact && (
              <div className="px-4 py-2 bg-muted rounded-lg">
                <p className="font-medium">Calling:</p>
                <p>{selectedContact.name} - {selectedContact.phone}</p>
              </div>
            )}
            {MOCK_PHONE_ASSISTANTS.map((assistant) => (
              <Button
                key={assistant.id}
                variant="outline"
                className="justify-start"
                onClick={() => {
                  setSelectedAssistant(assistant);
                }}
              >
                <User className="mr-2 h-4 w-4" />
                {assistant.name}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Call Assistant Dialog */}
      {selectedAssistant && selectedContact && (
        <CallAssistantDialog
          assistant={selectedAssistant}
          isOpen={isCallDialogOpen}
          onClose={() => {
            setIsCallDialogOpen(false);
            setSelectedAssistant(null);
            setCallStatus('idle');
            setRemainingTime(5);
            setIsCallInitiating(false);
          }}
          onCall={async (phoneNumber) => {
            setIsCallInitiating(true);
            setCallStatus('initiating');
            
            const timer = setInterval(() => {
              setRemainingTime((prev) => prev > 1 ? prev - 1 : 1);
            }, 1000);

            try {
              const response = await initiateExotelCall({
                phone_number: phoneNumber,
                callback_url: 'http://my.exotel.com/calllive1/exoml/start_voice/918357',
              });

              clearInterval(timer);
              setCallStatus('connecting');
          
              setCallStatus('connected');
              setIsCallInitiating(false);
              
            } catch (error) {
              clearInterval(timer);
              setCallStatus('failed');
              setIsCallInitiating(false);
              console.error('Failed to initiate call:', error);
            }
          }}
          isCallInitiating={isCallInitiating}
          callStatus={callStatus}
          remainingTime={remainingTime}
          phoneNumber={selectedContact.phone}
          contactName={selectedContact.name}
        />
      )}
    </div>
  );
};

export default ContactListView;
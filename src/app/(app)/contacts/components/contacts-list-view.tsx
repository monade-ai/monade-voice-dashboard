import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  User, 
  Upload, 
  Loader2, 
  FileSpreadsheet, 
  Users, 
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { motion } from 'framer-motion';

import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslations } from '@/i18n/translations-context';

import { useContactsContext, Bucket } from '../contexts/contacts-context';

import CreateBucketDialog from './create-bucket-dialog';
import ContactUploadDialog from './contact-upload-dialog';
import CreateContact from './create-contact';

const ContactListView: React.FC = () => {
  const { t } = useTranslations();
  const { 
    buckets, 
    contacts, 
    selectedBucket, 
    isLoading, 
    selectBucket,
    removeBucket,
    removeContact,
  } = useContactsContext();

  // RBAC permissions
  // TODO: Replace with new Supabase-based permission checks
  const canCreateBucket = true; // Placeholder
  const canDeleteBucket = true; // Placeholder
  const canAddContact = true; // Placeholder
  const canBulkUpload = true; // Placeholder

  const [isCreateBucketOpen, setCreateBucketOpen] = useState(false);
  const [isUploadOpen, setUploadOpen] = useState(false);
  const [isCreateContactOpen, setCreateContactOpen] = useState(false);
  const [uploadTargetBucket, setUploadTargetBucket] = useState<Bucket | null>(null);
  const [bucketToDelete, setBucketToDelete] = useState<Bucket | null>(null);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());

  const [searchQuery, setSearchQuery] = useState('');

  const currentContacts = selectedBucket ? contacts[selectedBucket.id] || [] : [];
  const filteredContacts = currentContacts.filter(contact => 
    Object.values(contact.data).some(value => 
      String(value).toLowerCase().includes(searchQuery.toLowerCase()),
    ) || contact.phone_number.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const handleUploadClick = (bucket?: Bucket) => {
    setUploadTargetBucket(bucket || null);
    setUploadOpen(true);
  };

  const EmptyListsState = () => (
    <div className="flex flex-col items-center justify-center h-[400px] text-center">
      <div className="bg-primary/10 p-6 rounded-full mb-4">
        <Users className="w-12 h-12 text-primary" />
      </div>
      <h2 className="text-2xl font-bold">{t('contacts.empty_buckets_title')}</h2>
      <p className="text-muted-foreground mt-2 mb-6 max-w-md">
        {t('contacts.empty_buckets_desc')}
      </p>
      <div className="flex gap-4">
        {canCreateBucket && (
          <Button size="lg" onClick={() => setCreateBucketOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('contacts.create_bucket')}
          </Button>
        )}
        {canBulkUpload && (
          <Button size="lg" variant="secondary" onClick={() => handleUploadClick()}>
            <Upload className="mr-2 h-4 w-4" />
            {t('contacts.upload_csv')}
          </Button>
        )}
      </div>
    </div>
  );

  const EmptyContactsState = () => (
    <div className="flex flex-col items-center justify-center h-[400px] text-center">
      <div className="bg-primary/10 p-6 rounded-full mb-4">
        <User className="w-12 h-12 text-primary" />
      </div>
      <h2 className="text-2xl font-bold">{t('contacts.empty_bucket_title')}</h2>
      <p className="text-muted-foreground mt-2 mb-6 max-w-md">
        {t('contacts.empty_bucket_desc')}
      </p>
      <p className="text-sm text-muted-foreground">
        Use the buttons above to add contacts to this bucket.
      </p>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Contact Buckets</h1>
          <p className="text-muted-foreground">
            {buckets.length} {buckets.length === 1 ? 'bucket' : 'buckets'} available
          </p>
        </div>
        {buckets.length > 0 && (
          <div className="flex gap-2">
            {canBulkUpload && (
              <Button variant="outline" onClick={() => handleUploadClick()}>
                <Upload className="mr-2 h-4 w-4" />
                {t('contacts.upload_csv')}
              </Button>
            )}
            {canCreateBucket && (
              <Button onClick={() => setCreateBucketOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('contacts.new_bucket')}
              </Button>
            )}
          </div>
        )}
      </div>

      {isLoading && buckets.length === 0 ? (
        <div className="flex justify-center items-center h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !selectedBucket ? (
        buckets.length === 0 ? <EmptyListsState /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {buckets.map((bucket) => (
              <motion.div key={bucket.id} layout>
                <Card className="cursor-pointer hover:shadow-md transition-shadow h-full" onClick={() => {
                  if (!bucket.id) {
                    console.error('Bucket id is missing for selectBucket:', bucket);
                    alert('Cannot open this bucket: missing bucket id.');

                    return;
                  }
                  selectBucket(bucket.id);
                }}>
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex justify-between items-start">
                      <FileSpreadsheet className="h-8 w-8 text-primary mt-1" />
                      {canDeleteBucket && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              if (!bucket.id) {
                                console.error('Bucket id is missing for removeBucket:', bucket);
                                alert('Cannot delete this bucket: missing bucket id.');

                                return;
                              }
                              setBucketToDelete(bucket);
                              setDeleteConfirmationName('');
                            }}>
                              <Trash2 className="h-4 w-4 mr-2 text-destructive" /> {t('contacts.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg mt-3">{bucket.name}</h3>
                    <p className="text-muted-foreground text-sm mt-1 flex-grow">{bucket.description}</p>
                    <div className="mt-auto pt-4 flex items-center justify-between text-sm text-muted-foreground">
                      <span><Users className="h-4 w-4 mr-1 inline" />{bucket.count} contacts</span>
                      <span>{formatDate(bucket.createdAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )
      ) : (
        <div>
          <div className="flex justify-between items-center mb-6">
            <Button variant="ghost" onClick={() => selectBucket(null)}>← Back to Buckets</Button>
            <h2 className="text-xl font-semibold">{selectedBucket.name}</h2>
            <div className="flex items-center gap-2">
              {canBulkUpload && (
                <Button variant="outline" onClick={() => handleUploadClick(selectedBucket)}>
                  <Upload className="mr-2 h-4 w-4" /> {t('contacts.upload')}
                </Button>
              )}
              {canAddContact && (
                <Button onClick={() => setCreateContactOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> {t('contacts.add_contact.title')}
                </Button>
              )}
            </div>
          </div>
          
          <div className="relative w-full sm:max-w-sm mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search contacts..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>

          {isLoading && currentContacts.length === 0 ? (
            <div className="flex justify-center items-center h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filteredContacts.length === 0 ? (
            searchQuery ? <p>No results for &quot;{searchQuery}&quot;.</p> : <EmptyContactsState />
          ) : (
            <div className="space-y-4">
              {/* Bulk Actions Bar */}
              {selectedContacts.size > 0 && (
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-md">
                  <span className="text-sm font-medium">
                    {selectedContacts.size} contact{selectedContacts.size > 1 ? 's' : ''} selected
                  </span>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={async () => {
                      if (confirm(`Are you sure you want to delete ${selectedContacts.size} contact${selectedContacts.size > 1 ? 's' : ''}?`)) {
                        try {
                          for (const phoneNumber of selectedContacts) {
                            await removeContact(selectedBucket.id, phoneNumber);
                          }
                          setSelectedContacts(new Set());
                        } catch (error) {
                          console.error('Failed to delete contacts:', error);
                          alert('Failed to delete some contacts. Please try again.');
                        }
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </Button>
                </div>
              )}

              <div className="border rounded-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium w-12">
                        <input
                          type="checkbox"
                          checked={filteredContacts.length > 0 && filteredContacts.every(contact => selectedContacts.has(contact.phone_number))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedContacts(new Set(filteredContacts.map(contact => contact.phone_number)));
                            } else {
                              setSelectedContacts(new Set());
                            }
                          }}
                          className="rounded"
                        />
                      </th>
                      <th className="text-left p-4 font-medium">Phone Number</th>
                      {selectedBucket.fields.map(field => <th key={field} className="text-left p-4 font-medium capitalize">{field}</th>)}
                      <th className="text-right p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.map((contact) => (
                      <tr key={contact.phone_number} className="border-t hover:bg-muted">
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedContacts.has(contact.phone_number)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedContacts);
                              if (e.target.checked) {
                                newSelected.add(contact.phone_number);
                              } else {
                                newSelected.delete(contact.phone_number);
                              }
                              setSelectedContacts(newSelected);
                            }}
                            className="rounded"
                          />
                        </td>
                        <td className="p-4">{contact.phone_number}</td>
                        {selectedBucket.fields.map(field => <td key={field} className="p-4">{contact.data[field] || '-'}</td>)}
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { if (confirm(t('contacts.delete_contact_confirm'))) removeContact(selectedBucket.id, contact.phone_number); }}>
                                <Trash2 className="h-4 w-4 mr-2 text-destructive" /> {t('contacts.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={isCreateBucketOpen} onOpenChange={setCreateBucketOpen}>
        <DialogContent className="w-3/5">
          <DialogHeader><DialogTitle>Create New Bucket</DialogTitle></DialogHeader>
          <CreateBucketDialog onClose={() => setCreateBucketOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isUploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="w-3/5 transition-all duration-300">
          <ContactUploadDialog 
            isOpen={isUploadOpen} 
            onClose={() => setUploadOpen(false)} 
            bucket={uploadTargetBucket} 
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateContactOpen} onOpenChange={setCreateContactOpen}>
        <DialogContent className="w-3/5">
          <DialogHeader><DialogTitle>Add New Contact</DialogTitle></DialogHeader>
          <CreateContact onCancel={() => setCreateContactOpen(false)} onSuccess={() => setCreateContactOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Bucket Deletion Confirmation Dialog */}
      <Dialog open={!!bucketToDelete} onOpenChange={(open) => !open && setBucketToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Bucket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. This will permanently delete the bucket &quot;{bucketToDelete?.name}&quot; and all {bucketToDelete?.count || 0} contacts in it.
            </p>
            <p className="text-sm font-medium">
              Please type <span className="font-mono bg-muted px-1 rounded">{bucketToDelete?.name}</span> to confirm:
            </p>
            <Input
              placeholder="Type bucket name here..."
              value={deleteConfirmationName}
              onChange={(e) => setDeleteConfirmationName(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setBucketToDelete(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              disabled={deleteConfirmationName !== bucketToDelete?.name}
              onClick={async () => {
                if (bucketToDelete && deleteConfirmationName === bucketToDelete.name) {
                  try {
                    await removeBucket(bucketToDelete.id);
                    setBucketToDelete(null);
                    setDeleteConfirmationName('');
                  } catch (error) {
                    console.error('Failed to delete bucket:', error);
                    alert('Failed to delete bucket. Please try again.');
                  }
                }
              }}
            >
              Delete Bucket
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactListView;

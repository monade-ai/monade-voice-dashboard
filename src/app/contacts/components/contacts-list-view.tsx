import React, { useState, useEffect } from 'react';
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
  Edit,
  Phone,
} from 'lucide-react';
import { motion } from 'framer-motion';

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
import { useTranslations } from '@/i18n/translations-context';

import { useContactsContext, Bucket, Contact } from '../contexts/contacts-context';
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
  
  const [isCreateBucketOpen, setCreateBucketOpen] = useState(false);
  const [isUploadOpen, setUploadOpen] = useState(false);
  const [isCreateContactOpen, setCreateContactOpen] = useState(false);
  const [uploadTargetBucket, setUploadTargetBucket] = useState<Bucket | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  const currentContacts = selectedBucket ? contacts[selectedBucket.id] || [] : [];
  const filteredContacts = currentContacts.filter(contact => 
    Object.values(contact.data).some(value => 
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    ) || contact.phone_number.toLowerCase().includes(searchQuery.toLowerCase())
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
      <h2 className="text-2xl font-bold">Create Your First Contact Bucket</h2>
      <p className="text-muted-foreground mt-2 mb-6 max-w-md">
        Buckets help you organize your contacts. Create one manually or upload a CSV to start.
      </p>
      <div className="flex gap-4">
        <Button size="lg" onClick={() => setCreateBucketOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Bucket
        </Button>
        <Button size="lg" variant="secondary" onClick={() => handleUploadClick()}>
          <Upload className="mr-2 h-4 w-4" />
          Upload CSV
        </Button>
      </div>
    </div>
  );

  const EmptyContactsState = () => (
    <div className="flex flex-col items-center justify-center h-[400px] text-center">
      <div className="bg-primary/10 p-6 rounded-full mb-4">
        <User className="w-12 h-12 text-primary" />
      </div>
      <h2 className="text-2xl font-bold">This bucket is empty</h2>
      <p className="text-muted-foreground mt-2 mb-6 max-w-md">
        Add your first contact or upload a list.
      </p>
      <div className="flex gap-4">
        <Button onClick={() => setCreateContactOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
        <Button variant="secondary" onClick={() => handleUploadClick(selectedBucket || undefined)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload to this Bucket
        </Button>
      </div>
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
            <Button variant="outline" onClick={() => handleUploadClick()}>
              <Upload className="mr-2 h-4 w-4" />
              Upload CSV
            </Button>
            <Button onClick={() => setCreateBucketOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Bucket
            </Button>
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
  if (confirm(`Delete "${bucket.name}"?`)) removeBucket(bucket.id);
}}>
  <Trash2 className="h-4 w-4 mr-2 text-destructive" /> Delete
</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
              <Button variant="outline" onClick={() => handleUploadClick(selectedBucket)}>
                <Upload className="mr-2 h-4 w-4" /> Upload
              </Button>
              <Button onClick={() => setCreateContactOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Contact
              </Button>
            </div>
          </div>
          
          <div className="relative w-full sm:max-w-sm mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search contacts..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>

          {isLoading && currentContacts.length === 0 ? (
            <div className="flex justify-center items-center h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filteredContacts.length === 0 ? (
            searchQuery ? <p>No results for "{searchQuery}".</p> : <EmptyContactsState />
          ) : (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Phone Number</th>
                    {selectedBucket.fields.map(field => <th key={field} className="text-left p-4 font-medium capitalize">{field}</th>)}
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((contact) => (
                    <tr key={contact.phone_number} className="border-t hover:bg-muted">
                      <td className="p-4">{contact.phone_number}</td>
                      {selectedBucket.fields.map(field => <td key={field} className="p-4">{contact.data[field] || '-'}</td>)}
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { if (confirm('Delete this contact?')) removeContact(selectedBucket.id, contact.phone_number); }}>
                              <Trash2 className="h-4 w-4 mr-2 text-destructive" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
    </div>
  );
};

export default ContactListView;

'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Play, Pause, Square, Archive, Trash2, Eye, Users, Activity, Copy } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { apiService } from '@/lib/api';
import type { Campaign, CreateCampaignRequest } from '@/types/campaign';

const CampaignManager = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const [viewingCampaign, setViewingCampaign] = useState<Campaign | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // Form state for creating new campaign
  const [formData, setFormData] = useState<CreateCampaignRequest>({
    caller_id: '',
    from: [],
    name: '',
    flow_type: 'greeting',
    read_via_text: '',
    campaign_type: 'static',
    mode: 'auto',
    call_duplicate_numbers: false,
  });

  const [phoneNumbers, setPhoneNumbers] = useState('');

  // Load campaigns on component mount
  useEffect(() => {
    loadCampaigns();
  }, [selectedStatus]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const params = selectedStatus !== 'all' ? { status: selectedStatus as any } : {};
      const response = await apiService.getCampaigns(params);
      
      if (response.response && Array.isArray(response.response)) {
        const campaignData = response.response
          .map((r: any) => r.data)
          .filter((d: any) => d !== undefined);
        setCampaigns(campaignData);
      } else {
        setCampaigns([]);
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast.error('Failed to load campaigns');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    try {
      if (!formData.caller_id) {
        toast.error('Caller ID is required');
        return;
      }

      if (!phoneNumbers && !formData.lists?.length) {
        toast.error('Either phone numbers or contact lists must be provided');
        return;
      }

      // Validate Exotel business rules
      if (formData.url && formData.read_via_text) {
        toast.error('Cannot provide both URL and text content. Please choose either a custom URL flow or text content, not both.');
        return;
      }
      
      // Validate message content length if provided
      if (formData.read_via_text && formData.read_via_text.trim() && formData.read_via_text.trim().length < 10) {
        toast.error('Message content must be at least 10 characters long.');
        return;
      }
      
      // Validate that we have either URL or text content
      if (!formData.url?.trim() && !formData.read_via_text?.trim()) {
        toast.error('Either URL or message content is required.');
        return;
      }

      const phoneNumbersList = phoneNumbers
        .split('\n')
        .map(num => num.trim())
        .filter(num => num.length > 0)
        .flatMap(line => {
          // Handle multiple numbers on the same line separated by spaces
          return line.split(/\s+/).filter(num => num.length > 0);
        });

      // Validate phone numbers
      const invalidNumbers = phoneNumbersList.filter(num => {
        // Basic validation: should be a valid phone number
        return !num.match(/^\+?[1-9]\d{1,14}$/);
      });
      
      if (invalidNumbers.length > 0) {
        toast.error(`Invalid phone numbers found: ${invalidNumbers.join(', ')}. Please use valid international format (e.g., +919876543210)`);
        return;
      }

      console.log('[Campaign UI] Processed phone numbers:', phoneNumbersList);

      const campaignData: CreateCampaignRequest = {
        ...formData,
        from: phoneNumbersList.length > 0 ? phoneNumbersList : undefined,
      };

      await apiService.createCampaign(campaignData);
      toast.success('Campaign created successfully');
      setCreateDialogOpen(false);
      resetForm();
      loadCampaigns();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create campaign');
    }
  };

  const handleCampaignAction = async (campaignId: string, action: 'pause' | 'resume' | 'complete' | 'archive') => {
    try {
      await apiService.updateCampaign(campaignId, action);
      toast.success(`Campaign ${action}d successfully`);
      loadCampaigns();
    } catch (error) {
      console.error(`Error ${action}ing campaign:`, error);
      toast.error(`Failed to ${action} campaign`);
    }
  };

  const handleCloneCampaign = async (campaign: Campaign) => {
    try {
      // Pre-fill form with existing campaign data
      const clonedData = {
        caller_id: campaign.caller_id,
        from: campaign.from || [],
        lists: campaign.lists,
        name: `${campaign.name} (Copy)`,
        flow_type: campaign.flow_type,
        read_via_text: campaign.read_via_text || '',
        campaign_type: campaign.campaign_type,
        mode: campaign.mode,
        call_duplicate_numbers: campaign.call_duplicate_numbers,
        url: campaign.url,
        retries: campaign.retries,
        schedule: campaign.schedule,
        call_status_callback: campaign.call_status_callback,
        call_schedule_callback: campaign.call_schedule_callback,
        status_callback: campaign.status_callback,
        throttle: campaign.throttle,
        custom_field: campaign.custom_field,
      };
      
      // Handle Exotel constraint: cannot have both URL and text content
      if (clonedData.url && clonedData.read_via_text) {
        // Prioritize URL over text content, clear text
        clonedData.read_via_text = '';
        toast.info('Campaign data loaded. Note: URL flow takes precedence over text content.');
      }
      
      setFormData(clonedData);
      
      // Pre-fill phone numbers
      if (campaign.from) {
        setPhoneNumbers(campaign.from.join('\n'));
      }
      
      setCreateDialogOpen(true);
    } catch (error) {
      console.error('Error cloning campaign:', error);
      toast.error('Failed to clone campaign');
    }
  };

  const handleDeleteCampaign = async (campaign: Campaign) => {
    // Exotel business rule: Only campaigns with status 'Created' can be deleted
    // Once a campaign has been started (even if later archived), it cannot be deleted
    const deletableStatuses = ['Created'];
    if (!deletableStatuses.includes(campaign.status)) {
      toast.error(`Cannot delete campaigns with status "${campaign.status}". Only campaigns that have never been started (status: "Created") can be deleted.`);
      return;
    }

    const confirmMessage = `Are you sure you want to delete the campaign "${campaign.name}"?\n\nThis action cannot be undone.`;
    if (!confirm(confirmMessage)) {
      return;
    }
    
    try {
      await apiService.deleteCampaign(campaign.id);
      toast.success('Campaign deleted successfully');
      loadCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete campaign';
      toast.error(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      caller_id: '',
      from: [],
      name: '',
      flow_type: 'greeting',
      read_via_text: '',
      campaign_type: 'static',
      mode: 'auto',
      call_duplicate_numbers: false,
    });
    setPhoneNumbers('');
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Created':
        return 'secondary';
      case 'InProgress':
        return 'default';
      case 'Completed':
        return 'default';
      case 'Failed':
        return 'destructive';
      case 'Paused':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getActionButtons = (campaign: Campaign) => {
    const buttons = [];
    
    if (campaign.status === 'Created' || campaign.status === 'Paused') {
      buttons.push(
        <Button
          key="resume"
          size="sm"
          variant="outline"
          onClick={() => handleCampaignAction(campaign.id, 'resume')}
          className="mr-1"
        >
          <Play className="w-3 h-3 mr-1" />
          Start
        </Button>
      );
    }
    
    if (campaign.status === 'InProgress') {
      buttons.push(
        <Button
          key="pause"
          size="sm"
          variant="outline"
          onClick={() => handleCampaignAction(campaign.id, 'pause')}
          className="mr-1"
        >
          <Pause className="w-3 h-3 mr-1" />
          Pause
        </Button>
      );
      buttons.push(
        <Button
          key="complete"
          size="sm"
          variant="outline"
          onClick={() => handleCampaignAction(campaign.id, 'complete')}
          className="mr-1"
        >
          <Square className="w-3 h-3 mr-1" />
          Stop
        </Button>
      );
    }
    
    buttons.push(
      <Button
        key="clone"
        size="sm"
        variant="outline"
        onClick={() => handleCloneCampaign(campaign)}
        className="mr-1"
      >
        <Copy className="w-3 h-3 mr-1" />
        Clone & Edit
      </Button>
    );
    
    buttons.push(
      <Button
        key="archive"
        size="sm"
        variant="outline"
        onClick={() => handleCampaignAction(campaign.id, 'archive')}
        className="mr-1"
      >
        <Archive className="w-3 h-3 mr-1" />
        Archive
      </Button>
    );
    
    // Only show delete button for campaigns that can be deleted
    // Exotel rule: Only campaigns with status 'Created' (never started) can be deleted
    const deletableStatuses = ['Created'];
    if (deletableStatuses.includes(campaign.status)) {
      buttons.push(
        <Button
          key="delete"
          size="sm"
          variant="destructive"
          onClick={() => handleDeleteCampaign(campaign)}
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Delete
        </Button>
      );
    }
    
    return buttons;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Campaign Management</h1>
          <p className="text-gray-600">Manage your bulk calling campaigns</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              <SelectItem value="Created">Created</SelectItem>
              <SelectItem value="InProgress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Failed">Failed</SelectItem>
              <SelectItem value="Paused">Paused</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Campaign</DialogTitle>
                <DialogDescription>
                  Set up a new bulk calling campaign with phone numbers and messaging.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Campaign Name</Label>
                    <Input
                      id="name"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="My Campaign"
                    />
                  </div>
                  <div>
                    <Label htmlFor="caller_id">Caller ID *</Label>
                    <Input
                      id="caller_id"
                      value={formData.caller_id}
                      onChange={(e) => setFormData({ ...formData, caller_id: e.target.value })}
                      placeholder="+919876543210"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="phone_numbers">Phone Numbers (one per line) *</Label>
                  <Textarea
                    id="phone_numbers"
                    value={phoneNumbers}
                    onChange={(e) => setPhoneNumbers(e.target.value)}
                    placeholder="+919876543210
+918765432109
+917654321098

Or multiple numbers per line:
+919876543210 +918765432109"
                    rows={6}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="flow_type">Campaign Type</Label>
                    <Select
                      value={formData.flow_type}
                      onValueChange={(value: 'ivr' | 'greeting') => 
                        setFormData({ ...formData, flow_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="greeting">Simple Greeting</SelectItem>
                        <SelectItem value="ivr">Interactive IVR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="campaign_type">Execution Mode</Label>
                    <Select
                      value={formData.campaign_type}
                      onValueChange={(value: 'static' | 'dynamic') => 
                        setFormData({ ...formData, campaign_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="static">Static (up to 5 lists)</SelectItem>
                        <SelectItem value="dynamic">Dynamic (1 list only)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="message">Message Content</Label>
                  <Textarea
                    id="message"
                    value={formData.read_via_text || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, read_via_text: e.target.value });
                      // Clear URL if text content is provided
                      if (e.target.value && formData.url) {
                        setFormData(prev => ({ ...prev, url: undefined }));
                      }
                    }}
                    placeholder="Hello, this is a message from our company. Thank you for your time. (Minimum 10 characters required)"
                    rows={3}
                    minLength={10}
                  />
                </div>
                
                <div>
                  <Label htmlFor="url">Custom Flow URL (Alternative to Message)</Label>
                  <Input
                    id="url"
                    value={formData.url || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, url: e.target.value });
                      // Clear text content if URL is provided
                      if (e.target.value && formData.read_via_text) {
                        setFormData(prev => ({ ...prev, read_via_text: '' }));
                      }
                    }}
                    placeholder="http://my.exotel.com/account/exoml/start_voice/flow_id"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use either message content OR custom URL, not both
                  </p>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCampaign}>
                  Create Campaign
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <Card className="p-8 text-center">
          <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">No Campaigns Found</h3>
          <p className="text-gray-600 mb-4">
            {selectedStatus === 'all' 
              ? 'Create your first campaign to start bulk calling'
              : `No campaigns found with status: ${selectedStatus}`}
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create First Campaign
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{campaign.name || `Campaign ${campaign.id.slice(-6)}`}</h3>
                  <p className="text-sm text-gray-600">ID: {campaign.id}</p>
                </div>
                <Badge variant={getStatusBadgeVariant(campaign.status)}>
                  {campaign.status}
                </Badge>
              </div>
              
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Caller ID:</span>
                  <span>{campaign.caller_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="capitalize">{campaign.flow_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Numbers:</span>
                  <span>{campaign.from?.length || campaign.lists?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span>{new Date(campaign.date_created).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {getActionButtons(campaign)}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CampaignManager;
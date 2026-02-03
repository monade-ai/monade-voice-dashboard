// Campaign service functions for frontend integration

import type { 
  CreateCampaignRequest,
  UpdateCampaignRequest,
  CampaignListRequest,
  CampaignCallDetailsRequest,
  CampaignResponse,
} from '@/types/campaign';

/**
 * Campaign API service for frontend integration
 */
export class CampaignService {
  private baseUrl = '/api/campaigns';

  /**
   * Create a new campaign
   */
  async createCampaign(data: CreateCampaignRequest): Promise<CampaignResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create campaign');
    }

    return response.json();
  }

  /**
   * Get list of campaigns
   */
  async getCampaigns(params?: CampaignListRequest): Promise<CampaignResponse> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const url = queryParams.toString() 
      ? `${this.baseUrl}?${queryParams.toString()}`
      : this.baseUrl;

    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch campaigns');
    }

    return response.json();
  }

  /**
   * Get campaign details by ID
   */
  async getCampaign(id: string): Promise<CampaignResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch campaign');
    }

    return response.json();
  }

  /**
   * Update campaign (pause, resume, complete, archive)
   */
  async updateCampaign(id: string, action: 'pause' | 'resume' | 'complete' | 'archive'): Promise<CampaignResponse> {
    const data: UpdateCampaignRequest = {
      campaigns: [{ action }],
    };

    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update campaign');
    }

    return response.json();
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(id: string): Promise<CampaignResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete campaign');
    }

    return response.json();
  }

  /**
   * Get call details for a campaign
   */
  async getCampaignCallDetails(id: string, params?: CampaignCallDetailsRequest): Promise<any> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const url = queryParams.toString() 
      ? `${this.baseUrl}/${id}/call-details?${queryParams.toString()}`
      : `${this.baseUrl}/${id}/call-details`;

    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch campaign call details');
    }

    return response.json();
  }

  /**
   * Pause campaign
   */
  async pauseCampaign(id: string): Promise<CampaignResponse> {
    return this.updateCampaign(id, 'pause');
  }

  /**
   * Resume campaign
   */
  async resumeCampaign(id: string): Promise<CampaignResponse> {
    return this.updateCampaign(id, 'resume');
  }

  /**
   * Complete campaign
   */
  async completeCampaign(id: string): Promise<CampaignResponse> {
    return this.updateCampaign(id, 'complete');
  }

  /**
   * Archive campaign
   */
  async archiveCampaign(id: string): Promise<CampaignResponse> {
    return this.updateCampaign(id, 'archive');
  }
}

// Export singleton instance
export const campaignService = new CampaignService();

// Export individual functions for convenience
export const {
  createCampaign,
  getCampaigns,
  getCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignCallDetails,
  pauseCampaign,
  resumeCampaign,
  completeCampaign,
  archiveCampaign,
} = campaignService;

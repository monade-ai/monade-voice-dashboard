// Campaign service functions for frontend integration

import { fetchJson } from '@/lib/http';
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
    return fetchJson<CampaignResponse>(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
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

    return fetchJson<CampaignResponse>(url);
  }

  /**
   * Get campaign details by ID
   */
  async getCampaign(id: string): Promise<CampaignResponse> {
    return fetchJson<CampaignResponse>(`${this.baseUrl}/${id}`);
  }

  /**
   * Update campaign (pause, resume, complete, archive)
   */
  async updateCampaign(id: string, action: 'pause' | 'resume' | 'complete' | 'archive'): Promise<CampaignResponse> {
    const data: UpdateCampaignRequest = {
      campaigns: [{ action }],
    };

    return fetchJson<CampaignResponse>(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(id: string): Promise<CampaignResponse> {
    return fetchJson<CampaignResponse>(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
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

    return fetchJson<any>(url);
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

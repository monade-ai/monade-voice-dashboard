import { NextResponse } from 'next/server';
import type { CampaignCallDetailsRequest } from '@/types/campaign';
import { EXOTEL_ACCOUNT_CONFIG } from '@/types/campaign';

// Helper function to create Exotel API URL
function getExotelApiUrl(path: string): string {
  return `https://${EXOTEL_ACCOUNT_CONFIG.BASE_URL}/v2/accounts/${EXOTEL_ACCOUNT_CONFIG.ACCOUNT_SID}${path}`;
}

// Helper function to get Basic Auth header
function getAuthHeader(): string {
  const credentials = `${EXOTEL_ACCOUNT_CONFIG.API_USERNAME}:${EXOTEL_ACCOUNT_CONFIG.API_PASSWORD}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

// Helper function to make Exotel API requests
async function makeExotelRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(),
      ...options.headers,
    },
  });

  const responseData = await response.json();
  
  if (!response.ok) {
    console.error('[Campaign Call Details API] Exotel API error:', responseData);
    throw new Error(responseData.message || 'Exotel API request failed');
  }

  return responseData;
}

// GET - Get call details for campaign
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const { searchParams } = new URL(request.url);
    
    const queryParams: CampaignCallDetailsRequest = {
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      status: searchParams.get('status') || undefined,
      sort_by: searchParams.get('sort_by') || undefined,
    };

    // Build query string for Exotel API
    const params_url = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params_url.append(key, value.toString());
      }
    });

    const apiUrl = getExotelApiUrl(`/campaigns/${campaignId}/call-details?${params_url.toString()}`);
    console.log('[Campaign Call Details API] Fetching call details from:', apiUrl);

    const data = await makeExotelRequest(apiUrl);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Campaign Call Details API] Error fetching call details:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch campaign call details' },
      { status: 500 }
    );
  }
}
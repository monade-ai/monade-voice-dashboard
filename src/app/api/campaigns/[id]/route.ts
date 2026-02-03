import { NextResponse } from 'next/server';

import type { UpdateCampaignRequest } from '@/types/campaign';
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
    console.error('[Campaign API] Exotel API error:', responseData);
    
    // Extract detailed error information
    let errorMessage = 'Exotel API request failed';
    if (responseData.response && responseData.response[0] && responseData.response[0].error_data) {
      const errorData = responseData.response[0].error_data;
      console.error('[Campaign API] Detailed error data:', errorData);
      
      // Provide user-friendly error messages for common business rules
      if (errorData.code === 1003) {
        errorMessage = 'Cannot delete campaign that has been started. Only campaigns with status "Created" (never started) can be deleted.';
      } else {
        errorMessage = errorData.message || errorData.description || errorMessage;
      }
    }
    
    throw new Error(errorMessage);
  }

  return responseData;
}

// GET - Get campaign details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: campaignId } = await params;
    const apiUrl = getExotelApiUrl(`/campaigns/${campaignId}`);
    
    console.log('[Campaign API] Fetching campaign details from:', apiUrl);

    const data = await makeExotelRequest(apiUrl);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Campaign API] Error fetching campaign details:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch campaign details' },
      { status: 500 },
    );
  }
}

// PUT - Update/Pause/Resume/Complete/Archive campaign
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: campaignId } = await params;
    const body: UpdateCampaignRequest = await request.json();
    
    console.log('[Campaign API] Updating campaign with data:', body);

    // Validate request body
    if (!body.campaigns || !Array.isArray(body.campaigns) || body.campaigns.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected campaigns array with action.' },
        { status: 400 },
      );
    }

    const validActions = ['pause', 'resume', 'complete', 'archive'];
    const action = body.campaigns[0].action;
    
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 },
      );
    }

    const apiUrl = getExotelApiUrl(`/campaigns/${campaignId}`);
    console.log('[Campaign API] Updating campaign at:', apiUrl);

    const data = await makeExotelRequest(apiUrl, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    console.log('[Campaign API] Campaign updated successfully:', data);

    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[Campaign API] Error updating campaign:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update campaign' },
      { status: 500 },
    );
  }
}

// DELETE - Delete campaign
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: campaignId } = await params;
    const apiUrl = getExotelApiUrl(`/campaigns/${campaignId}`);
    
    console.log('[Campaign API] Deleting campaign at:', apiUrl);

    const data = await makeExotelRequest(apiUrl, {
      method: 'DELETE',
    });

    console.log('[Campaign API] Campaign deleted successfully:', data);

    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[Campaign API] Error deleting campaign:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete campaign' },
      { status: 500 },
    );
  }
}
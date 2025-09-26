import { NextResponse } from 'next/server';
import type { 
  CreateCampaignRequest, 
  CampaignResponse, 
  CampaignListRequest,
  ExotelCampaignCreateRequest
} from '@/types/campaign';
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
    console.error('[Campaigns API] Exotel API error:', responseData);
    
    // Extract detailed error information
    let errorMessage = 'Exotel API request failed';
    if (responseData.response && responseData.response[0] && responseData.response[0].error_data) {
      const errorData = responseData.response[0].error_data;
      console.error('[Campaigns API] Detailed error data:', errorData);
      errorMessage = errorData.message || errorData.description || errorMessage;
    }
    
    throw new Error(errorMessage);
  }

  return responseData;
}

// GET - List campaigns
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const queryParams: CampaignListRequest = {
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      status: searchParams.get('status') as any,
      sort_by: searchParams.get('sort_by') || undefined,
      name: searchParams.get('name') || undefined,
      type: searchParams.get('type') || undefined,
    };

    // Build query string for Exotel API
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const apiUrl = getExotelApiUrl(`/campaigns?${params.toString()}`);
    console.log('[Campaigns API] Fetching campaigns from:', apiUrl);

    const data = await makeExotelRequest(apiUrl);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Campaigns API] Error fetching campaigns:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

// POST - Create campaign
export async function POST(request: Request) {
  try {
    const body: CreateCampaignRequest = await request.json();
    
    console.log('[Campaigns API] Creating campaign with data:', body);

    // Validate required fields
    if (!body.caller_id) {
      return NextResponse.json(
        { error: 'Missing required field: caller_id' },
        { status: 400 }
      );
    }

    if (!body.from && !body.lists) {
      return NextResponse.json(
        { error: 'Either "from" (phone numbers) or "lists" (list IDs) must be provided' },
        { status: 400 }
      );
    }

    // Validate Exotel-specific business rules
    if (body.url && body.read_via_text) {
      return NextResponse.json(
        { error: 'Cannot provide both URL and text content. Please choose either a custom URL flow or text content, not both.' },
        { status: 400 }
      );
    }

    // Validate phone numbers format if provided
    if (body.from && Array.isArray(body.from)) {
      const invalidNumbers = body.from.filter(num => {
        // Basic validation: should start with + and contain only digits
        return !num.match(/^\+?[1-9]\d{1,14}$/);
      });
      
      if (invalidNumbers.length > 0) {
        console.warn('[Campaigns API] Invalid phone numbers found:', invalidNumbers);
        // Don't fail the request, but log the warning
      }
    }

    // Set defaults and clean up the data
    const campaignData: CreateCampaignRequest = {
      type: 'trans',
      campaign_type: body.campaign_type || 'static',
      mode: body.mode || 'auto',
      call_duplicate_numbers: body.call_duplicate_numbers || false,
      repeat_menu_attempts: body.repeat_menu_attempts || 0,
      caller_id: body.caller_id,
      from: body.from,
      lists: body.lists,
      flow_type: body.flow_type,
      name: body.name,
    };

    // Only add optional fields if they have meaningful values
    if (body.read_via_text && body.read_via_text.trim() && body.read_via_text.trim().length >= 10) {
      campaignData.read_via_text = body.read_via_text;
    }
    
    if (body.url && body.url.trim()) {
      campaignData.url = body.url;
    }
    
    // Validate that we have either URL or sufficient text content
    if (!campaignData.url && !campaignData.read_via_text) {
      return NextResponse.json(
        { error: 'Either URL or message content (minimum 10 characters) is required' },
        { status: 400 }
      );
    }
    
    if (body.retries && body.retries.number_of_retries > 0) {
      campaignData.retries = body.retries;
    }
    
    if (body.schedule) {
      campaignData.schedule = body.schedule;
    }
    
    if (body.call_status_callback && body.call_status_callback.trim()) {
      campaignData.call_status_callback = body.call_status_callback;
    }
    
    if (body.call_schedule_callback && body.call_schedule_callback.trim()) {
      campaignData.call_schedule_callback = body.call_schedule_callback;
    }
    
    if (body.status_callback && body.status_callback.trim()) {
      campaignData.status_callback = body.status_callback;
    }
    
    if (body.throttle && body.throttle > 0) {
      campaignData.throttle = body.throttle;
    }
    
    if (body.custom_field) {
      campaignData.custom_field = body.custom_field;
    }

    // Wrap the campaign data as Exotel expects it
    const requestPayload: ExotelCampaignCreateRequest = {
      campaigns: [campaignData]
    };
    
    console.log('[Campaigns API] ✅ FIXED: Wrapping campaign data in campaigns array');
    console.log('[Campaigns API] Final campaign data being sent to Exotel:', requestPayload);
    console.log('[Campaigns API] Wrapped structure check - should have campaigns array:', JSON.stringify(requestPayload, null, 2));

    const apiUrl = getExotelApiUrl('/campaigns');
    console.log('[Campaigns API] Creating campaign at:', apiUrl);

    const data = await makeExotelRequest(apiUrl, {
      method: 'POST',
      body: JSON.stringify(requestPayload),
    });

    console.log('[Campaigns API] Campaign created successfully:', data);
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('[Campaigns API] Error creating campaign:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
// lib/services/livekit-service.ts
import { AgentDispatchClient } from 'livekit-server-sdk';

interface CalleeInfo {
  [key: string]: string;
}

interface CreateLiveKitDispatchParams {
  roomName: string;
  agentName: string;
  calleeInfo: CalleeInfo;
  assistantId: string;
}

export async function createLiveKitDispatch(params: CreateLiveKitDispatchParams): Promise<any> {
  console.log('[LiveKitService] createLiveKitDispatch called with params:', params);
  
  try {
    // Validate required fields
    if (!params.roomName) {
      throw new Error('Room name is required');
    }
    
    if (!params.agentName) {
      throw new Error('Agent name is required');
    }
    
    // Get LiveKit configuration from environment variables
    const liveKitUrl = process.env.LIVEKIT_URL;
    const liveKitApiKey = process.env.LIVEKIT_API_KEY;
    const liveKitApiSecret = process.env.LIVEKIT_API_SECRET;
    
    console.log('[LiveKitService] Environment variables:', { liveKitUrl, liveKitApiKey, liveKitApiSecret });
    
    if (!liveKitUrl || !liveKitApiKey || !liveKitApiSecret) {
      throw new Error('LiveKit configuration is missing. Please check your environment variables.');
    }
    
    // Get assistants API base URL
    const apiBaseUrl = process.env.NEXT_PUBLIC_ASSISTANTS_BASEURL || 'http://localhost:7071/api';
    
    // Fetch all assistants
    console.log('[LiveKitService] Fetching assistants from:', `${apiBaseUrl}/assistants`);
    const assistantsRes = await fetch(`${apiBaseUrl}/assistants`);
    
    if (!assistantsRes.ok) {
      throw new Error(`Failed to fetch assistants: ${assistantsRes.status}`);
    }
    
    const assistants = await assistantsRes.json();
    console.log('[LiveKitService] Fetched assistants:', assistants);
    
    // Find the current assistant
    const currentAssistant = assistants.find((a: any) => a.id === params.assistantId);
    
    if (!currentAssistant) {
      throw new Error(`Assistant with ID ${params.assistantId} not found`);
    }
    
    console.log('[LiveKitService] Current assistant:', currentAssistant);
    
    // If assistant has a knowledge base, fetch the prompt
    let promptContent = '';
    if (currentAssistant.knowledgeBase) {
      try {
        console.log('[LiveKitService] Fetching knowledge base from:', currentAssistant.knowledgeBase);
        const kbRes = await fetch(currentAssistant.knowledgeBase);
        
        if (kbRes.ok) {
          // Clone the response so we can try parsing it multiple ways
          const kbResClone = kbRes.clone();
          
          // Try to parse as JSON first
          try {
            const kbData = await kbRes.json();
            console.log('[LiveKitService] Knowledge base data (JSON):', kbData);
            
            // Extract prompt from knowledge base data
            // This assumes the knowledge base has a 'prompt' field (will be sent as 'full_prompt' in metadata)
            promptContent = kbData.prompt || kbData.content || '';
          } catch (jsonError) {
            // If JSON parsing fails, try to get as text from the cloned response
            console.log('[LiveKitService] Knowledge base is not JSON, fetching as text');
            const textContent = await kbResClone.text();
            promptContent = textContent;
            console.log('[LiveKitService] Knowledge base content (text):', promptContent.substring(0, 100) + '...');
          }
        } else {
          console.warn('[LiveKitService] Failed to fetch knowledge base:', kbRes.status);
        }
      } catch (kbError) {
        console.warn('[LiveKitService] Error fetching knowledge base:', kbError);
      }
    }
    
    // Create AgentDispatchClient
    const agentDispatchClient = new AgentDispatchClient(
      liveKitUrl,
      liveKitApiKey,
      liveKitApiSecret
    );
    
    // Prepare metadata with prompt
    const metadataObj = {
      ...params.calleeInfo,
      full_prompt: promptContent
    };
    
    // Convert metadata to JSON string
    const metadata = JSON.stringify(metadataObj);
    
    console.log('[LiveKitService] Creating dispatch with:', {
      roomName: params.roomName,
      agentName: params.agentName,
      metadata
    });
    
    // Log LiveKit configuration for debugging
    console.log('[LiveKitService] LiveKit configuration:', {
      url: liveKitUrl,
      apiKey: liveKitApiKey ? 'SET' : 'NOT SET',
      apiSecret: liveKitApiSecret ? 'SET' : 'NOT SET'
    });
    
    // Create a dispatch request for an agent to join a room
    const dispatch = await agentDispatchClient.createDispatch(
      params.roomName,
      params.agentName,
      {
        metadata
      }
    );
    
    console.log('[LiveKitService] Created dispatch:', dispatch);
    
    // List dispatches to verify
    const dispatches = await agentDispatchClient.listDispatch(params.roomName);
    console.log(`[LiveKitService] There are ${dispatches.length} dispatches in ${params.roomName}`);
    
    return {
      success: true,
      dispatch,
      dispatchesCount: dispatches.length
    };
  } catch (error) {
    console.error('[LiveKitService] Error creating LiveKit dispatch:', error);
    
    let errorMessage = 'Failed to create LiveKit dispatch';
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Provide more specific error messages based on error type
      if (errorMessage.includes('fetch failed')) {
        errorMessage = 'Unable to connect to LiveKit service. Please check your network connection and LiveKit configuration.';
      } else if (errorMessage.includes('ETIMEDOUT')) {
        errorMessage = 'Connection to LiveKit service timed out. Please check your network connection and LiveKit configuration.';
      } else if (errorMessage.includes('ENOTFOUND')) {
        errorMessage = 'LiveKit service URL not found. Please check your LiveKit configuration.';
      }
    }
    
    throw new Error(errorMessage);
  }
}
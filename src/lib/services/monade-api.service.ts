/**
 * Monade API Service
 * Centralized API client for the Monade Voice Config Server
 */

import {
  MONADE_API_CONFIG,
  MonadeUser,
  MonadeAssistant,
  MonadeKnowledgeBase,
  MonadeApiKey,
  MonadeTranscript,
  CreditBalance,
  CreateUserRequest,
  UpdateUserRequest,
  CreateAssistantRequest,
  UpdateAssistantRequest,
  CreateKnowledgeBaseRequest,
  CreateTranscriptRequest,
  CreditOperationRequest,
  ValidateApiKeyResponse,
  HealthCheckResponse,
  ReadyCheckResponse,
} from '@/types/monade-api.types';

const { BASE_URL, DEFAULT_USER_UID } = MONADE_API_CONFIG;

/**
 * Base fetch function with error handling
 */
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error(`[MonadeAPI] Error fetching ${endpoint}:`, error);
    throw error;
  }
}

// ============================================
// Health & Monitoring
// ============================================

export async function checkHealth(): Promise<HealthCheckResponse> {
  return fetchApi<HealthCheckResponse>('/api/health');
}

export async function checkReady(): Promise<ReadyCheckResponse> {
  return fetchApi<ReadyCheckResponse>('/api/ready');
}

// ============================================
// User Management
// ============================================

export async function createUser(data: CreateUserRequest): Promise<MonadeUser> {
  return fetchApi<MonadeUser>('/api/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getUserById(userUid: string): Promise<MonadeUser> {
  return fetchApi<MonadeUser>(`/api/users/${userUid}`);
}

export async function updateUser(userUid: string, data: UpdateUserRequest): Promise<MonadeUser> {
  return fetchApi<MonadeUser>(`/api/users/${userUid}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteUser(userUid: string): Promise<void> {
  return fetchApi<void>(`/api/users/${userUid}`, {
    method: 'DELETE',
  });
}

export async function getUserAssistants(userUid: string): Promise<MonadeAssistant[]> {
  return fetchApi<MonadeAssistant[]>(`/api/users/${userUid}/assistants`);
}

// ============================================
// API Key Management
// ============================================

export async function generateApiKey(userUid: string): Promise<MonadeApiKey> {
  return fetchApi<MonadeApiKey>(`/api/users/${userUid}/api-keys`, {
    method: 'POST',
  });
}

export async function getUserApiKeys(userUid: string): Promise<MonadeApiKey[]> {
  return fetchApi<MonadeApiKey[]>(`/api/users/${userUid}/api-keys`);
}

export async function deleteApiKey(apiKeyId: number): Promise<void> {
  return fetchApi<void>(`/api/api-keys/${apiKeyId}`, {
    method: 'DELETE',
  });
}

export async function validateApiKey(apiKey: string): Promise<ValidateApiKeyResponse> {
  return fetchApi<ValidateApiKeyResponse>(`/api/api-keys/validate?api_key=${encodeURIComponent(apiKey)}`);
}

// ============================================
// Credit Management
// ============================================

export async function getUserCredits(userUid: string): Promise<CreditBalance> {
  return fetchApi<CreditBalance>(`/api/users/${userUid}/credits`);
}

export async function addCredits(userUid: string, amount: number): Promise<CreditBalance> {
  return fetchApi<CreditBalance>(`/api/users/${userUid}/credits/add`, {
    method: 'POST',
    body: JSON.stringify({ amount } as CreditOperationRequest),
  });
}

export async function removeCredits(userUid: string, amount: number): Promise<CreditBalance> {
  return fetchApi<CreditBalance>(`/api/users/${userUid}/credits/remove`, {
    method: 'POST',
    body: JSON.stringify({ amount } as CreditOperationRequest),
  });
}

export async function updateCredits(userUid: string, amount: number): Promise<CreditBalance> {
  return fetchApi<CreditBalance>(`/api/users/${userUid}/credits`, {
    method: 'POST',
    body: JSON.stringify({ amount } as CreditOperationRequest),
  });
}

// ============================================
// Assistant Management
// ============================================

export async function getAllAssistants(): Promise<MonadeAssistant[]> {
  return fetchApi<MonadeAssistant[]>('/api/assistants');
}

export async function getAssistantById(assistantId: string): Promise<MonadeAssistant> {
  return fetchApi<MonadeAssistant>(`/api/assistants/${assistantId}`);
}

export async function getAssistantByPhone(phoneNumber: string): Promise<MonadeAssistant> {
  return fetchApi<MonadeAssistant>(`/api/assistants/phone/${encodeURIComponent(phoneNumber)}`);
}

export async function getAssistantsByUser(userUid: string): Promise<MonadeAssistant[]> {
  return fetchApi<MonadeAssistant[]>(`/api/assistants/user/${userUid}`);
}

export async function createAssistant(data: CreateAssistantRequest): Promise<MonadeAssistant> {
  return fetchApi<MonadeAssistant>('/api/assistants', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAssistant(assistantId: string, data: UpdateAssistantRequest): Promise<MonadeAssistant> {
  return fetchApi<MonadeAssistant>(`/api/assistants/${assistantId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteAssistant(assistantId: string): Promise<void> {
  return fetchApi<void>(`/api/assistants/${assistantId}`, {
    method: 'DELETE',
  });
}

// ============================================
// Knowledge Base Management
// ============================================

export async function getAllKnowledgeBases(): Promise<MonadeKnowledgeBase[]> {
  return fetchApi<MonadeKnowledgeBase[]>('/api/knowledge-bases');
}

export async function getKnowledgeBaseById(kbId: string): Promise<MonadeKnowledgeBase> {
  return fetchApi<MonadeKnowledgeBase>(`/api/knowledge-bases/${kbId}`);
}

export async function getUserKnowledgeBases(userUid: string): Promise<MonadeKnowledgeBase[]> {
  return fetchApi<MonadeKnowledgeBase[]>(`/api/users/${userUid}/knowledge-bases`);
}

export async function createKnowledgeBase(data: CreateKnowledgeBaseRequest): Promise<MonadeKnowledgeBase> {
  return fetchApi<MonadeKnowledgeBase>('/api/knowledge-bases', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteKnowledgeBase(kbId: string): Promise<void> {
  return fetchApi<void>(`/api/knowledge-bases/${kbId}`, {
    method: 'DELETE',
  });
}

// ============================================
// Transcript Management
// ============================================

export async function createTranscript(data: CreateTranscriptRequest): Promise<MonadeTranscript> {
  return fetchApi<MonadeTranscript>('/api/transcripts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================
// Convenience exports
// ============================================

export const monadeApi = {
  // Health
  checkHealth,
  checkReady,
  // Users
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  getUserAssistants,
  // API Keys
  generateApiKey,
  getUserApiKeys,
  deleteApiKey,
  validateApiKey,
  // Credits
  getUserCredits,
  addCredits,
  removeCredits,
  updateCredits,
  // Assistants
  getAllAssistants,
  getAssistantById,
  getAssistantByPhone,
  getAssistantsByUser,
  createAssistant,
  updateAssistant,
  deleteAssistant,
  // Knowledge Bases
  getAllKnowledgeBases,
  getKnowledgeBaseById,
  getUserKnowledgeBases,
  createKnowledgeBase,
  deleteKnowledgeBase,
  // Transcripts
  createTranscript,
};

export default monadeApi;

// Export default user UID for convenience
export { DEFAULT_USER_UID };

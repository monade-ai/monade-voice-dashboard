// src/app/knowledge-base/api/knowledge-api.ts

/**
 * API client for knowledge base operations
 */

const KB_SERVICE_BASEURL = process.env.NEXT_PUBLIC_KB_SERVICE_BASEURL;

/**
 * Get organization context from localStorage or auth provider
 */
function getOrganizationContext(): { organizationId?: string } {
  if (typeof window !== 'undefined') {
    const orgId = localStorage.getItem('current_organization_id');
    return orgId ? { organizationId: orgId } : {};
  }
  return {};
}

export async function fetchKnowledgeBaseContent(id: string): Promise<string> {
  try {
    const orgContext = getOrganizationContext();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (orgContext.organizationId) {
      headers['X-Organization-ID'] = orgContext.organizationId;
    }
    const response = await fetch(`${KB_SERVICE_BASEURL}/api/get_kb/${id}`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      throw new Error(`Error fetching KB content: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.kb_text || '';
  } catch (error) {
    console.error('Error fetching KB content:', error);
    throw error;
  }
}


/**
 * Update system prompt with document content
 * @param base64Content - Base64 encoded content of the document
 * @returns Promise with the response from the API
 */
export async function updateSystemPrompt(base64Content: string): Promise<any> {
  try {
    console.log('Calling updateSystemPrompt API with base64 content length:', base64Content.length);
    console.log('First 50 chars of base64:', base64Content.substring(0, 50));
      
    // Log the JSON payload for debugging
    const payload = {
      prompt_base64: base64Content,
    };
    console.log('Payload preview:', JSON.stringify(payload).substring(0, 100) + '...');
    
    const orgContext = getOrganizationContext();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add organization context if available
    if (orgContext.organizationId) {
      headers['X-Organization-ID'] = orgContext.organizationId;
    }
      
    const response = await fetch('https://039f-2405-201-d003-d814-fc48-8886-8dad-ad9.ngrok-free.app/update_system_prompt', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  
    // Log response details
    console.log('API Response status:', response.status);
    console.log('API Response status text:', response.statusText);
  
    if (!response.ok) {
      // Try to get error details from response
      let errorDetail = '';
      try {
        const errorText = await response.text();
        console.error('API Error response:', errorText);
        errorDetail = errorText;
      } catch (e) {
        console.error('Could not read error response text:', e);
      }
        
      throw new Error(`Error: ${response.status} ${response.statusText} - ${errorDetail}`);
    }
  
    const jsonResponse = await response.json();
    console.log('API Success response:', jsonResponse);

    return jsonResponse;
  } catch (error) {
    console.error('Error updating system prompt:', error);
    throw error;
  }
}

export async function uploadKnowledgeBase(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const orgContext = getOrganizationContext();
    const headers: Record<string, string> = {};
    if (orgContext.organizationId) {
      headers['X-Organization-ID'] = orgContext.organizationId;
    }

    const response = await fetch(`${KB_SERVICE_BASEURL}/api/upload_kb`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Error uploading KB: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading KB:', error);
    throw error;
  }
}

/**
   * Document metadata interface
   */
export interface DocumentMetadata {
    id: string;
    title: string;
    description?: string;
    fileType: string;
    fileSize: number;
    content: string; // base64 encoded content
    uploadedAt: string;
  }
  
/**
   * Class to manage document storage with organization context
   */
export class DocumentStorage {
  private static STORAGE_KEY = 'monade_documents';
  
  private static getStorageKey(): string {
    const orgContext = getOrganizationContext();

    return orgContext.organizationId ? `${this.STORAGE_KEY}_${orgContext.organizationId}` : this.STORAGE_KEY;
  }
  
  /**
     * Save a document to storage
     * @param document - Document metadata to save
     */
  static async saveDocument(document: DocumentMetadata): Promise<void> {
    try {
      // Upload to cloud service
      const payload = {
        kb_text: atob(document.content),
        filename: document.title || `document_${document.id}.${document.fileType}`,
      };

      const apiUrl = `${KB_SERVICE_BASEURL}/api/upload_kb`;
      console.log('Attempting to save document to:', apiUrl);

      const orgContext = getOrganizationContext();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add organization context if available
      if (orgContext.organizationId) {
        headers['X-Organization-ID'] = orgContext.organizationId;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Error saving document: ${response.status} ${response.statusText}`);
      }

      // Still keep document metadata in localStorage for backward compatibility
      const documents = this.getAllDocuments();
      const existingIndex = documents.findIndex(doc => doc.id === document.id);
      
      if (existingIndex >= 0) {
        documents[existingIndex] = document;
      } else {
        documents.push(document);
      }
      
      const storageKey = this.getStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(documents));
    } catch (error) {
      console.error('Error saving document:', error);
      throw error;
    }
  }
  
  /**
     * Get all documents from storage
     * @returns Array of document metadata
     */
  static getAllDocuments(): DocumentMetadata[] {
    const storageKey = this.getStorageKey();
    const documentsJson = localStorage.getItem(storageKey);
      
    if (!documentsJson) {
      return [];
    }
      
    try {
      return JSON.parse(documentsJson) as DocumentMetadata[];
    } catch (error) {
      console.error('Error parsing documents from storage:', error);

      return [];
    }
  }
  
  /**
     * Get a document by ID
     * @param id - Document ID
     * @returns Document metadata or null if not found
     */
  static getDocumentById(id: string): DocumentMetadata | null {
    const documents = this.getAllDocuments();

    return documents.find(doc => doc.id === id) || null;
  }
  
  /**
     * Delete a document by ID
     * @param id - Document ID
     * @returns True if document was deleted, false otherwise
     */
  static async deleteDocument(id: string): Promise<boolean> {
    try {
      const orgContext = getOrganizationContext();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add organization context if available
      if (orgContext.organizationId) {
        headers['X-Organization-ID'] = orgContext.organizationId;
      }

      // Delete from cloud service
      const response = await fetch(`${KB_SERVICE_BASEURL}/api/delete_kb/${id}`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Error deleting document: ${response.status} ${response.statusText}`);
      }

      // Also delete from localStorage
      const documents = this.getAllDocuments();
      const filteredDocuments = documents.filter(doc => doc.id !== id);
      
      if (filteredDocuments.length === documents.length) {
        return false; // Document not found
      }
      
      const storageKey = this.getStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(filteredDocuments));

      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }
  
  /**
     * Clear all documents from storage
     */
  static clearAllDocuments(): void {
    const storageKey = this.getStorageKey();
    localStorage.removeItem(storageKey);
  }
}

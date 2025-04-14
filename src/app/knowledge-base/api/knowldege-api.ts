// src/app/knowledge-base/api/knowledge-api.ts

/**
 * API client for knowledge base operations
 */

/**
 * Update system prompt with document content
 * @param base64Content - Base64 encoded content of the document
 * @returns Promise with the response from the API
 */
export async function updateSystemPrompt(base64Content: string): Promise<any> {
    try {
      console.log("Calling updateSystemPrompt API with base64 content length:", base64Content.length);
      console.log("First 50 chars of base64:", base64Content.substring(0, 50));
      
      // Log the JSON payload for debugging
      const payload = {
        prompt_base64: base64Content
      };
      console.log("Payload preview:", JSON.stringify(payload).substring(0, 100) + "...");
      
      const response = await fetch('https://a0f5-122-171-20-156.ngrok-free.app/update_system_prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
  
      // Log response details
      console.log("API Response status:", response.status);
      console.log("API Response status text:", response.statusText);
  
      if (!response.ok) {
        // Try to get error details from response
        let errorDetail = "";
        try {
          const errorText = await response.text();
          console.error("API Error response:", errorText);
          errorDetail = errorText;
        } catch (e) {
          console.error("Could not read error response text:", e);
        }
        
        throw new Error(`Error: ${response.status} ${response.statusText} - ${errorDetail}`);
      }
  
      const jsonResponse = await response.json();
      console.log("API Success response:", jsonResponse);
      return jsonResponse;
    } catch (error) {
      console.error('Error updating system prompt:', error);
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
   * Class to manage document storage
   */
  export class DocumentStorage {
    private static STORAGE_KEY = 'calllive_documents';
  
    /**
     * Save a document to storage
     * @param document - Document metadata to save
     */
    static saveDocument(document: DocumentMetadata): void {
      const documents = this.getAllDocuments();
      
      // Check if document with same ID exists
      const existingIndex = documents.findIndex(doc => doc.id === document.id);
      
      if (existingIndex >= 0) {
        // Update existing document
        documents[existingIndex] = document;
      } else {
        // Add new document
        documents.push(document);
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(documents));
    }
  
    /**
     * Get all documents from storage
     * @returns Array of document metadata
     */
    static getAllDocuments(): DocumentMetadata[] {
      const documentsJson = localStorage.getItem(this.STORAGE_KEY);
      
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
    static deleteDocument(id: string): boolean {
      const documents = this.getAllDocuments();
      const filteredDocuments = documents.filter(doc => doc.id !== id);
      
      if (filteredDocuments.length === documents.length) {
        return false; // Document not found
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredDocuments));
      return true;
    }
  
    /**
     * Clear all documents from storage
     */
    static clearAllDocuments(): void {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }
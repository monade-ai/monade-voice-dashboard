// src/app/knowledge-base/api/prompt-editor-integration.ts

import { updateSystemPrompt } from './knowldege-api';

/**
 * Interface for prompt data
 */
export interface PromptData {
  id: string;
  title: string;
  content: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Handles saving and publishing prompts from the prompt editor
 */
export class PromptManager {
  private static STORAGE_KEY = 'calllive_prompts';

  /**
   * Get all prompts from storage
   */
  static getAllPrompts(): PromptData[] {
    const promptsJson = localStorage.getItem(this.STORAGE_KEY);
    
    if (!promptsJson) {
      return [];
    }
    
    try {
      return JSON.parse(promptsJson) as PromptData[];
    } catch (error) {
      console.error('Error parsing prompts from storage:', error);

      return [];
    }
  }

  /**
   * Save a prompt to storage
   */
  static savePrompt(prompt: PromptData): PromptData {
    const prompts = this.getAllPrompts();
    
    // Check if prompt with same ID exists
    const existingIndex = prompts.findIndex(p => p.id === prompt.id);
    
    if (existingIndex >= 0) {
      // Update existing prompt
      prompt.updatedAt = new Date().toISOString();
      prompts[existingIndex] = prompt;
    } else {
      // Add new prompt
      prompt.createdAt = new Date().toISOString();
      prompt.updatedAt = prompt.createdAt;
      prompts.push(prompt);
    }
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(prompts));

    return prompt;
  }

  /**
   * Get a prompt by ID
   */
  static getPromptById(id: string): PromptData | null {
    const prompts = this.getAllPrompts();

    return prompts.find(p => p.id === id) || null;
  }

  /**
   * Delete a prompt by ID
   */
  static deletePrompt(id: string): boolean {
    const prompts = this.getAllPrompts();
    const filtered = prompts.filter(p => p.id !== id);
    
    if (filtered.length === prompts.length) {
      return false; // No prompt was deleted
    }
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));

    return true;
  }

  /**
   * Publish a prompt to an agent
   */
  static async publishPrompt(prompt: PromptData): Promise<boolean> {
    try {
      // Convert prompt content to Base64
      const promptBase64 = btoa(prompt.content);
      
      // Send to API
      await updateSystemPrompt(promptBase64);
      
      return true;
    } catch (error) {
      console.error('Error publishing prompt:', error);
      throw error;
    }
  }
}

/**
 * Handles content conversion between Markdown and Base64
 */
export class ContentConverter {
  /**
   * Convert Markdown content to Base64
   */
  static markdownToBase64(markdown: string): string {
    return btoa(markdown);
  }

  /**
   * Convert Base64 content to Markdown
   */
  static base64ToMarkdown(base64: string): string {
    return atob(base64);
  }
}
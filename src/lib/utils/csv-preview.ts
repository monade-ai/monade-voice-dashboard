/**
 * CSV Preview Utility
 * Handles CSV parsing, duplicate detection, and localStorage caching
 */

import {
  CSVContact,
  CSVPreviewCache,
  getCampaignPreviewKey,
  CAMPAIGN_API_CONFIG,
} from '@/types/campaign.types';

const MAX_PREVIEW_CONTACTS = CAMPAIGN_API_CONFIG.LIMITS.CSV_PREVIEW_CONTACTS;

// ============================================
// CSV Parsing
// ============================================

export interface ParseCSVResult {
  contacts: CSVContact[];
  fieldNames: string[];
  phoneColumnName: string;
  totalContacts: number;
  duplicates: {
    count: number;
    numbers: string[];
  };
}

/**
 * Parse a CSV file and extract contacts
 */
export async function parseCSV(file: File): Promise<ParseCSVResult> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV file must have a header row and at least one contact');
  }

  // Parse header
  const headers = parseCSVLine(lines[0]);
  const phoneColumnName = detectPhoneColumn(headers);

  if (!phoneColumnName) {
    throw new Error(
      'Could not detect phone number column. Please ensure your CSV has a column with "phone" in the name.'
    );
  }

  const phoneIndex = headers.indexOf(phoneColumnName);
  const seenPhones = new Set<string>();
  const duplicateNumbers: string[] = [];
  const contacts: CSVContact[] = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const contact: CSVContact = { phone_number: '' };

    headers.forEach((header, idx) => {
      const value = values[idx] || '';
      if (idx === phoneIndex) {
        contact.phone_number = normalizePhoneNumber(value);
      } else {
        contact[header] = value;
      }
    });

    if (!contact.phone_number) continue;

    // Check for duplicates
    if (seenPhones.has(contact.phone_number)) {
      duplicateNumbers.push(contact.phone_number);
    } else {
      seenPhones.add(contact.phone_number);
      contacts.push(contact);
    }
  }

  return {
    contacts,
    fieldNames: headers,
    phoneColumnName,
    totalContacts: contacts.length,
    duplicates: {
      count: duplicateNumbers.length,
      numbers: [...new Set(duplicateNumbers)], // Unique duplicate numbers
    },
  };
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Detect the phone number column from headers
 */
function detectPhoneColumn(headers: string[]): string | null {
  const phonePatterns = [
    /^phone$/i,
    /^phone[_\s-]?number$/i,
    /^mobile$/i,
    /^mobile[_\s-]?number$/i,
    /^cell$/i,
    /^cell[_\s-]?phone$/i,
    /^contact[_\s-]?number$/i,
    /^tel$/i,
    /^telephone$/i,
    /phone/i, // Fallback: any column containing "phone"
    /mobile/i, // Fallback: any column containing "mobile"
  ];

  for (const pattern of phonePatterns) {
    const match = headers.find((h) => pattern.test(h));
    if (match) return match;
  }

  return null;
}

/**
 * Normalize a phone number for comparison
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except leading +
  let normalized = phone.replace(/[^\d+]/g, '');

  // If it starts with +, keep it
  if (normalized.startsWith('+')) {
    return normalized;
  }

  // If it's a 10-digit Indian number, add +91
  if (normalized.length === 10 && /^[6-9]/.test(normalized)) {
    return `+91${normalized}`;
  }

  // If it starts with 91 and is 12 digits, add +
  if (normalized.startsWith('91') && normalized.length === 12) {
    return `+${normalized}`;
  }

  return normalized;
}

// ============================================
// localStorage Cache Management
// ============================================

/**
 * Save CSV preview to localStorage
 */
export function saveCSVPreview(
  campaignId: string,
  fileName: string,
  parseResult: ParseCSVResult
): CSVPreviewCache {
  const cache: CSVPreviewCache = {
    campaignId,
    uploadedAt: new Date().toISOString(),
    fileName,
    totalContacts: parseResult.totalContacts,
    duplicatesFound: parseResult.duplicates.count,
    duplicateNumbers: parseResult.duplicates.numbers,
    fieldNames: parseResult.fieldNames,
    preview: parseResult.contacts.slice(0, MAX_PREVIEW_CONTACTS),
    phoneColumnName: parseResult.phoneColumnName,
  };

  const key = getCampaignPreviewKey(campaignId);
  localStorage.setItem(key, JSON.stringify(cache));

  return cache;
}

/**
 * Load CSV preview from localStorage
 */
export function loadCSVPreview(campaignId: string): CSVPreviewCache | null {
  const key = getCampaignPreviewKey(campaignId);
  const data = localStorage.getItem(key);

  if (!data) return null;

  try {
    return JSON.parse(data) as CSVPreviewCache;
  } catch {
    return null;
  }
}

/**
 * Delete CSV preview from localStorage
 */
export function deleteCSVPreview(campaignId: string): void {
  const key = getCampaignPreviewKey(campaignId);
  localStorage.removeItem(key);
}

/**
 * Clean up all campaign previews (e.g., on logout)
 */
export function clearAllCSVPreviews(): void {
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('campaign_csv_preview_')) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

/**
 * Get all stored campaign preview IDs
 */
export function getStoredPreviewCampaignIds(): string[] {
  const ids: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('campaign_csv_preview_')) {
      const id = key.replace('campaign_csv_preview_', '');
      ids.push(id);
    }
  }

  return ids;
}

// ============================================
// CSV Generation for Export
// ============================================

export interface ExportContact extends CSVContact {
  call_status?: string;
  verdict?: string;
  confidence_score?: number;
  summary?: string;
  call_quality?: string;
  key_discoveries?: string;
  transcript_url?: string;
}

/**
 * Generate CSV content from contacts
 */
export function generateCSV(contacts: ExportContact[], fields?: string[]): string {
  if (contacts.length === 0) return '';

  // Determine fields from first contact if not provided
  const allFields = fields || Object.keys(contacts[0]);

  // Generate header row
  const header = allFields.map(escapeCSVField).join(',');

  // Generate data rows
  const rows = contacts.map((contact) =>
    allFields
      .map((field) => {
        const value = contact[field];
        if (value === undefined || value === null) return '';
        if (Array.isArray(value)) return escapeCSVField(value.join('; '));
        return escapeCSVField(String(value));
      })
      .join(',')
  );

  return [header, ...rows].join('\n');
}

/**
 * Escape a field for CSV
 */
function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Download CSV file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// ============================================
// Remove Duplicates Utility
// ============================================

/**
 * Remove duplicate contacts from a list
 */
export function removeDuplicates(contacts: CSVContact[]): CSVContact[] {
  const seen = new Set<string>();
  return contacts.filter((contact) => {
    if (seen.has(contact.phone_number)) {
      return false;
    }
    seen.add(contact.phone_number);
    return true;
  });
}

/**
 * Create a new CSV file without duplicates
 */
export async function createDedupedCSV(file: File): Promise<File> {
  const result = await parseCSV(file);
  const csvContent = generateCSV(result.contacts, result.fieldNames);

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const dedupedFileName = file.name.replace(/\.csv$/i, '_deduped.csv');

  return new File([blob], dedupedFileName, { type: 'text/csv' });
}

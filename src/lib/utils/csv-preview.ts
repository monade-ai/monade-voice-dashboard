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
  // Some test environments provide a File polyfill without `text()`.
  const text = typeof (file as any)?.text === 'function'
    ? await (file as any).text()
    : await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error ?? new Error('Failed to read CSV file'));
      reader.readAsText(file);
    });
  const lines = text.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV file must have a header row and at least one contact');
  }

  // Parse header
  const rawHeaders = parseCSVLine(lines[0]);
  const { headers, phoneColumnName } = normalizePhoneHeaders(rawHeaders);

  if (!phoneColumnName) {
    throw new Error(
      'Could not detect phone number column. Please ensure your CSV has a column with "phone" in the name.',
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

const PHONE_HEADER_ALIASES = new Set([
  'phone number',
  'phone',
  'number',
  'no',
  'phone no',
  'mobile',
  'mobile number',
  'contact number',
  'contact no',
  'contact',
  'tel',
  'telephone',
  'cell',
  'cell phone',
]);

const NAME_HEADER_ALIASES = new Set([
  'name',
  'full name',
  'fullname',
  'customer name',
  'contact name',
  'first name',
  'firstname',
  'last name',
  'lastname',
  'person',
  'person name',
  'client name',
  'lead name',
  'caller name',
  'customer',
  'client',
  'lead',
  'candidate name',
  'candidate',
  'agent name',
  'user name',
  'username',
]);

function normalizeHeaderKey(header: string): string {
  return header.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
}

function isPhoneHeader(header: string): boolean {
  const normalized = normalizeHeaderKey(header);

  return PHONE_HEADER_ALIASES.has(normalized);
}

function isNameHeader(header: string): boolean {
  const normalized = normalizeHeaderKey(header);

  return NAME_HEADER_ALIASES.has(normalized);
}

function normalizePhoneHeaders(headers: string[]): { headers: string[]; phoneColumnName: string | null } {
  let phoneIndex = -1;
  let nameIndex = -1;
  const normalizedHeaders = headers.map((header, idx) => {
    if (phoneIndex === -1 && isPhoneHeader(header)) {
      phoneIndex = idx;

      return 'phone_number';
    }
    if (nameIndex === -1 && isNameHeader(header)) {
      nameIndex = idx;

      return 'name';
    }

    return header;
  });

  let result = normalizedHeaders;

  if (phoneIndex === -1) {
    const detected = detectPhoneColumn(headers);
    if (detected) {
      const detectedIndex = headers.indexOf(detected);
      result = [...result];
      result[detectedIndex] = 'phone_number';
      phoneIndex = detectedIndex;
    }
  }

  // Fallback name detection: look for any header containing "name"
  if (nameIndex === -1) {
    const nameIdx = headers.findIndex((h) => /name/i.test(h));
    if (nameIdx !== -1 && nameIdx !== phoneIndex) {
      result = [...result];
      result[nameIdx] = 'name';
    }
  }

  return {
    headers: result,
    phoneColumnName: phoneIndex !== -1 || headers.some((h) => detectPhoneColumn([h])) ? 'phone_number' : null,
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
    /^phone[_\s-]?no$/i,
    /^number$/i,
    /^no$/i,
    /^mobile$/i,
    /^mobile[_\s-]?number$/i,
    /^cell$/i,
    /^cell[_\s-]?phone$/i,
    /^contact[_\s-]?number$/i,
    /^contact[_\s-]?no$/i,
    /^contact$/i,
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
 * Normalize a phone number for comparison.
 * Strips formatting characters but does NOT add a country code — callers are
 * responsible for ensuring numbers are in E.164 format (+<country><number>).
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except a leading +
  const normalized = phone.replace(/[^\d+]/g, '');

  // If it starts with +, keep it as-is (already E.164)
  if (normalized.startsWith('+')) {
    return normalized;
  }

  // Return as-is — do NOT silently prepend any country code
  return normalized;
}

/**
 * Returns true if the phone number appears to be missing a country code
 * (i.e., does not start with '+').
 */
export function isMissingCountryCode(phone: string): boolean {
  return !phone.startsWith('+');
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
  parseResult: ParseCSVResult,
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
      .join(','),
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
  const BOM = '\uFEFF';
  const blob = new Blob([BOM, content], { type: 'text/csv;charset=utf-8;' });
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

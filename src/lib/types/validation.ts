/**
 * Validation utilities and error handling for organization types
 */

import { 
  OrganizationRole, 
  CreateOrganizationData,
  UpdateOrganizationData,
  InviteUserData,
  ValidationError, 
} from '@/types';

// Validation result type
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Organization validation
export function validateOrganizationName(name: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!name || name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: 'Organization name is required',
      code: 'REQUIRED',
    });
  } else if (name.trim().length < 2) {
    errors.push({
      field: 'name',
      message: 'Organization name must be at least 2 characters',
      code: 'MIN_LENGTH',
    });
  } else if (name.trim().length > 100) {
    errors.push({
      field: 'name',
      message: 'Organization name must be less than 100 characters',
      code: 'MAX_LENGTH',
    });
  }
  
  return errors;
}

export function validateOrganizationSlug(slug: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!slug || slug.trim().length === 0) {
    errors.push({
      field: 'slug',
      message: 'Organization slug is required',
      code: 'REQUIRED',
    });

    return errors;
  }
  
  const slugPattern = /^[a-z0-9-]+$/;
  if (!slugPattern.test(slug)) {
    errors.push({
      field: 'slug',
      message: 'Slug can only contain lowercase letters, numbers, and hyphens',
      code: 'INVALID_FORMAT',
    });
  }
  
  if (slug.length < 3) {
    errors.push({
      field: 'slug',
      message: 'Slug must be at least 3 characters',
      code: 'MIN_LENGTH',
    });
  }
  
  if (slug.length > 50) {
    errors.push({
      field: 'slug',
      message: 'Slug must be less than 50 characters',
      code: 'MAX_LENGTH',
    });
  }
  
  if (slug.startsWith('-') || slug.endsWith('-')) {
    errors.push({
      field: 'slug',
      message: 'Slug cannot start or end with a hyphen',
      code: 'INVALID_FORMAT',
    });
  }
  
  return errors;
}

export function validateEmail(email: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!email || email.trim().length === 0) {
    errors.push({
      field: 'email',
      message: 'Email is required',
      code: 'REQUIRED',
    });

    return errors;
  }
  
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    errors.push({
      field: 'email',
      message: 'Please enter a valid email address',
      code: 'INVALID_FORMAT',
    });
  }
  
  return errors;
}

export function validateCreateOrganizationData(data: CreateOrganizationData): ValidationResult {
  const errors: ValidationError[] = [];
  
  errors.push(...validateOrganizationName(data.name));
  
  if (data.slug) {
    errors.push(...validateOrganizationSlug(data.slug));
  }
  
  if (data.contact_email) {
    errors.push(...validateEmail(data.contact_email));
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateUpdateOrganizationData(data: UpdateOrganizationData): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (data.name !== undefined) {
    errors.push(...validateOrganizationName(data.name));
  }
  
  if (data.contact_email !== undefined && data.contact_email !== '') {
    errors.push(...validateEmail(data.contact_email));
  }
  
  if (data.billing_email !== undefined && data.billing_email !== '') {
    errors.push(...validateEmail(data.billing_email));
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateInviteUserData(data: InviteUserData): ValidationResult {
  const errors: ValidationError[] = [];
  
  errors.push(...validateEmail(data.email));
  
  if (!data.role) {
    errors.push({
      field: 'role',
      message: 'Role is required',
      code: 'REQUIRED',
    });
  } else if (!['admin', 'member'].includes(data.role)) {
    errors.push({
      field: 'role',
      message: 'Role must be either admin or member',
      code: 'INVALID_VALUE',
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Role validation
export function validateRoleChange(
  currentRole: OrganizationRole,
  newRole: OrganizationRole,
  targetUserRole: OrganizationRole,
): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Only owners can change roles to/from owner
  if ((newRole === 'owner' || targetUserRole === 'owner') && currentRole !== 'owner') {
    errors.push({
      field: 'role',
      message: 'Only owners can manage owner roles',
      code: 'INSUFFICIENT_PERMISSIONS',
    });
  }
  
  // Admins can only manage member roles
  if (currentRole === 'admin' && targetUserRole === 'owner') {
    errors.push({
      field: 'role',
      message: 'Admins cannot change owner roles',
      code: 'INSUFFICIENT_PERMISSIONS',
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Password validation
export function validatePassword(password: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!password || password.length === 0) {
    errors.push({
      field: 'password',
      message: 'Password is required',
      code: 'REQUIRED',
    });

    return errors;
  }
  
  if (password.length < 8) {
    errors.push({
      field: 'password',
      message: 'Password must be at least 8 characters',
      code: 'MIN_LENGTH',
    });
  }
  
  if (password.length > 128) {
    errors.push({
      field: 'password',
      message: 'Password must be less than 128 characters',
      code: 'MAX_LENGTH',
    });
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one lowercase letter',
      code: 'WEAK_PASSWORD',
    });
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one uppercase letter',
      code: 'WEAK_PASSWORD',
    });
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one number',
      code: 'WEAK_PASSWORD',
    });
  }
  
  return errors;
}

// Full name validation
export function validateFullName(name: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!name || name.trim().length === 0) {
    errors.push({
      field: 'full_name',
      message: 'Full name is required',
      code: 'REQUIRED',
    });
  } else if (name.trim().length < 2) {
    errors.push({
      field: 'full_name',
      message: 'Full name must be at least 2 characters',
      code: 'MIN_LENGTH',
    });
  } else if (name.trim().length > 100) {
    errors.push({
      field: 'full_name',
      message: 'Full name must be less than 100 characters',
      code: 'MAX_LENGTH',
    });
  }
  
  return errors;
}

// URL validation
export function validateUrl(url: string, fieldName: string = 'url'): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!url || url.trim().length === 0) {
    return errors; // URL is optional in most cases
  }
  
  try {
    new URL(url);
  } catch {
    errors.push({
      field: fieldName,
      message: 'Please enter a valid URL',
      code: 'INVALID_FORMAT',
    });
  }
  
  return errors;
}

// Batch validation utility
export function validateBatch<T>(
  items: T[],
  validator: (item: T) => ValidationResult,
): { valid: T[]; invalid: Array<{ item: T; errors: ValidationError[] }> } {
  const valid: T[] = [];
  const invalid: Array<{ item: T; errors: ValidationError[] }> = [];
  
  items.forEach(item => {
    const result = validator(item);
    if (result.isValid) {
      valid.push(item);
    } else {
      invalid.push({ item, errors: result.errors });
    }
  });
  
  return { valid, invalid };
}

// Sanitization utilities
export function sanitizeOrganizationName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// Validation error formatting
export function formatValidationErrors(errors: ValidationError[]): Record<string, string> {
  const formatted: Record<string, string> = {};
  
  errors.forEach(error => {
    if (!formatted[error.field]) {
      formatted[error.field] = error.message;
    }
  });
  
  return formatted;
}

export function getFirstError(errors: ValidationError[], field: string): string | null {
  const fieldError = errors.find(error => error.field === field);

  return fieldError ? fieldError.message : null;
}

// Common validation patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  SLUG: /^[a-z0-9-]+$/,
  PHONE: /^\+?[\d\s\-\(\)]+$/,
  URL: /^https?:\/\/.+/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  ALPHANUMERIC_SPACES: /^[a-zA-Z0-9\s]+$/,
} as const;

// Validation error codes
export const VALIDATION_ERROR_CODES = {
  REQUIRED: 'REQUIRED',
  MIN_LENGTH: 'MIN_LENGTH',
  MAX_LENGTH: 'MAX_LENGTH',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_VALUE: 'INVALID_VALUE',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  DUPLICATE_VALUE: 'DUPLICATE_VALUE',
} as const;

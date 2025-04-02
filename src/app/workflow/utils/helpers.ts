import { Action } from '../store/workflow-store';

/**
 * Formats actions for display
 * @param actions Array of actions to format
 * @returns Formatted string representation of actions
 */
export function formatActions(actions: Action[]): string {
  return actions
    .map((action) => {
      if (action.text) {
        return `${action.type}: "${action.text}"`;
      }
      const { type, ...rest } = action;
      return `${type}: ${JSON.stringify(rest)}`;
    })
    .join('\n');
}

/**
 * Formats a date with timestamp for file names
 * @returns Formatted date string
 */
export function getTimestampForFileName(): string {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, -5);
}

/**
 * Deep clones an object using JSON serialization
 * @param obj Object to clone
 * @returns Deep cloned object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Truncates a string to a maximum length and adds ellipsis if needed
 * @param str String to truncate
 * @param maxLength Maximum length
 * @returns Truncated string
 */
export function truncateString(str: string, maxLength: number = 100): string {
  if (!str || str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

/**
 * Checks if two objects are equal by comparing stringified JSON
 * @param obj1 First object
 * @param obj2 Second object
 * @returns True if objects are equal
 */
export function areObjectsEqual<T>(obj1: T, obj2: T): boolean {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}
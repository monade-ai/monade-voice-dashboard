export type RetryOptions = {
  retries?: number;
  retryDelayMs?: number;
  retryOn?: (status?: number, error?: unknown) => boolean;
};

export type FetchJsonOptions = RequestInit & {
  retry?: RetryOptions;
  timeoutMs?: number;
  parseJson?: boolean;
};

export class ApiError extends Error {
  status?: number;
  data?: unknown;

  constructor(message: string, status?: number, data?: unknown, cause?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

const DEFAULT_RETRY_METHODS = new Set(['GET', 'HEAD']);
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 400;

export function getFriendlyErrorMessage(status?: number, statusText?: string) {
  if (status === 400) return 'Request could not be processed. Please check your input.';
  if (status === 401 || status === 403) return 'You are not authorized to perform this action.';
  if (status === 404) return 'Requested resource was not found.';
  if (status === 422) return 'Validation failed. Please check your input.';
  if (status === 408) return 'The request timed out. Please try again.';
  if (status === 429) return 'Too many requests. Please wait and try again.';
  if (status !== undefined && status >= 500) return 'Service is currently unavailable. Please try again later.';

  return status !== undefined ? `HTTP ${status}: ${statusText || 'Request failed'}` : 'Request failed';
}

export function isNetworkError(error: unknown) {
  if (!(error instanceof Error)) return false;

  return error.name === 'TypeError'
    || error.message.includes('Failed to fetch')
    || error.message.includes('NetworkError')
    || error.message.includes('Load failed');
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function parseResponseBody(response: Response) {
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    return null;
  }
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  try {
    const text = await response.text();
    if (!text) return null;
    if (text.trim().startsWith('<!DOCTYPE html') || text.trim().startsWith('<html')) {
      return null;
    }

    return { detail: text };
  } catch {
    return null;
  }
}

function isGenericServerMessage(message: string) {
  const normalized = message.trim().toLowerCase();

  return [
    'bad request',
    'unauthorized',
    'forbidden',
    'not found',
    'request failed',
    'an error occurred',
  ].includes(normalized);
}

function isHtmlLike(message: string) {
  const trimmed = message.trim().toLowerCase();

  return trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html');
}

export async function fetchJson<T = unknown>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const retries = options.retry?.retries ?? (DEFAULT_RETRY_METHODS.has(method) ? DEFAULT_RETRIES : 0);
  const retryDelayMs = options.retry?.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const retryOn = options.retry?.retryOn
    ?? ((status?: number, error?: unknown) => (
      isNetworkError(error)
      || (status !== undefined && (status >= 500 || status === 408 || status === 429))
    ));

  let attempt = 0;
  while (true) {
    try {
      const controller = options.timeoutMs ? new AbortController() : undefined;
      const timeoutId = controller
        ? setTimeout(() => controller.abort(), options.timeoutMs)
        : undefined;

      const response = await fetch(url, {
        ...options,
        signal: controller?.signal ?? options.signal,
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await parseResponseBody(response);
        const serverMessage = errorData?.detail || errorData?.message || errorData?.error;
        const friendlyMessage = getFriendlyErrorMessage(response.status, response.statusText);
        const message = serverMessage
          && response.status < 500
          && !isGenericServerMessage(serverMessage)
          && !isHtmlLike(serverMessage)
          ? serverMessage
          : friendlyMessage;
        const apiError = new ApiError(message, response.status, errorData);

        if (attempt < retries && retryOn(response.status, apiError)) {
          const delay = retryDelayMs * (2 ** attempt) + Math.floor(Math.random() * 120);
          attempt += 1;
          await sleep(delay);
          continue;
        }
        throw apiError;
      }

      if (response.status === 204 || options.parseJson === false) {
        return null as T;
      }

      const data = await parseResponseBody(response);

      return data as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;

      if (attempt < retries && retryOn(undefined, error)) {
        const delay = retryDelayMs * (2 ** attempt) + Math.floor(Math.random() * 120);
        attempt += 1;
        await sleep(delay);
        continue;
      }

      const message = isNetworkError(error)
        ? 'Could not reach the service. Please try again later.'
        : 'Unexpected error. Please try again later.';
      throw new ApiError(message, undefined, undefined, error);
    }
  }
}

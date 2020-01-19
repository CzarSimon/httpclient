import { Method, TypedMap } from './types';

export const CLIENT_ID_HEADER = 'X-Client-ID';
export const CONTENT_TYPE_HEADER = 'Content-Type';
export const REQUEST_ID_HEADER = 'X-Request-ID';

export const CONTENT_TYPES: TypedMap<string> = {
  HTML: 'text/html',
  JSON: 'application/json',
  TEXT: 'text/plain',
};

export const REQUEST_ERROR = 'REQUEST_ERROR';
export const CIRCUT_OPEN = 'CIRCUT_OPEN';

export const TIMEOUT_MS: number = 5000;
export const RETRY_DELAY_MS: number = 500;

export const METHODS: TypedMap<Method> = {
  DELETE: 'DELETE',
  GET: 'GET',
  HEAD: 'HEAD',
  OPTIONS: 'OPTIONS',
  POST: 'POST',
  PUT: 'PUT',
};

export const DEFAULT_METHOD: Method = METHODS.GET;
export const IDEMPOTENT_METHODS: Set<Method> = new Set([METHODS.GET, METHODS.HEAD, METHODS.OPTIONS]);
export const RETRY_STATUSES: Set<number> = new Set([502, 503, 504, 599]);
export const SERVICE_UNAVAILABLE: number = 503;

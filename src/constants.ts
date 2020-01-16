import { Method } from "./types";

export const CLIENT_ID_HEADER = "X-Client-ID";
export const CONTENT_TYPE_HEADER = "Content-Type";
export const REQUEST_ID_HEADER = "X-Request-ID";

export const REQUEST_ERROR = "REQUEST_ERROR";
export const CIRCUT_OPEN = "CIRCUT_OPEN";

export const TIMEOUT_MS: number = 5000;
export const RETRY_DELAY_MS: number = 500;

export const METHODS: { [name: string]: Method } = {
  GET: "GET",
  PUT: "PUT",
  HEAD: "HEAD",
  POST: "POST",
  DELETE: "DELETE",
  OPTIONS: "OPTIONS",
};

export const DEFAULT_METHOD: Method = METHODS.GET;
export const IDEMPOTENT_METHODS: Set<Method> = new Set([METHODS.GET, METHODS.HEAD, METHODS.OPTIONS]);
export const RETRY_STATUSES: Set<number> = new Set([502, 503, 504, 599]);
export const SERVICE_UNAVAILABLE: number = 503;


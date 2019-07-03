export const TIMEOUT_MS: number = 5000;
export const RETRY_DELAY_MS: number = 500;

export const IDEMPOTENT_METHODS: Set<string> = new Set(["get", "head", "options"]);
export const RETRY_STATUSES: Set<number> = new Set([502, 503, 504, 599]);
export const SERVICE_UNAVAILABLE: number = 503;


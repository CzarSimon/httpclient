export type Optional<T> = T | undefined;

export type Method = 'GET' | 'PUT' | 'PATCH' | 'POST' | 'DELETE' | 'OPTIONS' | 'HEAD';

export interface Options {
  url: string;
  method?: Method;
  body?: any;
  headers?: Headers;
  timeout?: number;
  retryOnFailure?: boolean;
}

export interface HTTPRequest {
  url: string;
  method: Method;
  body?: any;
  headers: Headers;
  timeout?: number;
}

export interface TypedMap<V> {
  [key: string]: V;
}

export type Headers = TypedMap<string>;

export interface HTTPResponse<T> {
  body?: T;
  error?: Error;
  metadata: ResponseMetadata;
}

export interface ResponseMetadata {
  latency?: number;
  method: Method;
  requestId?: string;
  status: number;
  url: string;
}

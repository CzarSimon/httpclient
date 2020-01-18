export type Optional<T> = (T | undefined);

export type Method = (
  "GET" |
  "PUT" |
  "PATCH" |
  "POST" |
  "DELETE" |
  "OPTIONS" |
  "HEAD"
);

export interface Options {
  url: string
  method?: Method
  body?: any
  headers?: Headers
  timeout?: number
  retryOnFailure?: boolean
};

export interface Request {
  url: string
  method: Method
  body?: any
  headers: Headers
};

export interface Headers {
  [name: string]: string
};

export interface Response<T, E> {
  body?: T
  error?: HTTPError<E>
  metadata: ResponseMetadata
};

export interface ResponseMetadata {
  latency: number
  method: Method
  requestId?: string
  status: number
  url: string
};

export interface HTTPError<E> {
  type: string
  body?: E
};




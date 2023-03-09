import CircutBreaker, { Options as CircutBreakerOptions } from '@czarsimon/circutbreaker';
import { Handlers, Logger } from '@czarsimon/remotelogger';
import {
  DEFAULT_METHOD,
  IDEMPOTENT_METHODS,
  METHODS,
  RETRY_DELAY_MS,
  RETRY_STATUSES,
  SERVICE_UNAVAILABLE,
  TIMEOUT_MS,
} from './constants';
import { Transport } from './transport/base';
import { Fetch } from './transport/fetch';
import { Headers, HTTPResponse, Optional, Options, ResponseMetadata } from './types';
import { sleep, Timer, wrapError } from './util';

interface ConfigOptions {
  baseHeaders?: Headers;
  circutBreakerOptions?: CircutBreakerOptions;
  logHandlers?: Handlers;
  transport?: Transport;
}

export class HttpClient {
  private baseHeaders: Headers;
  private circutBreaker: CircutBreaker;
  private log: Logger;
  private transport: Transport;

  constructor(opts: ConfigOptions) {
    const { baseHeaders, circutBreakerOptions, logHandlers, transport } = opts;

    this.baseHeaders = baseHeaders || {};
    this.circutBreaker = new CircutBreaker(circutBreakerOptions || { active: true });

    this.log = new Logger({
      handlers: logHandlers || {},
      name: 'httpclient',
    });

    this.transport = transport || new Fetch();
  }

  public setHeaders(headers: Headers) {
    this.baseHeaders = headers;
  }

  public getHeaders(): Headers {
    return this.baseHeaders;
  }

  public async get<T>(opts: Options): Promise<HTTPResponse<T>> {
    return this.request({ ...opts, method: METHODS.GET });
  }

  public async put<T>(opts: Options): Promise<HTTPResponse<T>> {
    return this.request({ ...opts, method: METHODS.PUT });
  }

  public async post<T>(opts: Options): Promise<HTTPResponse<T>> {
    return this.request({ ...opts, method: METHODS.POST });
  }

  public async delete<T>(opts: Options): Promise<HTTPResponse<T>> {
    return this.request({ ...opts, method: METHODS.DELETE });
  }

  public async request<T>(opts: Options): Promise<HTTPResponse<T>> {
    const { url, method = METHODS.GET, body, timeout } = opts;

    if (this.circutBreaker.isOpen(url)) {
      return createCircutOpenResponse(opts);
    }

    const headers = this.createHeaders(opts);
    const timer = new Timer();
    try {
      const res = await this.transport.request<T>({
        body,
        headers,
        method,
        timeout,
        url,
      });
      res.metadata.latency = timer.stop();

      const { status } = res.metadata;
      if (status >= 400 || res.error) {
        return this.handleRequestFailure<T>({ ...opts, headers }, res.metadata, res.error);
      }

      this.recordRequest(res.metadata);
      return res;
    } catch (error) {
      const typedError = wrapError(error);
      this.log.error(`${method} ${url} failed. error=[${error}]`);
      this.circutBreaker.record(url, SERVICE_UNAVAILABLE);
      return {
        error: typedError,
        metadata: {
          headers: {},
          latency: timer.stop(),
          method,
          status: SERVICE_UNAVAILABLE,
          url,
        },
      };
    }
  }

  private handleRequestFailure<T>(
    opts: Options,
    metadata: ResponseMetadata,
    error: Optional<Error>,
  ): Promise<HTTPResponse<T>> {
    const { method, url } = opts;
    const { requestId, status } = metadata;
    this.circutBreaker.record(url, status);

    this.log.error(`${method} ${url} - status=[${status}], error=[${error}] requestId=[${requestId}]`);
    return this.retryRequest<T>(opts, metadata, error);
  }

  private async retryRequest<T>(
    opts: Options,
    metadata: ResponseMetadata,
    error: Optional<Error>,
  ): Promise<HTTPResponse<T>> {
    const { timeout = TIMEOUT_MS } = opts;
    if (!shouldRetry(opts, metadata)) {
      return createErrorResponse<T>(metadata, error);
    }

    await sleep(RETRY_DELAY_MS);
    return this.request<T>({
      ...opts,
      retryOnFailure: false,
      timeout: timeout + RETRY_DELAY_MS,
    });
  }

  private createHeaders(opts: Options): Headers {
    const headers = opts.headers || {};
    Object.keys(this.baseHeaders).forEach(headerName => {
      if (!headers[headerName]) {
        headers[headerName] = this.baseHeaders[headerName];
      }
    });

    return headers;
  }

  private recordRequest(metadata: ResponseMetadata) {
    const { latency, method, requestId, status, url } = metadata;
    this.circutBreaker.record(url, status);

    const message = `${method} ${url} - status=[${status}], latency=[${latency} ms], requestId=[${requestId}]`;
    if (status < 400) {
      this.log.debug(message);
    } else {
      this.log.warn(message);
    }
  }
}

function shouldRetry(opts: Options, metadata: ResponseMetadata): boolean {
  const { method, retryOnFailure = true } = opts;

  return (
    retryOnFailure && method !== undefined && IDEMPOTENT_METHODS.has(method) && RETRY_STATUSES.has(metadata.status)
  );
}

function createCircutOpenResponse<T>(opts: Options): Promise<HTTPResponse<T>> {
  const { method = DEFAULT_METHOD, url } = opts;

  return Promise.resolve({
    error: new Error(`CircutOpenError url=[${url}]`),
    metadata: {
      headers: {},
      method,
      status: SERVICE_UNAVAILABLE,
      url,
    },
  });
}

function createErrorResponse<T>(metadata: ResponseMetadata, error: Optional<Error>): Promise<HTTPResponse<T>> {
  return Promise.resolve({
    error,
    metadata,
  });
}

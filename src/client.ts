import CircutBreaker, { Options as CircutBreakerOptions } from '@czarsimon/circutbreaker';
import { Handlers, Logger } from '@czarsimon/remotelogger';
import {
  CIRCUT_OPEN,
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
import { Headers, HTTPError, Optional, Options, Response, ResponseMetadata } from './types';
import { sleep, Timer } from './util';

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

  public async get<T, E>(opts: Options): Promise<Response<T, E>> {
    return this.request({ ...opts, method: METHODS.GET });
  }

  public async put<T, E>(opts: Options): Promise<Response<T, E>> {
    return this.request({ ...opts, method: METHODS.PUT });
  }

  public async post<T, E>(opts: Options): Promise<Response<T, E>> {
    return this.request({ ...opts, method: METHODS.POST });
  }

  public async delete<T, E>(opts: Options): Promise<Response<T, E>> {
    return this.request({ ...opts, method: METHODS.DELETE });
  }

  public async request<T, E>(opts: Options): Promise<Response<T, E>> {
    const { url, method = METHODS.GET, body, timeout } = opts;

    if (this.circutBreaker.isOpen(url)) {
      return createCircutOpenResponse(opts);
    }

    const headers = this.createHeaders(opts);
    try {
      const timer = new Timer();
      const res = await this.transport.request<T, E>({
        body,
        headers,
        method,
        timeout,
        url,
      });
      res.metadata.latency = timer.stop();

      const { status } = res.metadata;
      if (status >= 400 || res.error) {
        return this.handleRequestFailure<T, E>({ ...opts, headers }, res.metadata, res.error);
      }

      this.recordRequest(res.metadata);
      return res;
    } catch (error) {
      this.log.error(`${method} ${url} failed. error=[${JSON.stringify(error)}]`);
      this.circutBreaker.record(url, SERVICE_UNAVAILABLE);
      throw error;
    }
  }

  private handleRequestFailure<T, E>(
    opts: Options,
    metadata: ResponseMetadata,
    error: Optional<HTTPError<E>>,
  ): Promise<Response<T, E>> {
    const { method, url } = opts;
    const { requestId, status } = metadata;
    this.circutBreaker.record(url, status);

    const errorMsg = error ? `error=[${error.type}: ${error.body}], ` : '';
    this.log.error(`${method} ${url} - status=[${status}], ${errorMsg}requestId=[${requestId}]`);
    return this.retryRequest<T, E>(opts, metadata, error);
  }

  private async retryRequest<T, E>(
    opts: Options,
    metadata: ResponseMetadata,
    error: Optional<HTTPError<E>>,
  ): Promise<Response<T, E>> {
    const { timeout = TIMEOUT_MS } = opts;
    if (!shouldRetry(opts, metadata)) {
      return createErrorResponse<T, E>(metadata, error);
    }

    await sleep(RETRY_DELAY_MS);
    return this.request<T, E>({
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
    retryOnFailure &&
    method !== undefined &&
    IDEMPOTENT_METHODS.has(method) &&
    RETRY_STATUSES.has(metadata.status)
  );
}

function createCircutOpenResponse<T, E>(opts: Options): Promise<Response<T, E>> {
  const { method = DEFAULT_METHOD, url } = opts;

  return Promise.resolve({
    error: {
      type: CIRCUT_OPEN,
    },
    metadata: {
      method,
      status: SERVICE_UNAVAILABLE,
      url,
    },
  });
}

function createErrorResponse<T, E>(metadata: ResponseMetadata, error: Optional<HTTPError<E>>): Promise<Response<T, E>> {
  return Promise.resolve({
    error,
    metadata,
  });
}

import fetch from 'cross-fetch';
import uuid from 'uuid/v4';
import { CONTENT_TYPE_HEADER, CONTENT_TYPES, REQUEST_ERROR, REQUEST_ID_HEADER } from '../constants';
import { Headers, Optional, Request, Response as HTTPResponse, ResponseMetadata } from '../types';
import { Transport } from './base';

export class Fetch extends Transport {
  public async request<T, E>(req: Request): Promise<HTTPResponse<T, E>> {
    const { body, method, timeout, url } = req;
    const headers = createHeaders(req);

    const controller = new AbortController();
    if (timeout) {
      setTimeout(() => {
        controller.abort();
      }, timeout);
    }

    const res = await fetch(url, {
      body: body ? JSON.stringify(body) : undefined,
      headers,
      method,
      signal: controller.signal,
    });

    const metadata: ResponseMetadata = {
      method,
      requestId: headers[REQUEST_ID_HEADER],
      status: res.status,
      url,
    };

    if (res.ok) {
      return {
        body: await parseBody<T>(res),
        metadata,
      };
    } else {
      return {
        error: {
          body: await parseBody<E>(res),
          type: REQUEST_ERROR,
        },
        metadata,
      };
    }
  }
}

async function parseBody<T>(res: Response): Promise<Optional<T>> {
  const contentType = res.headers.get(CONTENT_TYPE_HEADER);
  if (!contentType) {
    return;
  }

  if (contentType.startsWith(CONTENT_TYPES.JSON)) {
    return res.json();
  }

  if (contentType.startsWith(CONTENT_TYPES.TEXT) || contentType.startsWith(CONTENT_TYPES.HTML)) {
    const body: any = await res.text();
    return body;
  }

  return res.json();
}

function createHeaders(req: Request): Headers {
  const headers: Headers = req.headers || {};
  if (req.body && !headers[CONTENT_TYPE_HEADER]) {
    headers[CONTENT_TYPE_HEADER] = CONTENT_TYPES.JSON;
  }

  if (!headers[REQUEST_ID_HEADER]) {
    headers[REQUEST_ID_HEADER] = uuid();
  }

  return headers;
}

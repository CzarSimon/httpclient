import fetch from 'cross-fetch';
import { v4 as uuid } from 'uuid';
import { CONTENT_TYPE_HEADER, CONTENT_TYPES, REQUEST_ID_HEADER } from '../constants';
import { Headers, HTTPRequest, HTTPResponse, ResponseMetadata } from '../types';
import { wrapError } from '../util';
import { Transport } from './base';

export class Fetch extends Transport {
  public async request<T>(req: HTTPRequest): Promise<HTTPResponse<T>> {
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

    if (!res.ok) {
      const errorMsg = await res.text();
      return {
        error: new Error(errorMsg),
        metadata,
      };
    }

    try {
      return {
        body: await parseBody<T>(res),
        metadata,
      };
    } catch (error) {
      const typedError = wrapError(error);
      return {
        error: typedError,
        metadata,
      };
    }
  }
}

async function parseBody<T>(res: Response): Promise<T> {
  const contentType = res.headers.get(CONTENT_TYPE_HEADER);
  if (!contentType || contentType.startsWith(CONTENT_TYPES.JSON)) {
    return res.json();
  }

  const body = await res.text();
  throw new Error(`Unsupported content-type: [${contentType}], body: [${body}]`);
}

function createHeaders(req: HTTPRequest): Headers {
  const headers: Headers = req.headers || {};
  if (req.body && !headers[CONTENT_TYPE_HEADER]) {
    headers[CONTENT_TYPE_HEADER] = CONTENT_TYPES.JSON;
  }

  if (!headers[REQUEST_ID_HEADER]) {
    headers[REQUEST_ID_HEADER] = uuid();
  }

  return headers;
}

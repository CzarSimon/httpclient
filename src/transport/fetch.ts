import { Transport } from "./base";
import { Headers, Request, Response, ResponseMetadata } from "../types";
import { REQUEST_ID_HEADER, CONTENT_TYPE_HEADER, REQUEST_ERROR } from "../constants";
import uuid from 'uuid/v4';

export class Fetch extends Transport {
  public async request<T, E>(req: Request): Promise<Response<T, E>> {
    const { body, method, url } = req;

    const headers = createHeaders(req);
    const startTime = (new Date()).getTime();

    const res = await fetch(url, {
      body: (body) ? JSON.stringify(body) : undefined,
      headers,
      method,
    });

    const metadata: ResponseMetadata = {
      latency: (new Date()).getTime() - startTime,
      method,
      requestId: headers[REQUEST_ID_HEADER],
      status: res.status,
      url,
    };

    if (res.ok) {
      const responseBody: T = await res.json();
      return {
        body: responseBody,
        metadata,
      }
    } else {
      const err: E = await res.json();
      return {
        error: {
          type: REQUEST_ERROR,
          body: err,
        },
        metadata,
      }
    };
  }
};

function createHeaders(req: Request): Headers {
  const headers: Headers = req.headers || {};
  if (req.body && !headers[CONTENT_TYPE_HEADER]) {
    headers[CONTENT_TYPE_HEADER] = "application/json"
  }

  if (!headers[REQUEST_ID_HEADER]) {
    headers[REQUEST_ID_HEADER] = uuid();
  }

  return headers;
};

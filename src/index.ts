import { ConsoleHandler, level } from '@czarsimon/remotelogger';
import { HttpClient } from './client';
import { Fetch } from './transport';

export { HttpClient } from './client';
export { Fetch, Transport } from './transport';
export { CIRCUT_OPEN, REQUEST_ERROR } from './constants';
export { Headers, HTTPError, Method, Request, Response, ResponseMetadata } from './types';

const defaultClient = new HttpClient({
  circutBreakerOptions: {
    active: true,
  },
  logHandlers: {
    console: new ConsoleHandler(level.DEBUG),
  },
  transport: new Fetch(),
});

const httpclient = {
  delete: defaultClient.delete,
  get: defaultClient.get,
  post: defaultClient.post,
  put: defaultClient.put,
  request: defaultClient.request,
};

export default httpclient;

import { ConsoleHandler, level } from '@czarsimon/remotelogger';
import { HttpClient } from './client';
import { Fetch } from './transport';

export { HttpClient } from './client';
export { Fetch, MockTransport, Transport } from './transport';
export { Headers, HTTPRequest, HTTPResponse, Method, ResponseMetadata } from './types';

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

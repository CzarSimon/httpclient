import { HttpClient } from "./client";
import { ConsoleHandler, level } from "@czarsimon/remotelogger";

export { HttpClient } from "./client";
export { Fetch, Transport } from "./transport";

export { CIRCUT_OPEN, REQUEST_ERROR } from "./constants";

export {
  Headers,
  HTTPError,
  Method,
  Request,
  Response,
  ResponseMetadata
} from "./types";

const defaultClient = new HttpClient({
  circutBreakerOptions: {
    active: true,
  },
  logHandlers: {
    console: new ConsoleHandler(level.DEBUG),
  }
});

const httpclient = {
  request: defaultClient.request,
  get: defaultClient.get,
  put: defaultClient.put,
  post: defaultClient.post,
  delete: defaultClient.delete,
};

export default httpclient;

import { REQUEST_ERROR } from '../constants';
import { Optional, Request, Response as HTTPResponse, TypedMap } from '../types';
import { sleep } from '../util';
import { Transport } from './base';

type Responses = TypedMap<HTTPResponse<any, any>>;

export class MockTransport extends Transport {
  private responses: Responses;
  private delay: Optional<number>;

  constructor(responses: Responses, delay?: number) {
    super();
    this.responses = responses;
    this.delay = delay;
  }

  public async request<T, E>(req: Request): Promise<HTTPResponse<T, E>> {
    const { method, timeout, url } = req;
    if (this.delay && timeout && this.delay > timeout) {
      await sleep(timeout);
      throw {
        message: 'The user aborted a request.',
        type: 'aborted',
      };
    }

    if (this.delay) {
      await sleep(this.delay);
    }

    const res = this.responses[url];
    if (res) {
      return res;
    }

    return {
      error: {
        type: REQUEST_ERROR,
      },
      metadata: {
        method,
        status: 404,
        url,
      },
    };
  }
}

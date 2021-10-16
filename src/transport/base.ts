import { HTTPRequest, HTTPResponse } from '../types';

export abstract class Transport {
  public abstract request<T>(req: HTTPRequest): Promise<HTTPResponse<T>>;
}

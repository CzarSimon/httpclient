import { Request, Response } from '../types';

export abstract class Transport {
  public abstract async request<T, E>(req: Request): Promise<Response<T, E>>;
}

import { Response, Request } from "../types";

export abstract class Transport {
  public async abstract request<T, E>(req: Request): Promise<Response<T, E>>;
}

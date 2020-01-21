import { Fetch, Transport } from '.';
import { METHODS } from '../constants';
import { Headers, TypedMap } from '../types';

interface HTTPBinResponse {
  args: TypedMap<string>;
  data: string;
  files: TypedMap<string>;
  form: TypedMap<string>;
  headers: Headers;
  json?: any;
  origin: string;
  url: string;
}

test('Fetch should be instance of Transport', () => {
  const transport = new Fetch();
  expect(transport instanceof Transport).toBe(true);
});

test('Fetch should be able to make a get request', async () => {
  const transport = new Fetch();
  const res = await transport.request<HTTPBinResponse>({
    headers: {},
    method: METHODS.GET,
    timeout: 2000,
    url: 'https://httpbin.org/get',
  });

  expect(res.metadata.status).toBe(200);
  expect(res.error).toBeUndefined();
  expect(res.body).toBeDefined();
});

test('Fetch should return error response on bad method', async () => {
  const transport = new Fetch();
  const res = await transport.request<HTTPBinResponse>({
    headers: {},
    method: METHODS.DELETE,
    timeout: 2000,
    url: 'https://httpbin.org/get',
  });

  expect(res.metadata.status).toBe(405);
  expect(res.error).toBeDefined();
  expect(res.body).toBeUndefined();
});

test('Fetch should throw an error on timoout', async () => {
  const transport = new Fetch();
  try {
    await transport.request<HTTPBinResponse>({
      body: {
        key: 'value',
      },
      headers: {},
      method: METHODS.PUT,
      timeout: 50,
      url: 'https://httpbin.org/delay/5',
    });
    fail('Timout should have thrown an error');
  } catch (error) {
    expect(error.type).toBe('aborted');
  }
});

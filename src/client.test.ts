import { ConsoleHandler, level } from '@czarsimon/remotelogger';
import { v4 as uuid } from 'uuid';
import { HttpClient, MockTransport } from '.';
import { METHODS, RETRY_DELAY_MS, SERVICE_UNAVAILABLE } from './constants';
import { Timer } from './util';

interface Author {
  name: string;
  email: string;
}

interface Post {
  title: string;
  text: string;
  author: Author;
}

test('HttpClient should be able to make a get request', async () => {
  const delay = 50;
  const transport = new MockTransport(
    {
      '/users/1': {
        body: {
          author: {
            email: 'mail@mail.com',
            name: 'Some name',
          },
          text: 'some text',
          title: 'h1',
        },
        metadata: {
          headers: {},
          method: METHODS.GET,
          requestId: uuid(),
          status: 200,
          url: '/users/1',
        },
      },
    },
    delay,
  );

  const client = new HttpClient({
    circutBreakerOptions: {
      active: true,
    },
    logHandlers: {
      console: new ConsoleHandler(level.DEBUG),
    },
    transport,
  });

  const res = await client.get<Post>({ url: '/users/1' });

  expect(res.body).toBeDefined();
  const { title, author } = res.body!;
  expect(title).toBe('h1');
  expect(author.email).toBe('mail@mail.com');

  expect(res.error).toBeUndefined();

  const { latency, status, url } = res.metadata;
  expect(status).toBe(200);
  expect(url).toBe('/users/1');
  expect(latency).toBeGreaterThanOrEqual(delay);
  expect(latency).toBeLessThan(delay * 2);

  const resNotFound = await client.get<Post>({ url: '/users/2' });
  expect(resNotFound.body).toBeUndefined();
  expect(resNotFound.error).toBeDefined();
  expect(resNotFound.error?.message).toBe('not found');
  expect(resNotFound.metadata.status).toBe(404);
});

test('HttpClient circut breaker shold kick in on failed requests', async () => {
  const delay = 1000;
  const transport = new MockTransport(
    {
      '/authors/1': {
        body: {
          email: 'mail@mail.com',
          name: 'Some name',
        },
        metadata: {
          headers: {},
          method: METHODS.GET,
          requestId: uuid(),
          status: 200,
          url: '/authors/1',
        },
      },
    },
    delay,
  );

  const client = new HttpClient({
    circutBreakerOptions: {
      active: true,
      failureThreshold: 2,
    },
    transport,
  });

  for (let i = 0; i < 2; i++) {
    const { error, metadata } = await client.get<Author>({ url: '/authors/1', timeout: 50 });
    expect(error).toBeDefined();
    expect(error?.message).toBe('The user aborted a request.');
    expect(metadata.status).toBe(SERVICE_UNAVAILABLE);
  }

  const timer = new Timer();
  const res = await client.get<Author>({ url: '/authors/1', timeout: 2000 });
  const latency = timer.stop();

  expect(res.body).toBeUndefined();
  expect(res.error).toBeDefined();
  expect(res.error?.message.startsWith('CircutOpenError')).toBe(true);
  expect(latency).toBeLessThan(2000);
  expect(res.metadata.status).toBe(SERVICE_UNAVAILABLE);
});

test('HttpClient retry should not be done on 400 errors', async () => {
  const delay = 100;
  const transport = new MockTransport(
    {
      '/authors/1': {
        error: new Error('bad request'),
        metadata: {
          headers: {},
          method: METHODS.GET,
          requestId: uuid(),
          status: 400,
          url: '/authors/1',
        },
      },
    },
    delay,
  );

  const client = new HttpClient({ transport });
  const timer = new Timer();
  const res = await client.get<Author>({ url: '/authors/1', timeout: 2000 });
  const latency = timer.stop();

  expect(res.body).toBeUndefined();
  expect(res.error).toBeDefined();
  expect(latency).toBeGreaterThanOrEqual(delay);
  expect(latency).toBeLessThan(delay * 2);
  expect(res.metadata.status).toBe(400);
});

test('HttpClient retry should be done on 502 errors with idempotent methods', async () => {
  const delay = 100;
  const transport = new MockTransport(
    {
      '/authors/1': {
        error: new Error('bad gateway'),
        metadata: {
          headers: {},
          method: METHODS.GET,
          requestId: uuid(),
          status: 502,
          url: '/authors/1',
        },
      },
    },
    delay,
  );

  const client = new HttpClient({ transport });
  const timer = new Timer();
  const res = await client.get<Author>({ url: '/authors/1', timeout: 2000 });
  const latency = timer.stop();

  expect(res.body).toBeUndefined();
  expect(res.error).toBeDefined();
  expect(latency).toBeGreaterThanOrEqual(delay * 2);
  expect(latency).toBeLessThan(delay * 3 + RETRY_DELAY_MS);
  expect(res.metadata.status).toBe(502);
});

test('HttpClient retry should not be done on 502 errors with non idempotent methods', async () => {
  const delay = 100;
  const transport = new MockTransport(
    {
      '/authors/1': {
        error: new Error('bad gateway'),
        metadata: {
          headers: {},
          method: METHODS.POST,
          requestId: uuid(),
          status: 502,
          url: '/authors/1',
        },
      },
    },
    delay,
  );

  const client = new HttpClient({ transport });
  const timer = new Timer();
  const res = await client.post<Author>({ url: '/authors/1', timeout: 2000 });
  const latency = timer.stop();

  expect(res.body).toBeUndefined();
  expect(res.error).toBeDefined();
  expect(latency + 10).toBeGreaterThanOrEqual(delay);
  expect(latency).toBeLessThan(delay * 2);
  expect(res.metadata.status).toBe(502);
});

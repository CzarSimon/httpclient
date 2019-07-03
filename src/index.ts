import uuid from 'uuid/v4';
import axios, { AxiosError } from 'axios';
import { Options, Response, Error, Headers } from "./types";
import {
    TIMEOUT_MS,
    RETRY_DELAY_MS,
    SERVICE_UNAVAILABLE,
    IDEMPOTENT_METHODS,
    RETRY_STATUSES
} from './constants';

type Optional<T> = (T | undefined);

let CLIENT_ID: Optional<string> = undefined;
let AUTH_TOKEN: Optional<string> = undefined;

function configure(authToken: string, clientId: Optional<string> = undefined) {
    if (clientId) {
        CLIENT_ID = clientId;
    }
    AUTH_TOKEN = authToken;
}

function get<T>(opts: Options): Promise<Response<T>> {
    return request<T>({ ...opts, method: "get" });
};

function post<T>(opts: Options): Promise<Response<T>> {
    return request<T>({ ...opts, method: "post" });
};

function put<T>(opts: Options): Promise<Response<T>> {
    return request<T>({ ...opts, method: "put" });
};

function deleteRequest<T>(opts: Options): Promise<Response<T>> {
    return request<T>({ ...opts, method: "delete" });
};

async function request<T>(opts: Options): Promise<Response<T>> {
    const { url, method = "get", body, headers, timeout = TIMEOUT_MS } = opts;
    const requestHeaders = (headers) ? headers : createHeaders(opts);
    try {
        const { data, status } = await axios({
            method,
            url,
            timeout,
            data: body,
            headers: requestHeaders
        });
        return { body: data, error: undefined, status }
    } catch (error) {
        return handleRequestFailure<T>(opts, requestHeaders, error);
    }
}

function handleRequestFailure<T>(opts: Options, headers: Headers, error: AxiosError<Error>): Promise<Response<T>> {
    if (error.response) {
        return handleFailureResponse<T>(opts, headers, error);
    } else if (error.request) {
        return retryRequest(opts, headers, SERVICE_UNAVAILABLE);
    }

    return createErrorResponse(error, opts);
};

function handleFailureResponse<T>(opts: Options, headers: Headers, error: AxiosError<Error>): Promise<Response<T>> {
    const { status } = error.response!;
    if (RETRY_STATUSES.has(status)) {
        return retryRequest<T>(opts, headers, status);
    }

    return createErrorResponse(error, opts);
};

async function retryRequest<T>(opts: Options, headers: Headers, status: number): Promise<Response<T>> {
    const { timeout = TIMEOUT_MS } = opts;
    if (shouldRetry(opts)) {
        return maxRetriesExceeded(opts, headers);
    }

    const delay = RETRY_DELAY_MS * ((RETRY_STATUSES.has(status)) ? 2 : 1);
    await sleep(delay);
    return request({ ...opts, headers, timeout: (timeout + delay), retryOnFailure: false });
};

function formatAxiosError(error: AxiosError<Error>, opts: Options): Error {
    if (error.response) {
        return error.response.data
    }

    return {
        status: SERVICE_UNAVAILABLE,
        message: `No response: method=${opts.method} url=${opts.url} axiosErrorCode=${error.code}`,
        path: opts.url,
        requestId: error.config.headers["X-Request-ID"]
    }
}

function maxRetriesExceeded(opts: Options, headers: Headers): Promise<Response> {
    const err = {
        status: SERVICE_UNAVAILABLE,
        message: `Max retries reached. ${opts.method} ${opts.method}`,
        path: opts.url,
        requestId: headers["X-Request-ID"]
    };

    return Promise.resolve({
        body: undefined,
        status: err.status,
        error: err
    });
}

function createErrorResponse(error: AxiosError<Error>, opts: Options): Promise<Response> {
    const err = formatAxiosError(error, opts);
    return Promise.resolve({
        body: undefined,
        status: err.status,
        error: err
    });
}

function shouldRetry(opts: Options): boolean {
    const { method, retryOnFailure = true } = opts;
    if (!retryOnFailure) {
        return false
    }
    return (method !== undefined && IDEMPOTENT_METHODS.has(method));
}

function createHeaders(opts: Options): Headers {
    const { useAuth = true } = opts;
    const baseHeaders: Headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Language": "sv",
        "X-Request-ID": uuid()
    };

    if (CLIENT_ID) {
        baseHeaders["X-Client-ID"] = CLIENT_ID;
    }
    if (AUTH_TOKEN && useAuth) {
        baseHeaders["Authorization"] = `Bearer ${AUTH_TOKEN}`;
    }

    return baseHeaders;
};

function sleep(milliseconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
};

const httpclient = {
    configure,
    request,
    get,
    post,
    put,
    delete: deleteRequest
};

export default httpclient;
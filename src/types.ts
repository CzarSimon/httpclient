import { Method } from 'axios';

export interface Options {
    url: string
    useAuth: boolean
    method?: Method
    body?: any
    headers?: Headers
    timeout?: number
    clientId?: string
    retryOnFailure?: boolean
};

export interface Response<T = any> {
    body?: T
    error?: any
    status: number
};

export interface Error {
    errorId?: string
    status: number
    message: string
    path: string
    requestId: string
};

export interface Headers {
    [name: string]: string
}
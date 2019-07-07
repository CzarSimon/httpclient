type CircutState = (0 | 1 | 2);
type Optional<T> = (T | undefined);

const OPEN: CircutState = 0;
const HALF_OPEN: CircutState = 1;
const CLOSED: CircutState = 2;

interface BackendHealth {
    id: string
    state: CircutState
    failures: Array<number>
    openedAt?: number
};

export interface CircutBreakerOptions {
    active: boolean
    timespanMilliseconds?: number
    openMilliseconds?: number
    failureThreshold?: number
}

interface CircutBreakerState {
    [id: string]: BackendHealth
}

export default class CircutBreaker {
    private active: boolean;
    private timespanMilliseconds: number
    private openMilliseconds: number
    private failureThreshold: number
    private state: CircutBreakerState

    constructor(opts: CircutBreakerOptions) {
        const { active, timespanMilliseconds, openMilliseconds, failureThreshold } = opts;
        this.active = active;
        this.timespanMilliseconds = timespanMilliseconds || 10000;
        this.openMilliseconds = openMilliseconds || 5000;
        this.failureThreshold = failureThreshold || 10;
        this.state = {};
    }

    isOpen(url: string) {
        if (!this.active) {
            return false;
        };

        const id = parseBackendId(url);
        return this.evaluate(id) === OPEN;
    }

    record(url: string, status: number) {
        if (!this.active) {
            return false;
        };

        const id = parseBackendId(url);
        if (status >= 500) {
            this.recordFailure(id);
        } else {
            this.recordSuccess(id);
        };

        this.evaluate(id);
    }

    private evaluate(id: string): CircutState {
        const now = new Date().getTime();
        const backend = this.getOrCreateBackend(id);
        const { openedAt, state } = backend;
        if (state === OPEN && openedAt && (now - this.openMilliseconds) < openedAt) {
            return OPEN;
        };


        const failures = this.filterFailures(backend, now);
        const shouldOpen = failures.length >= this.failureThreshold;
        const nextState = (state === OPEN) ?
            HALF_OPEN :
            (shouldOpen) ? OPEN : CLOSED;

        this.state[id] = {
            ...backend,
            state: nextState,
            openedAt: (nextState === OPEN) ? now : undefined,
            failures
        }

        return this.state[id].state
    }

    private recordFailure(id: string) {
        const now = new Date().getTime();
        const backend = this.getOrCreateBackend(id);
        const state = (backend.state === HALF_OPEN) ? OPEN : backend.state;
        const openedAt = (backend.state === HALF_OPEN) ? now : backend.openedAt;

        this.state[id] = {
            ...backend,
            failures: [...backend.failures, now],
            openedAt,
            state
        }
    }

    private recordSuccess(id: string) {
        const backend = this.getOrCreateBackend(id);
        this.state[id] = {
            ...backend,
            failures: []
        }
    }

    private getOrCreateBackend(id: string): BackendHealth {
        const backend = this.state[id]
        if (backend) {
            return backend;
        };

        this.state[id] = newBackend(id);
        return this.state[id];
    }

    private filterFailures(backend: BackendHealth, now: number): Array<number> {
        const timespanBoundry = now - this.timespanMilliseconds;
        return backend.failures.filter((timestamp: number): boolean => timestamp > timespanBoundry);
    }
}

export function parseBackendId(urlStr: string): string {
    const domain = parseDomain(urlStr);
    return (domain || "") + parseUrlRoute(urlStr, domain)
}

function parseUrlRoute(url: string, domain: Optional<string>): string {
    const path = parsePath(url, domain)
    return path.split("/").slice(0, 3).join("/");
}

function parsePath(url: string, domain: Optional<string>): string {
    if (!domain) {
        return url;
    }

    const urlSplit = url.split(domain);
    return (urlSplit.length >= 2) ?
        urlSplit[1] :
        urlSplit[0];
}

const SCHEME_AND_DOMAIN_PATTERN = "^(?:https?:)?(?:\/\/)?([^\/\?]+)";

function parseDomain(url: string): Optional<string> {
    const matches = url.match(SCHEME_AND_DOMAIN_PATTERN);
    if (!matches || matches.length < 0) {
        return undefined;
    }

    const schemeAndDomain = matches[0].split("://");
    return (schemeAndDomain.length >= 2) ?
        schemeAndDomain[1] :
        schemeAndDomain[0]
}

function newBackend(id: string): BackendHealth {
    return {
        id,
        state: CLOSED,
        failures: []
    }
}
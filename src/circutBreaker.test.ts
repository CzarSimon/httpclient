import waitForExpect from 'wait-for-expect';
import CircutBreaker, { parseBackendId } from "./circutBreaker";
import { SERVICE_UNAVAILABLE } from './constants';

test('Test CircutBreaker.isOpen not active', () => {
    const circutBreaker = new CircutBreaker({
        active: false
    });

    const url = "https://mydomain.com/api/service/v1/resource";
    for (let i = 0; i < 20; i++) {
        expect(circutBreaker.isOpen(url)).toBe(false);
        circutBreaker.record(url, SERVICE_UNAVAILABLE);
    };
});

test('Test CircutBreaker state machine of active breaker with half open trip', async () => {
    const openMilliseconds = 200;
    const cb = new CircutBreaker({
        active: true,
        failureThreshold: 2,
        openMilliseconds
    });

    const url1 = "https://mydomain.com/api/serviceOne/v1/resource";
    const url2 = "https://mydomain.com/api/serviceTwo/v1/resource";
    expect(cb.isOpen(url1)).toBe(false);

    cb.record(url1, 500); // First fail
    expect(cb.isOpen(url1)).toBe(false);

    cb.record(url1, 200); // Success
    expect(cb.isOpen(url1)).toBe(false);

    cb.record(url1, 501); // Second fail
    expect(cb.isOpen(url1)).toBe(false);

    cb.record(url1, 502); // Third fail
    expect(cb.isOpen(url1)).toBe(true);
    expect(cb.isOpen(url2)).toBe(false);
    expect(cb.isOpen(url1)).toBe(true);

    let stateHalfOpenIsOpen = true;
    let stateHalfOpenFailNextStateIsOpen = false;
    setTimeout(() => {
        stateHalfOpenIsOpen = cb.isOpen(url1);

        cb.record(url1, 502);
        stateHalfOpenFailNextStateIsOpen = cb.isOpen(url1)
    }, openMilliseconds + 50);

    await waitForExpect(() => {
        expect(stateHalfOpenIsOpen).toEqual(false);
    });

    await waitForExpect(() => {
        expect(stateHalfOpenFailNextStateIsOpen).toEqual(true);
    });
});

test('Test CircutBreaker state machine of active breaker normal flow', async () => {
    const openMilliseconds = 200;
    const cb = new CircutBreaker({
        active: true,
        failureThreshold: 2,
        openMilliseconds
    });

    const url = "https://mydomain.com/api/serviceOne/v1/resource";
    expect(cb.isOpen(url)).toBe(false);
    cb.record(url, 504);
    expect(cb.isOpen(url)).toBe(false);
    cb.record(url, 505);
    expect(cb.isOpen(url)).toBe(true);

    let stateHalfOpenIsOpen = true;
    let stateHalfOpenSuccessNextStateIsOpen = true;
    setTimeout(() => {
        stateHalfOpenIsOpen = cb.isOpen(url);

        cb.record(url, 400);
        stateHalfOpenSuccessNextStateIsOpen = cb.isOpen(url)
    }, openMilliseconds + 50);

    await waitForExpect(() => {
        expect(stateHalfOpenIsOpen).toEqual(false);
    });

    await waitForExpect(() => {
        expect(stateHalfOpenSuccessNextStateIsOpen).toEqual(false);
    });
});

interface UrlTestCase {
    url: string
    expected: string
}

test('Test parseBackendId', () => {
    const testCases: Array<UrlTestCase> = [
        {
            url: "https://mydomain.com/api/service/v1/resource",
            expected: "mydomain.com/api/service"
        },
        {
            url: "https://mydomain.com:8080/api/service/v1/resource",
            expected: "mydomain.com:8080/api/service"
        },
        {
            url: "/api/service/v1/resource",
            expected: "/api/service"
        },
        {
            url: "/api/service",
            expected: "/api/service"
        },
        {
            url: "/someService",
            expected: "/someService"
        },
        {
            url: "http://mydomain.com/someService",
            expected: "mydomain.com/someService"
        }
    ]

    for (let tc of testCases) {
        expect(parseBackendId(tc.url)).toBe(tc.expected);
    }
});
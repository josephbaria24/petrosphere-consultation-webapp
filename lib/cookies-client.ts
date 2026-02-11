/**
 * File: lib/cookies-client.ts
 * Description: SSR-safe client-side cookie management utility.
 * bypasses issues with external libraries in Turbopack/Next.js SSR.
 */

export const getClientCookie = (name: string): string | undefined => {
    if (typeof document === 'undefined') return undefined;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop()?.split(';').shift();
    }
    return undefined;
};

export const setClientCookie = (
    name: string,
    value: string,
    options?: { expires?: number; path?: string; sameSite?: 'Strict' | 'Lax' | 'None'; secure?: boolean }
) => {
    if (typeof document === 'undefined') return;

    const { expires, path = '/', sameSite = 'Strict', secure = false } = options || {};

    let cookieString = `${name}=${value}`;

    if (expires) {
        const date = new Date();
        date.setTime(date.getTime() + (expires * 24 * 60 * 60 * 1000));
        cookieString += `; expires=${date.toUTCString()}`;
    }

    cookieString += `; path=${path}`;
    cookieString += `; SameSite=${sameSite}`;
    if (secure) cookieString += '; Secure';

    document.cookie = cookieString;
};

export const removeClientCookie = (name: string, options?: { path?: string }) => {
    setClientCookie(name, '', { ...options, expires: -1 });
};

export const Cookies = {
    get: getClientCookie,
    set: (name: string, value: string, options?: any) => {
        // Adapter for js-cookie style calls
        const days = typeof options?.expires === 'number' ? options.expires : undefined;
        setClientCookie(name, value, {
            expires: days,
            path: options?.path,
            sameSite: options?.sameSite,
            secure: options?.secure
        });
    },
    remove: removeClientCookie
};

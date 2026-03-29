'use client';

const LARGE_PLANNER_KEYS = [
    'preferenceCourses',
    'preferenceMultipleFaculties',
    'generatedTimetableCourses',
] as const;

type LargePlannerKey = (typeof LARGE_PLANNER_KEYS)[number];

const isLargePlannerKey = (key: string): key is LargePlannerKey =>
    LARGE_PLANNER_KEYS.includes(key as LargePlannerKey);

const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const nameEQ = `${name}=`;
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(nameEQ)) {
            return decodeURIComponent(cookie.substring(nameEQ.length));
        }
    }
    return null;
};

const clearCookie = (name: string) => {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

export const getPlannerStoredValue = (key: string): string | null => {
    if (typeof window !== 'undefined' && isLargePlannerKey(key)) {
        const sessionValue = window.sessionStorage.getItem(key);
        if (sessionValue !== null) {
            return sessionValue;
        }

        const legacyLocalValue = window.localStorage.getItem(key);
        if (legacyLocalValue !== null) {
            window.sessionStorage.setItem(key, legacyLocalValue);
            window.localStorage.removeItem(key);
            return legacyLocalValue;
        }
    }

    return getCookie(key);
};

export const setPlannerStoredValue = (key: string, value: string, days = 30) => {
    if (typeof document === 'undefined') return;

    if (isLargePlannerKey(key) && typeof window !== 'undefined') {
        window.sessionStorage.setItem(key, value);
        window.localStorage.removeItem(key);
        clearCookie(key);
        return;
    }

    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${key}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/`;
};

export const removePlannerStoredValue = (key: string) => {
    if (typeof window !== 'undefined' && isLargePlannerKey(key)) {
        window.sessionStorage.removeItem(key);
        window.localStorage.removeItem(key);
    }

    clearCookie(key);
};

export const LARGE_PLANNER_STORAGE_KEYS = LARGE_PLANNER_KEYS;

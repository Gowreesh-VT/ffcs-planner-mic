'use server';

import { NextRequest, NextResponse } from 'next/server';

type RateLimitConfig = {
    key: string;
    windowMs: number;
    maxRequests: number;
    identifier?: string;
};

type RateLimitEntry = {
    count: number;
    resetAt: number;
};

declare global {
    var __ffcsRateLimitStore: Map<string, RateLimitEntry> | undefined;
}

const store = global.__ffcsRateLimitStore ?? new Map<string, RateLimitEntry>();
global.__ffcsRateLimitStore = store;

const getClientIdentifier = (req: NextRequest, overrideIdentifier?: string) => {
    if (overrideIdentifier) {
        return overrideIdentifier;
    }

    // Prefer platform-provided values when available.
    const vercelForwardedFor = req.headers.get('x-vercel-forwarded-for');
    if (vercelForwardedFor) {
        return `ip:${vercelForwardedFor.split(',')[0].trim()}`;
    }

    const forwardedFor = req.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return `ip:${forwardedFor.split(',')[0].trim()}`;
    }

    const realIp = req.headers.get('x-real-ip');
    if (realIp) {
        return `ip:${realIp.trim()}`;
    }

    // Fallback fingerprint for environments where IP headers are unavailable.
    const userAgent = req.headers.get('user-agent')?.trim();
    const acceptLanguage = req.headers.get('accept-language')?.trim();
    if (userAgent || acceptLanguage) {
        return `fp:${userAgent ?? 'unknown'}:${acceptLanguage ?? 'unknown'}`;
    }

    return 'anonymous';
};

const createRateLimitHeaders = (remaining: number, resetAt: number) => ({
    'X-RateLimit-Remaining': String(Math.max(remaining, 0)),
    'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
});

export const enforceRateLimit = (req: NextRequest, config: RateLimitConfig) => {
    const now = Date.now();
    const clientId = getClientIdentifier(req, config.identifier);
    const bucketKey = `${config.key}:${clientId}`;
    const current = store.get(bucketKey);

    if (!current || current.resetAt <= now) {
        const nextEntry = { count: 1, resetAt: now + config.windowMs };
        store.set(bucketKey, nextEntry);
        return {
            limited: false as const,
            headers: createRateLimitHeaders(config.maxRequests - 1, nextEntry.resetAt),
        };
    }

    if (current.count >= config.maxRequests) {
        return {
            limited: true as const,
            response: NextResponse.json(
                { error: 'Too many requests. Please try again shortly.' },
                {
                    status: 429,
                    headers: {
                        ...createRateLimitHeaders(0, current.resetAt),
                        'Retry-After': String(Math.max(1, Math.ceil((current.resetAt - now) / 1000))),
                    },
                }
            ),
        };
    }

    current.count += 1;
    store.set(bucketKey, current);

    return {
        limited: false as const,
        headers: createRateLimitHeaders(config.maxRequests - current.count, current.resetAt),
    };
};

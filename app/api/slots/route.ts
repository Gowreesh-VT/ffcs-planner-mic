import { NextRequest, NextResponse } from 'next/server';
import { getSlotViewPayload } from '@/lib/slot-view';
import { enforceRateLimit } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
    const rateLimit = enforceRateLimit(req, {
        key: 'slot-view',
        windowMs: 60_000,
        maxRequests: 60,
    });

    if (rateLimit.limited) {
        return rateLimit.response;
    }

    return NextResponse.json(getSlotViewPayload(), {
        headers: rateLimit.headers,
    });
}

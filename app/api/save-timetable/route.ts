import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Timetable from '@/models/timetable';
import { generateShareId } from '@/lib/shareIDgenerate';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import { validateTimetableCreateBody } from '@/lib/timetableValidation';
import { enforceRateLimit } from '@/lib/rateLimit';

// Prevent Next.js from caching this route
export const dynamic = 'force-dynamic';

const MAX_SHARE_ID_GENERATION_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized - no session' }, { status: 401 });
        }

        const rateLimit = enforceRateLimit(req, {
            key: 'save-timetable',
            windowMs: 60_000,
            maxRequests: 30,
            identifier: `user:${session.user.email.trim().toLowerCase()}`,
        });

        if (rateLimit.limited) {
            return rateLimit.response;
        }

        const body = await req.json();
        const { title, slots, owner, isPublic } = validateTimetableCreateBody(body);

        if (session.user.email.trim() !== owner) {
            return NextResponse.json({ error: 'Unauthorized - email mismatch' }, { status: 401 });
        }

        await dbConnect();

        // Prevent duplicate timetable names for the same user
        const existingTimetable = await Timetable.findOne({ owner, title });
        if (existingTimetable) {
            return NextResponse.json({ error: 'A timetable with this title already exists' }, { status: 409 });
        }

        let timetable;
        if (!isPublic) {
            timetable = await Timetable.create({
                title,
                slots,
                owner,
                isPublic,
            });
        } else {
            let attempts = 0;
            while (attempts < MAX_SHARE_ID_GENERATION_ATTEMPTS) {
                attempts += 1;
                const shareId = generateShareId();
                try {
                    timetable = await Timetable.create({
                        title,
                        slots,
                        owner,
                        isPublic,
                        shareId,
                    });
                    break;
                } catch (err: unknown) {
                    const maybeMongoError = err as { code?: number; keyPattern?: Record<string, number> };
                    if (maybeMongoError?.code === 11000 && maybeMongoError?.keyPattern?.shareId) {
                        continue;
                    }
                    throw err;
                }
            }

            if (!timetable) {
                return NextResponse.json({ error: 'Failed to generate a unique share link. Please try again.' }, { status: 503 });
            }
        }

        return NextResponse.json({ success: true, timetable }, { headers: rateLimit.headers });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to save timetable';
        const maybeMongoError = err as { code?: number; keyPattern?: Record<string, number> };
        if (maybeMongoError?.code === 11000) {
            if (maybeMongoError?.keyPattern?.shareId) {
                return NextResponse.json({ error: 'Failed to generate a unique share link. Please try again.' }, { status: 503 });
            }
            return NextResponse.json({ error: 'A timetable with this title already exists' }, { status: 409 });
        }
        console.error('[save-timetable] UNHANDLED ERROR:', message);
        if (err instanceof Error && err.stack) {
            console.error('[save-timetable] Stack:', err.stack);
        }
        const status = message.includes('must be') || message.includes('Too many') || message.includes('too long') ? 400 : 500;
        return NextResponse.json({ error: status === 400 ? message : 'Failed to save timetable' }, { status });
    }
}

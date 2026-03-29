import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import dbConnect from '@/lib/db';
import Timetable from '@/models/timetable';
import { generateShareId } from '@/lib/shareIDgenerate';
import mongoose from 'mongoose';
import { validateTimetableUpdateBody } from '@/lib/timetableValidation';
import { enforceRateLimit } from '@/lib/rateLimit';
import { resolveUniqueTimetableTitle } from '@/lib/timetableTitle';

export const dynamic = 'force-dynamic';

const MAX_SHARE_ID_GENERATION_ATTEMPTS = 5;

const NO_STORE_HEADERS = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
};

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rateLimit = enforceRateLimit(req, {
            key: 'timetable-delete',
            windowMs: 60_000,
            maxRequests: 30,
            identifier: `user:${session.user.email.trim().toLowerCase()}`,
        });

        if (rateLimit.limited) {
            return rateLimit.response;
        }

        await dbConnect();
        const { id } = await params;
        if (!mongoose.isValidObjectId(id)) {
            return NextResponse.json({ error: 'Invalid timetable id' }, { status: 400 });
        }

        const timetable = await Timetable.findById(id);

        if (!timetable) {
            return NextResponse.json({ error: 'Timetable not found' }, { status: 404 });
        }

        if (timetable.owner !== session.user.email) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await Timetable.findByIdAndDelete(id);

        return NextResponse.json({ success: true }, { headers: rateLimit.headers });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to delete';
        console.error('[timetables/DELETE] Error:', message);
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rateLimit = enforceRateLimit(req, {
            key: 'timetable-patch',
            windowMs: 60_000,
            maxRequests: 60,
            identifier: `user:${session.user.email.trim().toLowerCase()}`,
        });

        if (rateLimit.limited) {
            return rateLimit.response;
        }

        await dbConnect();
        const { id } = await params;
        if (!mongoose.isValidObjectId(id)) {
            return NextResponse.json({ error: 'Invalid timetable id' }, { status: 400 });
        }
        const body = await req.json();
        const update: Record<string, unknown> = { ...validateTimetableUpdateBody(body) };

        const timetable = await Timetable.findById(id);

        if (!timetable) {
            return NextResponse.json({ error: 'Timetable not found' }, { status: 404 });
        }

        if (timetable.owner !== session.user.email) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Auto-resolve duplicate timetable names on rename by appending a numeric suffix.
        if (update.title !== undefined) {
            update.title = await resolveUniqueTimetableTitle({
                owner: session.user.email,
                requestedTitle: String(update.title),
                excludeId: id,
            });
        }

        const shouldGenerateShareId = update.isPublic === true && !timetable.shareId;

        if (!shouldGenerateShareId) {
            const updatedTimetable = await Timetable.findByIdAndUpdate(id, update, {
                returnDocument: 'after',
                runValidators: true,
            });
            return NextResponse.json({ success: true, timetable: updatedTimetable }, { headers: rateLimit.headers });
        } else {
            let attempts = 0;
            let updated = false;
            let updatedTimetable = null;

            while (attempts < MAX_SHARE_ID_GENERATION_ATTEMPTS && !updated) {
                attempts += 1;
                const candidateShareId = generateShareId();

                try {
                    updatedTimetable = await Timetable.findByIdAndUpdate(
                        id,
                        {
                            ...update,
                            shareId: candidateShareId,
                        },
                        {
                            returnDocument: 'after',
                            runValidators: true,
                        }
                    );
                    updated = true;
                } catch (err: unknown) {
                    const maybeMongoError = err as { code?: number; keyPattern?: Record<string, number> };
                    if (maybeMongoError?.code === 11000 && maybeMongoError?.keyPattern?.shareId) {
                        continue;
                    }
                    throw err;
                }
            }

            if (!updated) {
                return NextResponse.json({ error: 'Failed to generate a unique share link. Please try again.' }, { status: 503 });
            }

            return NextResponse.json({ success: true, timetable: updatedTimetable }, { headers: rateLimit.headers });
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update';
        const maybeMongoError = err as { code?: number; keyPattern?: Record<string, number> };
        if (maybeMongoError?.code === 11000) {
            if (maybeMongoError?.keyPattern?.shareId) {
                return NextResponse.json({ error: 'Failed to generate a unique share link. Please try again.' }, { status: 503 });
            }
            return NextResponse.json({ error: 'A timetable with this title already exists' }, { status: 409 });
        }
        console.error('[timetables/PATCH] Error:', message);
        const status = message.includes('must be') || message.includes('Too many') || message.includes('too long') ? 400 : 500;
        return NextResponse.json({ error: status === 400 ? message : 'Failed to update' }, { status });
    }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rateLimit = enforceRateLimit(req, {
            key: 'timetable-get',
            windowMs: 60_000,
            maxRequests: 120,
            identifier: `user:${session.user.email.trim().toLowerCase()}`,
        });

        if (rateLimit.limited) {
            return rateLimit.response;
        }

        await dbConnect();
        const { id } = await params;
        if (!mongoose.isValidObjectId(id)) {
            return NextResponse.json({ error: 'Invalid timetable id' }, { status: 400 });
        }

        const timetable = await Timetable.findById(id).lean();

        if (!timetable) {
            return NextResponse.json({ error: 'Timetable not found' }, { status: 404 });
        }

        if (timetable.owner !== session.user.email) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(timetable, { status: 200, headers: { ...NO_STORE_HEADERS, ...rateLimit.headers } });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch timetable';
        console.error('[timetables/GET] Error:', message);
        return NextResponse.json({ error: 'Failed to fetch timetable' }, { status: 500 });
    }
}

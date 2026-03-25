import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/authOptions';
import dbConnect from '@/lib/db';
import Timetable from '@/models/timetable';

export const dynamic = 'force-dynamic';

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

        await dbConnect();
        const { id } = await params;

        const timetable = await Timetable.findById(id);

        if (!timetable) {
            return NextResponse.json({ error: 'Timetable not found' }, { status: 404 });
        }

        if (timetable.owner !== session.user.email) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await Timetable.findByIdAndDelete(id);

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[timetables/DELETE] Error:', err?.message || err);
        return NextResponse.json({ error: 'Failed to delete', detail: err?.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const { id } = await params;
        const body = await req.json();

        const update: Record<string, unknown> = {};
        if (body.title !== undefined) update.title = body.title;
        if (body.isPublic !== undefined) update.isPublic = body.isPublic;
        if (body.slots !== undefined) update.slots = body.slots;

        const timetable = await Timetable.findById(id);

        if (!timetable) {
            return NextResponse.json({ error: 'Timetable not found' }, { status: 404 });
        }

        if (timetable.owner !== session.user.email) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Prevent duplicate timetable names for the same user upon rename
        if (body.title !== undefined) {
             const existingTimetable = await Timetable.findOne({ owner: session.user.email, title: body.title.trim(), _id: { $ne: id } });
             if (existingTimetable) {
                  return NextResponse.json({ error: 'A timetable with this title already exists' }, { status: 409 });
             }
        }

        await Timetable.findByIdAndUpdate(id, update);

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[timetables/PATCH] Error:', err?.message || err);
        return NextResponse.json({ error: 'Failed to update', detail: err?.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const { id } = await params;

        const timetable = await Timetable.findById(id).lean();

        if (!timetable) {
            return NextResponse.json({ error: 'Timetable not found' }, { status: 404 });
        }

        if (timetable.owner !== session.user.email) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(timetable, { status: 200, headers: NO_STORE_HEADERS });
    } catch (err: any) {
        console.error('[timetables/GET] Error:', err?.message || err);
        return NextResponse.json({ error: 'Failed to fetch timetable', detail: err?.message }, { status: 500 });
    }
}

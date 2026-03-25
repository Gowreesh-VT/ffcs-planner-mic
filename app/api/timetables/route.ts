import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';
import dbConnect from '@/lib/db';
import Timetable from '@/models/timetable';

// Prevent Next.js from caching this route
export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
};

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const owner = searchParams.get('owner');

        if (!owner) {
            return NextResponse.json({ error: 'Missing owner' }, { status: 400 });
        }
        if (owner !== session.user.email) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await dbConnect();

        const timetables = await Timetable.find({ owner })
            .sort({ createdAt: -1 })
            .lean();
        return NextResponse.json(timetables, { headers: NO_STORE_HEADERS });
    } catch (err: any) {
        console.error('[timetables/list] Error:', err?.message || err);
        return NextResponse.json({ error: 'Failed to fetch', detail: err?.message }, { status: 500 });
    }
}


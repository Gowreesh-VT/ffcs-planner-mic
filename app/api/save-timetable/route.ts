import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Timetable from '@/models/timetable';
import { generateShareId } from '@/lib/shareIDgenerate';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/authOptions';

// Prevent Next.js from caching this route
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const body = await req.json();
        const { title, slots, owner, isPublic } = body;

        console.log('[save-timetable] session email:', session?.user?.email, '| owner:', owner);

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized - no session' }, { status: 401 });
        }
        if (session.user.email !== owner) {
            return NextResponse.json({ error: 'Unauthorized - email mismatch' }, { status: 401 });
        }
        if (!title || !slots || !owner) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        await dbConnect();

        // Prevent duplicate timetable names for the same user
        const existingTimetable = await Timetable.findOne({ owner, title: title.trim() });
        if (existingTimetable) {
            return NextResponse.json({ error: 'A timetable with this title already exists' }, { status: 409 });
        }

        let shareId: string;
        let exists = true;
        do {
            shareId = generateShareId();
            exists = !!(await Timetable.exists({ shareId }));
        } while (exists);

        const timetable = await Timetable.create({
            title,
            slots,
            owner,
            isPublic: isPublic ?? false,
            shareId,
        });
        return NextResponse.json({ success: true, timetable });
    } catch (err: any) {
        console.error('[save-timetable] UNHANDLED ERROR:', err?.message || err);
        console.error('[save-timetable] Stack:', err?.stack);
        return NextResponse.json({ error: 'Failed to save timetable', detail: err?.message }, { status: 500 });
    }
}

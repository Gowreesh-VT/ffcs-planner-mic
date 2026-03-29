import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Course from '@/models/course';
import { enforceRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const ALLOWED_SCHOOLS = new Set([
    'SCHEME',
    'SCHEME_F',
    'SCOPE',
    'SCOPE_F',
    'SCORE',
    'SCORE_F',
    'SELECT',
    'SELECT_F',
    'SENSE',
    'SENSE_F',
    'SHINE',
    'SHINE_F',
    'SMEC',
    'SMEC_F',
    'SBST',
    'SBST_F',
    'SCE',
    'MTECH_SCOPE',
    'MTECH_SCORE',
]);

/**
 * GET /api/courses?q=BCSE202&school=SCOPE&limit=20
 *
 * Search for courses by courseId or courseName.
 * Results are ordered by relevance (text score) when a query is given,
 * otherwise returns the first `limit` courses.
 */
export async function GET(req: NextRequest) {
    const rateLimit = enforceRateLimit(req, {
        key: 'courses-search',
        windowMs: 60_000,
        maxRequests: 60,
    });

    if (rateLimit.limited) {
        return rateLimit.response;
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim().slice(0, 120) ?? '';
    const school = searchParams.get('school')?.trim();
    const normalizedSchool = school?.toUpperCase();
    const parsedLimit = Number.parseInt(searchParams.get('limit') ?? '20', 10);
    const limit = Number.isNaN(parsedLimit) ? 20 : Math.min(Math.max(parsedLimit, 1), 100);

    if (normalizedSchool && !ALLOWED_SCHOOLS.has(normalizedSchool)) {
        return NextResponse.json(
            { error: 'Invalid school parameter' },
            { status: 400, headers: rateLimit.headers }
        );
    }

    await dbConnect();

    const filter: Record<string, unknown> = {};

    if (q) {
        const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedQuery, 'i');
        filter.$or = [{ courseId: regex }, { courseName: regex }];
    }

    if (normalizedSchool) {
        filter.school = normalizedSchool;
    }

    const courses = await Course.find(filter)
        .select('-__v')
        .limit(limit)
        .lean();

    return NextResponse.json(
        { success: true, courses },
        { headers: rateLimit.headers }
    );
}

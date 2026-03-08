import { NextResponse } from 'next/server';
import { getSlotViewPayload } from '@/lib/slot-view';

export async function GET() {
    return NextResponse.json(getSlotViewPayload());
}

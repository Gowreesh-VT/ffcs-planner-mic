import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Feedback from '@/models/feedback';

export async function POST(req: Request) {
    try {
        await dbConnect();

        const body = await req.json();
        const { feedback, userName, email } = body;

        if (!feedback) {
            return NextResponse.json({ message: "Feedback is required" }, { status: 400 });
        }

        const newFeedback = new Feedback({
            feedback,
            userName: userName || "Anonymous",
            email: email || "No Email",
        });

        await newFeedback.save();

        return NextResponse.json({ message: "Feedback submitted successfully" }, { status: 201 });
    } catch (error) {
        console.error("Feedback error:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}

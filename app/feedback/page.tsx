"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function FeedbackPage() {
    const [feedback, setFeedback] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState("");
    const router = useRouter();
    const { data: session } = useSession();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedback.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    feedback,
                    userName: session?.user?.name,
                    email: session?.user?.email
                }),
            });

            if (res.ok) {
                setMessage("Thank you for your feedback!");
                setFeedback("");
                setTimeout(() => router.push("/"), 2000);
            } else {
                setMessage("Failed to submit feedback. Please try again.");
            }
        } catch (error) {
            setMessage("An error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FCF5E5] flex flex-col items-center py-10 px-4">
            <div className="w-full max-w-2xl bg-white rounded-[24px] shadow-[0_10px_40px_rgba(0,0,0,0.05)] overflow-hidden mt-10 border border-gray-100">
                <div className="p-8 md:p-12">
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="text-3xl font-extrabold text-black tracking-tight" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>Give Feedback</h1>
                        <button
                            onClick={() => router.push("/")}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-black font-bold cursor-pointer border-none"
                            title="Go back"
                        >
                            ✕
                        </button>
                    </div>


                    <p className="text-gray-600 mb-8 max-w-lg text-lg leading-relaxed">
                        Have a problem with the website or a suggestion for improvement? Let us know below!
                    </p>
                    <br></br>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="Describe your issue or suggestion..."
                                className="w-full h-48 p-5 rounded-2xl border-2 border-gray-100 bg-gray-50 focus:bg-white focus:border-[#aecbfa] focus:outline-none transition-all resize-none text-black text-[15px] shadow-sm"
                                required
                            />
                        </div>
                        <br></br>

                        {message && (
                            <div className={`p-4 rounded-xl font-medium text-[15px] ${message.includes("Thank you") ? "bg-[#d1fae5] text-green-900 border border-[#a7f3d0]" : "bg-red-100 text-red-800 border border-red-200"}`}>
                                {message}
                            </div>
                        )}

                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={isSubmitting || !feedback.trim()}
                                className="bg-[#aecbfa] hover:bg-[#9cbfee] text-black font-bold py-4 px-10 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-[16px] cursor-pointer border-none"
                            >
                                {isSubmitting ? "Submitting..." : "Submit Feedback"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

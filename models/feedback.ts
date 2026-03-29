import mongoose, { Document, Schema } from 'mongoose';

interface IFeedback extends Document {
    feedback: string;
    userName?: string;
    email?: string;
}

const feedbackSchema = new Schema<IFeedback>(
    {
        feedback: { type: String, required: true },
        userName: { type: String, default: "Anonymous" },
        email: { type: String, default: "No Email" },
    },
    { versionKey: false, timestamps: true }
);

const Feedback = mongoose.models.Feedback || mongoose.model<IFeedback>('Feedback', feedbackSchema, 'feedback');

export default Feedback;
export type { IFeedback };

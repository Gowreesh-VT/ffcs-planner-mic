import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
    courseId: { type: String, required: true },
    courseName: String,
    facultySlots: { type: [String] },
    facultyName: String,
    Venue: String,
});

const Course = mongoose.models.Course || mongoose.model('Course', courseSchema);

export default Course;

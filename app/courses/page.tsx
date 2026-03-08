'use client';

/**
 * COURSES PAGE — Step 2 in timetable creation flow
 *
 * Flow: Landing → Login → Create New → Preferences → **Courses** → Timetable → Saved
 *
 * PURPOSE:
 * Displays the user's selected courses in a table format and allows modifications:
 *   - View selected courses (No, Course Code, Course Name, Slot)
 *   - Remove individual courses
 *   - Remove all courses
 *   - Toggle "All subjects mode"
 *   - Navigate to timetable generation
 *
 * DATABASE INTERACTIONS:
 * - No direct DB reads/writes on this page
 * - All data is passed from the Preferences page via context/state
 *
 * DATA FLOW:
 * - Input: fullCourseData[] from Preferences page
 * - Processing: User modifies course list (add/remove)
 * - Output: Calls generateTT() from lib/utils.ts to produce timetableDisplayData[][]
 * - Stores result in TimetableContext (lib/TimeTableContext.tsx)
 * - Navigates to /timetable
 *
 * KEY FUNCTIONS:
 * - lib/utils.ts → generateTT(courseData) generates all valid timetable combinations
 * - lib/globalCourses.ts → setGlobalCourses() stores courses for PDF export
 * - lib/TimeTableContext.tsx → setTimetableData() stores generated combinations
 *
 * RELATED FILES:
 * - lib/type.ts → fullCourseData, timetableDisplayData types
 * - lib/utils.ts → generateTT() algorithm
 * - lib/globalCourses.ts → global course storage for export
 * - lib/TimeTableContext.tsx → context for passing data to timetable page
 * - lib/slots.ts → slot clash detection
 */

export default function CoursesPage() {
    // TODO: Implement courses UI
    // - Display selected courses table (No, Course Code, Course Name, Slot)
    // - Add share/remove buttons per course
    // - Add "Remove all" button
    // - Add "All subjects mode" toggle
    //
    // On "Next" / navigate to timetable:
    //   const { result, clashes } = generateTT(selectedCourses);
    //   setGlobalCourses(selectedCourses);
    //   setTimetableData(result);
    //   router.push('/timetable');

    return (
        <div className="min-h-screen bg-cream font-sans flex flex-col items-center">
            {/* TODO: Implement course list UI */}
            {/* This page shows selected courses and allows modification before timetable generation */}
        </div>
    );
}

'use client';

/**
 * TIMETABLE PAGE — Step 3 in timetable creation flow
 *
 * Flow: Landing → Login → Create New → Preferences → Courses → **Timetable** → Saved
 *
 * PURPOSE:
 * Displays generated timetable combinations in a visual grid format:
 *   - Timetable grid with theory hours and lab hours
 *   - Multiple timetable options (pagination: « 1 2 3 4 »)
 *   - Share button → calls /api/timetables to make public and copy link
 *   - Download button → exports timetable as PDF
 *   - Save button → calls /api/save-timetable to persist to MongoDB
 *
 * DATABASE INTERACTIONS:
 * - SAVE: POST /api/save-timetable
 *     Body: { title, slots, owner, isPublic }
 *     Creates a new Timetable document in MongoDB with:
 *       - title: user-provided name
 *       - owner: session.user.email
 *       - slots: timetableDisplayData[] (courseCode, courseName, slotName, facultyName)
 *       - shareId: auto-generated unique 6-char ID
 *       - isPublic: boolean (default false)
 *
 * - SHARE: PATCH /api/timetables/[id]
 *     Body: { isPublic: true }
 *     Then GET /api/timetables/[id] to get shareId
 *     Copies share URL to clipboard
 *
 * DATA FLOW:
 * - Input: timetableDisplayData[][] from TimetableContext
 * - Each sub-array is one valid timetable combination
 * - User browses through combinations with pagination
 * - Selected combination can be saved/shared/downloaded
 *
 * API ENDPOINTS USED:
 * - POST /api/save-timetable → Save to MongoDB (models/timetable.ts)
 * - PATCH /api/timetables/[id] → Toggle public visibility
 * - GET /api/timetables/[id] → Fetch shareId after saving
 *
 * KEY FUNCTIONS:
 * - lib/TimeTableContext.tsx → useTimetable() to read generated data
 * - lib/exportToPDF.ts → exportToPDF() for download
 * - lib/slots.ts → getSlot() for grid rendering
 * - lib/globalCourses.ts → getGlobalCourses() for PDF export data
 *
 * RELATED FILES:
 * - models/timetable.ts → Timetable schema (what gets saved to DB)
 * - lib/type.ts → timetableDisplayData type
 * - lib/slots.ts → slot grid positions
 * - lib/exportToPDF.ts → PDF generation
 * - app/api/save-timetable/route.ts → POST handler
 */

export default function TimetablePage() {
    // TODO: Implement timetable display UI
    //
    // Reading data from context:
    //   const { timetableData } = useTimetable();
    //   const [currentIndex, setCurrentIndex] = useState(0);
    //   const currentTT = timetableData?.[currentIndex];
    //
    // Saving to DB:
    //   async function handleSave(title: string) {
    //     await axios.post('/api/save-timetable', {
    //       title,
    //       slots: currentTT.map(s => ({
    //         slot: s.slotName,
    //         courseCode: s.courseCode,
    //         courseName: s.courseName,
    //         facultyName: s.facultyName,
    //       })),
    //       owner: session.user.email,
    //       isPublic: false,
    //     });
    //   }
    //
    // Sharing:
    //   async function handleShare() {
    //     // 1. Save first if not saved
    //     // 2. PATCH /api/timetables/[id] { isPublic: true }
    //     // 3. GET /api/timetables/[id] to get shareId
    //     // 4. Copy URL to clipboard
    //   }
    //
    // Downloading:
    //   async function handleDownload() {
    //     await exportToPDF();
    //   }

    return (
        <div className="min-h-screen bg-cream font-sans flex flex-col items-center">
            {/* TODO: Implement timetable grid display */}
            {/* This page shows generated timetable combinations with Share/Download/Save actions */}
        </div>
    );
}

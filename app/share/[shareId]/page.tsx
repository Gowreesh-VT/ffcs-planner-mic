'use client';

/**
 * SHARE PAGE — Public timetable view
 *
 * Flow: Someone receives a share link → opens /share/[shareId] → sees timetable
 *
 * PURPOSE:
 * Displays a shared timetable to anyone (no auth required):
 *   - If timetable isPublic: shows full timetable grid + selected courses
 *   - If timetable is private: shows only the title with a "private" message
 *
 * DATABASE INTERACTIONS:
 * - GET /api/shared-timetable/[shareId]
 *     Response (public): { success: true, timetable: { title, slots[], owner, shareId } }
 *     Response (private): { success: false, message: 'Timetable is private', timetable: { title } }
 *
 * DATA FLOW:
 * - Input: shareId from URL params
 * - Fetches timetable data from /api/shared-timetable/[shareId]
 * - Renders timetable grid same as the timetable page (read-only, no save/edit)
 *
 * API ENDPOINTS USED:
 * - GET /api/shared-timetable/[shareId] → Fetch shared timetable (models/timetable.ts)
 *
 * RELATED FILES:
 * - models/timetable.ts → Timetable schema
 * - app/api/shared-timetable/[shareId]/route.ts → API handler
 * - lib/slots.ts → for rendering the timetable grid
 */

export default function SharePage() {
    // TODO: Implement shared timetable view
    //
    // Fetching shared timetable:
    //   const { shareId } = useParams();
    //   useEffect(() => {
    //     axios.get(`/api/shared-timetable/${shareId}`)
    //       .then(res => {
    //         if (res.data.success) {
    //           // Show full timetable
    //           setTimetable(res.data.timetable);
    //         } else {
    //           // Show "private" message
    //           setPrivateTitle(res.data.timetable.title);
    //         }
    //       });
    //   }, [shareId]);

    return (
        <div className="min-h-screen bg-cream font-sans flex flex-col items-center">
            {/* TODO: Implement shared timetable view */}
            {/* This page renders a read-only timetable for anyone with the share link */}
        </div>
    );
}

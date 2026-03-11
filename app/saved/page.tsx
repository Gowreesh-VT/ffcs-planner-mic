'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Image from 'next/image';
import { getCourseType } from '@/lib/course_codes_map';
import { fullCourseData } from '@/lib/type';
import { useTimetable } from '@/lib/TimeTableContext';
import './saved.css';

/* ── Slot → timetable grid mapping ── */
const THEORY_SLOTS: Record<string, [number, number]> = {};
const LAB_SLOTS: Record<string, [number, number]> = {};

const theoryLabels = [
    ['A1', 'F1', 'D1', 'TB1', 'TG1', '', 'A2', 'F2', 'D2', '', 'TB2', 'TG2', 'S3'],
    ['B1', 'G1', 'E1', 'TC1', 'TAA1', '', 'B2', 'G2', 'E2', '', 'TC2', 'TAA2', 'S1'],
    ['C1', 'A1', 'F1', 'TD1', 'TBB1', '', 'C2', 'A2', 'F2', '', 'TD2', 'TBB2', 'S4'],
    ['D1', 'B1', 'G1', 'TE1', 'TCC1', '', 'D2', 'B2', 'G2', '', 'TE2', 'TCC2', 'S2'],
    ['E1', 'C1', 'TA1', 'TF1', 'TDD1', 'S15', 'E2', 'C2', 'TA2', 'TF2', 'TDD2', '', ''],
];
const labLabels = [
    ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L31', 'L32', 'L33', 'L34', 'L35', 'L36', ''],
    ['L7', 'L8', 'L9', 'L10', 'L11', 'L12', 'L37', 'L38', 'L39', 'L40', 'L41', 'L42', ''],
    ['L13', 'L14', 'L15', 'L16', 'L17', 'L18', 'L43', 'L44', 'L45', 'L46', 'L47', 'L48', ''],
    ['L19', 'L20', 'L21', 'L22', 'L23', 'L24', 'L49', 'L50', 'L51', 'L52', 'L53', 'L54', ''],
    ['L25', 'L26', 'L27', 'L28', 'L29', 'L30', 'L55', 'L56', 'L57', 'L58', 'L59', 'L60', ''],
];

theoryLabels.forEach((row, r) => row.forEach((s, c) => { if (s) THEORY_SLOTS[s] = [r, c]; }));
labLabels.forEach((row, r) => row.forEach((s, c) => { if (s) LAB_SLOTS[s] = [r, c]; }));

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const THEORY_TIMES = [
    '8:00-8:50', '8:55-9:45', '9:50-10:40', '10:45-11:35', '11:40-12:30',
    '12:30-1:20', '2:00-2:50', '2:55-3:45', '3:50-4:40', '4:45-5:35',
    '5:40-6:30', '6:35-7:25', '',
];

const SLOT_COLORS = [
    '#A0C4FF', '#CAFFD0', '#E9D5FF', '#FEF08A', '#FFD6E0',
    '#BDD7FF', '#B8F0E0', '#FFDAB9', '#C4B5FD', '#A7F3D0',
];

function getSlotColor(code: string, allCodes: string[]): string {
    const unique = [...new Set(allCodes)];
    const idx = unique.indexOf(code);
    return SLOT_COLORS[idx % SLOT_COLORS.length];
}

/* ── Types ── */
interface TimetableEntry {
    _id: string;
    title: string;
    isPublic: boolean;
    shareId?: string;
    createdAt?: string;
    slots: {
        slot: string;
        courseCode: string;
        courseName: string;
        facultyName: string;
    }[];
}

async function fetchTimetablesByOwner(owner: string) {
    const res = await axios.get(`/api/timetables?owner=${encodeURIComponent(owner)}`);
    return res.data;
}

/* ── Cookie Helpers ── */
const setCookie = (name: string, value: string, days = 30) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/`;
};

const deleteCookie = (name: string) => {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

/* ── Convert Timetable to Course Preferences ── */
function convertTimetableToCoursePreferences(tt: TimetableEntry): fullCourseData[] {
    // Group slots by courseCode, courseName
    const courseMap = new Map<string, {
        courseCode: string;
        courseName: string;
        slots: Map<string, string[]>; // slotName -> facultyNames[]
    }>();

    tt.slots.forEach(entry => {
        const key = `${entry.courseCode}|||${entry.courseName}`;
        if (!courseMap.has(key)) {
            courseMap.set(key, {
                courseCode: entry.courseCode,
                courseName: entry.courseName,
                slots: new Map(),
            });
        }
        const course = courseMap.get(key)!;

        if (!course.slots.has(entry.slot)) {
            course.slots.set(entry.slot, []);
        }
        course.slots.get(entry.slot)!.push(entry.facultyName);
    });

    // Convert to fullCourseData[]
    const result: fullCourseData[] = [];
    courseMap.forEach(course => {
        const courseSlots = Array.from(course.slots.entries()).map(([slotName, faculties]) => ({
            slotName,
            slotFaculties: faculties.map(facultyName => ({ facultyName })),
        }));

        result.push({
            id: `${course.courseCode} - ${course.courseName}_${Array.from(course.slots.keys()).join('_')}`,
            courseType: getCourseType(course.courseCode),
            courseCode: course.courseCode,
            courseName: course.courseName,
            courseSlots,
        });
    });

    return result;
}

/* ── Mock timetables for UI preview when no real data ── */
const MOCK_SLOTS = [
    { slot: 'A1+A2', courseCode: 'MAT201', courseName: 'Mathematics I', facultyName: 'Faculty A' },
    { slot: 'B1+B2', courseCode: 'PHY201', courseName: 'Physics I', facultyName: 'Faculty B' },
    { slot: 'C1+C2', courseCode: 'CHE201', courseName: 'Chemistry', facultyName: 'Faculty C' },
    { slot: 'D1+D2', courseCode: 'CSE201', courseName: 'Programming', facultyName: 'Faculty D' },
    { slot: 'E1+E2', courseCode: 'ENG201', courseName: 'English', facultyName: 'Faculty E' },
    { slot: 'F1+F2', courseCode: 'ECO201', courseName: 'Economics', facultyName: 'Faculty F' },
    { slot: 'G1+G2', courseCode: 'MGT201', courseName: 'Management', facultyName: 'Faculty G' },
    { slot: 'TA1+TA2', courseCode: 'HUM201', courseName: 'Humanities', facultyName: 'Faculty H' },
    { slot: 'TB1+TB2', courseCode: 'SOC201', courseName: 'Sociology', facultyName: 'Faculty I' },
    { slot: 'TC1+TC2', courseCode: 'BIO201', courseName: 'Biology', facultyName: 'Faculty J' },
    { slot: 'L1+L2', courseCode: 'PHY201L', courseName: 'Physics Lab', facultyName: 'Faculty B' },
    { slot: 'L7+L8', courseCode: 'CHE201L', courseName: 'Chem Lab', facultyName: 'Faculty C' },
    { slot: 'L19+L20', courseCode: 'CSE201L', courseName: 'CS Lab', facultyName: 'Faculty D' },
];
const MOCK_TIMETABLES: TimetableEntry[] = [
    { _id: 'mock1', title: 'Timetable set 1', isPublic: false, createdAt: new Date('2026-02-28T17:33:00').toISOString(), slots: MOCK_SLOTS },
    { _id: 'mock2', title: 'Timetable set 2', isPublic: false, createdAt: new Date('2026-02-28T17:33:00').toISOString(), slots: MOCK_SLOTS },
    { _id: 'mock3', title: 'Timetable set 3', isPublic: false, createdAt: new Date('2026-02-28T17:33:00').toISOString(), slots: MOCK_SLOTS },
];

/* ── Main Page ── */
export default function SavedPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const userEmail = session?.user?.email;
    const { setTimetableData } = useTimetable();

    const [timetables, setTimetables] = useState<TimetableEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTT, setSelectedTT] = useState<TimetableEntry | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'view'>('list');

    /* modal states */
    const [renameOpen, setRenameOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const [toast, setToast] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    function scrollLeft() { scrollRef.current?.scrollBy({ left: -380, behavior: 'smooth' }); }
    function scrollRight() { scrollRef.current?.scrollBy({ left: 380, behavior: 'smooth' }); }

    // Clear any existing editing state when page loads
    useEffect(() => {
        deleteCookie('editingTimetableId');
        deleteCookie('editingTimetableTitle');
        setTimetableData(null); // Clear timetable context for fresh generation
    }, [setTimetableData]);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/');
        }
    }, [status, router]);

    useEffect(() => {
        if (!userEmail) return;
        async function load() {
            setLoading(true);
            try {
                const data = await fetchTimetablesByOwner(userEmail!);
                setTimetables(data);
            } catch {
                setTimetables([]);
            } finally {
                setLoading(false);
            }
        }
        void load();
    }, [userEmail]);

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    }, []);

    /* ── Handlers ── */
    function handleEdit(tt: TimetableEntry) {
        if (tt._id.startsWith('mock')) return;

        // Clear timetable context for fresh generation
        setTimetableData(null);

        // Convert timetable to course preferences format
        const coursePreferences = convertTimetableToCoursePreferences(tt);

        // Save to cookie
        setCookie('preferenceCourses', JSON.stringify(coursePreferences));

        // Store the timetable ID being edited
        setCookie('editingTimetableId', tt._id);
        setCookie('editingTimetableTitle', tt.title);

        // Navigate to courses page
        router.push('/courses');
    }

    async function handleDelete() {
        if (!selectedTT) return;
        await axios.delete(`/api/timetables/${selectedTT._id}`);
        setTimetables(prev => prev.filter(t => t._id !== selectedTT._id));
        setDeleteOpen(false);
        setSelectedTT(null);
        setViewMode('list');
        showToast('Timetable deleted successfully');
    }

    async function handleRename() {
        if (!selectedTT || !renameValue.trim()) return;
        await axios.patch(`/api/timetables/${selectedTT._id}`, { title: renameValue });
        setTimetables(prev =>
            prev.map(t => (t._id === selectedTT._id ? { ...t, title: renameValue } : t))
        );
        if (selectedTT) setSelectedTT({ ...selectedTT, title: renameValue });
        setRenameOpen(false);
        showToast('Timetable renamed');
    }

    async function handleTogglePublic() {
        if (!selectedTT) return;
        const newState = !selectedTT.isPublic;
        await axios.patch(`/api/timetables/${selectedTT._id}`, { isPublic: newState });
        setTimetables(prev =>
            prev.map(t => (t._id === selectedTT._id ? { ...t, isPublic: newState } : t))
        );
        setSelectedTT({ ...selectedTT, isPublic: newState });
        showToast(newState ? 'Timetable is now public' : 'Timetable is now private');
    }

    async function handleCopyLink() {
        if (!selectedTT) return;
        if (!selectedTT.isPublic) {
            await axios.patch(`/api/timetables/${selectedTT._id}`, { isPublic: true });
            setSelectedTT({ ...selectedTT, isPublic: true });
            setTimetables(prev =>
                prev.map(t => (t._id === selectedTT._id ? { ...t, isPublic: true } : t))
            );
        }
        const { data } = await axios.get(`/api/timetables/${selectedTT._id}`);
        const url = `${window.location.origin}/share/${data.shareId}`;
        await navigator.clipboard.writeText(url);
        showToast('Share link copied to clipboard!');
    }

    if (status === 'loading') {
        return (
            <div className="loading-screen">
                <div className="spinner spinner-lg" />
            </div>
        );
    }

    const displayTimetables = timetables.length > 0 ? timetables : MOCK_TIMETABLES;

    return (
        <div className="saved-page">
            {/* Toast */}
            {toast && (
                <div className="toast">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A7F3D0" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                    {toast}
                </div>
            )}

            {viewMode === 'list' ? (
                <>
                    {/* Main content */}
                    <div className="main-content">
                        <div className="flex items-center gap-4 mb-8">
                            <h1 className="text-4xl font-bold text-black">View Your Saved Timetable</h1>
                        </div>

                        <div className="cards-outer">
                            {loading ? (
                                <div className="spinner-center">
                                    <div className="spinner spinner-md" />
                                </div>
                            ) : (
                                <div className="cards-scroller-wrapper">
                                    {/* White background wrapping cards + arrows */}
                                    <div className="white-cards-outer">
                                        <div ref={scrollRef} className="white-cards-box">
                                            {displayTimetables.map((tt, i) => (
                                                <TimetableCard
                                                    key={tt._id}
                                                    tt={tt}
                                                    index={i}
                                                    allTimetables={displayTimetables}
                                                    onView={() => {
                                                        setSelectedTT(tt);
                                                        setViewMode('view');
                                                    }}
                                                    onEdit={() => handleEdit(tt)}
                                                    onRename={() => {
                                                        if (tt._id.startsWith('mock')) return;
                                                        setSelectedTT(tt);
                                                        setRenameValue(tt.title);
                                                        setRenameOpen(true);
                                                    }}
                                                    onDelete={() => {
                                                        if (tt._id.startsWith('mock')) return;
                                                        setSelectedTT(tt);
                                                        setDeleteOpen(true);
                                                    }}
                                                />
                                            ))}
                                        </div>

                                        {/* Scroll arrows inside white background */}
                                        <div className="arrows-row">
                                            <button onClick={scrollLeft} className="arrow-btn">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1E40AF" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
                                            </button>
                                            <button onClick={scrollRight} className="arrow-btn">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1E40AF" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom nav bar */}
                    <div className="bottom-nav">
                        <div className="user-section">
                            <div className="avatar">
                                {session?.user?.image
                                    ? <Image src={session.user.image} alt="avatar" width={36} height={36} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} unoptimized referrerPolicy="no-referrer" />
                                    : (session?.user?.name?.[0] || '?')}
                            </div>
                            <span className="user-name">{session?.user?.name || 'Guest'}</span>
                        </div>

                        <div className="step-pills">
                            {[1, 2, 3, 4].map(n => (
                                <button
                                    key={n}
                                    onClick={() => {
                                        if (n === 1) router.push('/preferences');
                                        if (n === 2) router.push('/courses');
                                        if (n === 3) router.push('/timetable');
                                        if (n === 4) router.push('/saved');
                                    }}
                                    className={n === 4 ? 'step-pill-saved' : 'step-pill'}
                                >
                                    {n === 4 ? '4. Saved' : n}
                                </button>
                            ))}
                        </div>

                        <div className="nav-btns">
                            <button onClick={() => router.push('/timetable')} className="btn-prev">Previous</button>
                            <button disabled className="btn-next" style={{ opacity: 0.4, cursor: 'not-allowed' }}>Next</button>
                        </div>
                    </div>
                </>
            ) : selectedTT ? (
                <TimetableDetailView
                    tt={selectedTT}
                    onBack={() => { setViewMode('list'); setSelectedTT(null); }}
                    onRename={() => { setRenameValue(selectedTT.title); setRenameOpen(true); }}
                    onDelete={() => setDeleteOpen(true)}
                    onCopyLink={handleCopyLink}
                    onTogglePublic={handleTogglePublic}
                    session={session}
                    router={router}
                />
            ) : null}

            {/* Rename Modal */}
            {renameOpen && (
                <div className="modal-backdrop" onClick={() => setRenameOpen(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-icon modal-icon-purple">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </div>
                        <h3 className="modal-title">Rename Timetable</h3>
                        <p className="modal-desc">Enter a new name for your timetable</p>
                        <input
                            type="text"
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            className="modal-input"
                            placeholder="Timetable name"
                            autoFocus
                            onKeyDown={e => e.key === 'Enter' && handleRename()}
                        />
                        <div className="modal-btns">
                            <button onClick={() => setRenameOpen(false)} className="modal-btn-cancel">Cancel</button>
                            <button onClick={handleRename} className="modal-btn-confirm modal-btn-purple">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteOpen && (
                <div className="modal-backdrop" onClick={() => setDeleteOpen(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-icon modal-icon-red">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                        </div>
                        <h3 className="modal-title">Delete Timetable</h3>
                        <p className="modal-desc">Are you sure you want to delete</p>
                        <p className="modal-desc-bold">&quot;{selectedTT?.title}&quot;?</p>
                        <div className="modal-btns">
                            <button onClick={() => setDeleteOpen(false)} className="modal-btn-cancel">Cancel</button>
                            <button onClick={handleDelete} className="modal-btn-confirm modal-btn-red">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Timetable Card Component ── */
function TimetableCard({
    tt,
    index,
    onView,
    onEdit,
    onRename,
    onDelete,
}: {
    tt: TimetableEntry;
    index: number;
    allTimetables: TimetableEntry[];
    onView: () => void;
    onEdit: () => void;
    onRename: () => void;
    onDelete: () => void;
}) {
    const pastelBgs = ['#FFF3C4', '#D9F5E4', '#EBD9FA', '#FFD9E8', '#D9EEF5', '#F5E8D9'];
    const bgColor = pastelBgs[index % pastelBgs.length];

    let dateLabel = '';
    if (tt.createdAt) {
        const d = new Date(tt.createdAt);
        const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
        const day = d.getDate();
        const month = d.toLocaleString('en-US', { month: 'long' });
        dateLabel = `${time} - ${day} ${month}`;
    }

    const allCodes = tt.slots.map(s => s.courseCode);
    const theoryGrid: (string | null)[][] = Array.from({ length: 5 }, () => Array(13).fill(null));
    const labGrid: (string | null)[][] = Array.from({ length: 5 }, () => Array(13).fill(null));
    tt.slots.forEach(s => {
        s.slot.split('+').forEach(p => {
            if (THEORY_SLOTS[p]) { const [r, c] = THEORY_SLOTS[p]; theoryGrid[r][c] = s.courseCode; }
            if (LAB_SLOTS[p]) { const [r, c] = LAB_SLOTS[p]; labGrid[r][c] = s.courseCode; }
        });
    });
    const gridRows: (string | null)[][] = [];
    for (let d = 0; d < 5; d++) { gridRows.push(theoryGrid[d]); gridRows.push(labGrid[d]); }

    return (
        <div className="tt-card" style={{ backgroundColor: bgColor }}>
            {/* Top icons */}
            <div className="card-icons-top">
                <button onClick={e => { e.stopPropagation(); onRename(); }} className="card-icon-btn" title="Rename">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.8">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                </button>
                <button onClick={e => { e.stopPropagation(); onDelete(); }} className="card-icon-btn card-icon-btn-delete" title="Delete">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="1.8">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                </button>
            </div>

            {/* Mini grid */}
            <div className="mini-grid">
                <div className="mini-grid-rows">
                    {gridRows.map((row, rowIdx) => (
                        <div key={rowIdx} className="mini-grid-row">
                            {row.map((cell, colIdx) => (
                                <div
                                    key={colIdx}
                                    className="mini-grid-cell"
                                    style={{ backgroundColor: cell ? getSlotColor(cell, allCodes) : 'rgba(0,0,0,0.06)' }}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Title */}
            <div>
                <h3 className="card-title">{tt.title}</h3>
                <p className="card-subtitle">Generated on</p>
                {dateLabel && <p className="card-date">{dateLabel}</p>}
            </div>

            {/* Buttons */}
            <div className="card-btns">
                <button onClick={e => { e.stopPropagation(); onView(); }} className="card-btn">View</button>
                <button onClick={e => { e.stopPropagation(); onEdit(); }} className="card-btn">Edit</button>
            </div>
        </div>
    );
}

/* ── Detail View Component ── */
function TimetableDetailView({
    tt,
    onBack,
    onDelete,
    onCopyLink,
    session,
    router,
}: {
    tt: TimetableEntry;
    onBack: () => void;
    onRename: () => void;
    onDelete: () => void;
    onCopyLink: () => void;
    onTogglePublic: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router: any;
}) {
    const allCodes = tt.slots.map(s => s.courseCode);

    type CellData = { code: string; courseName: string; facultyName: string; slot: string } | null;
    const theoryGrid: CellData[][] = Array.from({ length: 5 }, () => Array(13).fill(null));
    const labGrid: CellData[][] = Array.from({ length: 5 }, () => Array(13).fill(null));

    tt.slots.forEach(s => {
        s.slot.split('+').forEach(p => {
            if (THEORY_SLOTS[p]) {
                const [r, c] = THEORY_SLOTS[p];
                theoryGrid[r][c] = { code: s.courseCode, courseName: s.courseName, facultyName: s.facultyName, slot: p };
            }
            if (LAB_SLOTS[p]) {
                const [r, c] = LAB_SLOTS[p];
                labGrid[r][c] = { code: s.courseCode, courseName: s.courseName, facultyName: s.facultyName, slot: p };
            }
        });
    });

    /* unique courses for Selected Courses table */
    const courseMap = new Map<string, { courseName: string; facultyName: string; slots: string[] }>();
    tt.slots.forEach(s => {
        if (!courseMap.has(s.courseCode)) {
            courseMap.set(s.courseCode, { courseName: s.courseName, facultyName: s.facultyName, slots: [] });
        }
        courseMap.get(s.courseCode)!.slots.push(s.slot);
    });
    const courses = Array.from(courseMap.entries());

    const THEORY_TIME_LABELS = [
        '8:00am-\n8:50am', '8:55am-\n9:45am', '9:50am-\n10:40am', '10:45am-\n11:35am',
        '11:40am-\n12:30pm', '12:30-\n1:20pm', '2:00pm-\n2:50pm', '2:55pm-\n3:45pm',
        '3:50pm-\n4:40pm', '4:45pm-\n5:35pm', '5:40pm-\n6:30pm', '6:35pm-\n7:25pm', '',
    ];
    const LAB_TIME_LABELS = [
        '8:00am-\n8:50am', '8:50am-\n9:40am', '9:50am-\n10:40am', '10:40am-\n11:30am',
        '11:40am-\n12:30pm', '12:30-\n1:20pm', '2:00pm-\n2:50pm', '2:50pm-\n3:40pm',
        '3:50pm-\n4:40pm', '4:40pm-\n5:30pm', '5:40pm-\n6:30pm', '6:30pm-\n7:20pm', '',
    ];

    return (
        <div className="dv-page">
            {/* Main scrollable content */}
            <div className="dv-content">
                {/* Title row */}
                <div className="dv-title-row">
                    <button onClick={onBack} className="dv-back-btn">←</button>
                    <h1 className="dv-title">{tt.title}</h1>
                    <div className="dv-title-actions">
                        <button onClick={onCopyLink} className="dv-icon-btn" title="Share">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                        </button>
                        <button onClick={onCopyLink} className="dv-icon-btn" title="Copy link">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                        </button>
                        <button onClick={onDelete} className="dv-icon-btn dv-icon-btn-red" title="Delete">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                        </button>
                    </div>
                </div>

                {/* Timetable grid */}
                <div className="dv-grid-box">
                    <div className="dv-grid-scroll">
                        <table className="dv-table">
                            <thead>
                                <tr>
                                    <th className="dv-th-day-header" rowSpan={2}></th>
                                    <th className="dv-th-section" colSpan={13}>Theory Hours</th>
                                    <th className="dv-th-section" colSpan={13}>Lab Hours</th>
                                </tr>
                                <tr>
                                    {THEORY_TIME_LABELS.map((t, i) => (
                                        <th key={`th-${i}`} className="dv-th-time">{t.split('\n').map((l, j) => <span key={j}>{l}<br /></span>)}</th>
                                    ))}
                                    {LAB_TIME_LABELS.map((t, i) => (
                                        <th key={`lh-${i}`} className="dv-th-time">{t.split('\n').map((l, j) => <span key={j}>{l}<br /></span>)}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {DAYS.map((day, rowIdx) => (
                                    <tr key={day}>
                                        <td className="dv-td-day">{day}</td>
                                        {/* Theory cells */}
                                        {theoryGrid[rowIdx].map((cell, colIdx) => (
                                            <td key={`t-${colIdx}`} className="dv-td">
                                                {cell ? (
                                                    <div className="dv-cell-filled" style={{ backgroundColor: getSlotColor(cell.code, allCodes) }}>
                                                        <div className="dv-cell-slot">{theoryLabels[rowIdx]?.[colIdx]}</div>
                                                        <div className="dv-cell-code">{cell.code}</div>
                                                        <div className="dv-cell-faculty">{cell.facultyName}</div>
                                                    </div>
                                                ) : (
                                                    <div className="dv-cell-empty">{theoryLabels[rowIdx]?.[colIdx]}</div>
                                                )}
                                            </td>
                                        ))}
                                        {/* Lab cells */}
                                        {labGrid[rowIdx].map((cell, colIdx) => (
                                            <td key={`l-${colIdx}`} className="dv-td">
                                                {cell ? (
                                                    <div className="dv-cell-filled" style={{ backgroundColor: getSlotColor(cell.code, allCodes) }}>
                                                        <div className="dv-cell-slot">{labLabels[rowIdx]?.[colIdx]}</div>
                                                        <div className="dv-cell-code">{cell.code}</div>
                                                        <div className="dv-cell-faculty">{cell.facultyName}</div>
                                                    </div>
                                                ) : (
                                                    <div className="dv-cell-empty">{labLabels[rowIdx]?.[colIdx]}</div>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Share / Download buttons */}
                    <div className="dv-grid-actions">
                        <button onClick={onCopyLink} className="dv-share-btn">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                            Share
                        </button>
                        <button className="dv-download-btn">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                            Download
                        </button>
                    </div>
                </div>

                {/* Selected Courses */}
                <div className="dv-courses-box">
                    <h2 className="dv-courses-title">Selected Courses</h2>
                    <table className="dv-courses-table">
                        <thead>
                            <tr>
                                <th>Slot</th>
                                <th>Course Code</th>
                                <th>Course Name</th>
                                <th>Faculty</th>
                                <th>Credit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {courses.map(([code, info]) => (
                                <tr key={code} className="dv-course-row">
                                    <td>{info.slots.join(', ')}</td>
                                    <td>{code}</td>
                                    <td>{info.courseName}</td>
                                    <td>{info.facultyName}</td>
                                    <td>3</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bottom nav — same as list view */}
            <div className="bottom-nav">
                <div className="user-section">
                    <div className="avatar">
                        {session?.user?.image
                            ? <Image src={session.user.image} alt="avatar" width={36} height={36} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} unoptimized referrerPolicy="no-referrer" />
                            : (session?.user?.name?.[0] || '?')}
                    </div>
                    <span className="user-name">{session?.user?.name || 'Guest'}</span>
                </div>
                <div className="step-pills">
                    {[1, 2, 3, 4].map(n => (
                        <button
                            key={n}
                            onClick={() => {
                                if (n === 1) router.push('/preferences');
                                if (n === 2) router.push('/courses');
                                if (n === 3) router.push('/timetable');
                                if (n === 4) router.push('/saved');
                            }}
                            className={n === 4 ? 'step-pill-saved' : 'step-pill'}
                        >
                            {n === 4 ? '4. Saved' : n}
                        </button>
                    ))}
                </div>
                <div className="nav-btns">
                    <button onClick={() => router.push('/timetable')} className="btn-prev">Previous</button>
                    <button disabled className="btn-next" style={{ opacity: 0.4, cursor: 'not-allowed' }}>Next</button>
                </div>
            </div>
        </div>
    );
}
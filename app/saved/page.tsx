'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

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

/* ── Main Page ── */
export default function SavedPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const userEmail = session?.user?.email;

    const [timetables, setTimetables] = useState<TimetableEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTT, setSelectedTT] = useState<TimetableEntry | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'view'>('list');

    /* modal states */
    const [renameOpen, setRenameOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const [toast, setToast] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/');
        }
    }, [status, router]);

    useEffect(() => {
        if (!userEmail) return;
        setLoading(true);
        fetchTimetablesByOwner(userEmail)
            .then(setTimetables)
            .catch(() => setTimetables([]))
            .finally(() => setLoading(false));
    }, [userEmail]);

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    }, []);

    /* ── Handlers ── */
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
            <div className="min-h-screen bg-cream flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-[15px] font-medium text-gray-500">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cream font-sans flex flex-col items-center pb-8 overflow-x-hidden">
            {/* Toast */}
            {toast && (
                <div className="fixed top-6 right-6 z-[100] bg-[#1a1a2e] text-white px-6 py-3 rounded-2xl shadow-2xl text-[14px] font-medium animate-[slideIn_0.3s_ease] flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A7F3D0" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                    {toast}
                </div>
            )}

            {viewMode === 'list' ? (
                /* ── LIST VIEW ── */
                <div className="w-[92%] max-w-[1200px] mt-[40px]">
                    {/* Header */}
                    <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.03)] px-12 py-10 mb-8">
                        <div className="flex items-center justify-between mb-2">
                            <button
                                onClick={() => router.push('/')}
                                className="flex items-center gap-2 text-[14px] font-semibold text-gray-500 hover:text-black transition-colors cursor-pointer bg-transparent border-none"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                                Back
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#A0C4FF] to-[#CDB4DB] flex items-center justify-center text-white font-bold text-[14px]">
                                    {session?.user?.name?.[0] || '?'}
                                </div>
                                <span className="text-[13px] font-medium text-gray-600 hidden sm:block">{session?.user?.email}</span>
                            </div>
                        </div>
                        <h1 className="text-[42px] font-black text-black tracking-tight leading-tight">
                            Saved Timetables
                        </h1>
                        <p className="text-[15px] text-gray-500 font-medium mt-1">
                            {timetables.length} timetable{timetables.length !== 1 ? 's' : ''} saved
                        </p>
                    </div>

                    {/* Timetable Cards */}
                    {loading ? (
                        <div className="flex items-center justify-center py-24">
                            <div className="w-10 h-10 border-4 border-blue-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : timetables.length === 0 ? (
                        <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.03)] px-12 py-20 text-center">
                            <div className="text-[48px] mb-4">📋</div>
                            <h2 className="text-[22px] font-bold text-black mb-2">No timetables yet</h2>
                            <p className="text-[15px] text-gray-500 mb-8">Create and save timetables to see them here.</p>
                            <button
                                onClick={() => router.push('/')}
                                className="rounded-[10px] px-8 py-3 text-[14px] font-bold text-black border-[1.5px] border-[#A0C4FF] bg-[#A0C4FF] hover:bg-[#8ab2f2] transition-colors shadow-sm cursor-pointer"
                            >
                                Go to Planner
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {timetables.map((tt, i) => (
                                <TimetableCard
                                    key={tt._id}
                                    tt={tt}
                                    index={i}
                                    allTimetables={timetables}
                                    onView={() => {
                                        setSelectedTT(tt);
                                        setViewMode('view');
                                    }}
                                    onRename={() => {
                                        setSelectedTT(tt);
                                        setRenameValue(tt.title);
                                        setRenameOpen(true);
                                    }}
                                    onDelete={() => {
                                        setSelectedTT(tt);
                                        setDeleteOpen(true);
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            ) : selectedTT ? (
                /* ── DETAIL VIEW ── */
                <TimetableDetailView
                    tt={selectedTT}
                    onBack={() => { setViewMode('list'); setSelectedTT(null); }}
                    onRename={() => { setRenameValue(selectedTT.title); setRenameOpen(true); }}
                    onDelete={() => setDeleteOpen(true)}
                    onCopyLink={handleCopyLink}
                    onTogglePublic={handleTogglePublic}
                />
            ) : null}

            {/* ── Rename Modal ── */}
            {renameOpen && (
                <Modal onClose={() => setRenameOpen(false)}>
                    <div className="text-center">
                        <div className="w-14 h-14 rounded-2xl bg-[#E9D5FF] flex items-center justify-center mx-auto mb-4">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </div>
                        <h3 className="text-[20px] font-bold text-black mb-1">Rename Timetable</h3>
                        <p className="text-[14px] text-gray-500 mb-6">Enter a new name for your timetable</p>
                        <input
                            type="text"
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border-[1.5px] border-gray-200 text-[15px] font-medium outline-none focus:border-[#7C3AED] transition-colors mb-6"
                            placeholder="Timetable name"
                            autoFocus
                            onKeyDown={e => e.key === 'Enter' && handleRename()}
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setRenameOpen(false)} className="flex-1 py-3 rounded-xl border-[1.5px] border-gray-200 text-[14px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer bg-white">Cancel</button>
                            <button onClick={handleRename} className="flex-1 py-3 rounded-xl bg-[#7C3AED] text-white text-[14px] font-semibold hover:bg-[#6D28D9] transition-colors cursor-pointer border-none">Save</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ── Delete Modal ── */}
            {deleteOpen && (
                <Modal onClose={() => setDeleteOpen(false)}>
                    <div className="text-center">
                        <div className="w-14 h-14 rounded-2xl bg-[#FFE4E6] flex items-center justify-center mx-auto mb-4">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                        </div>
                        <h3 className="text-[20px] font-bold text-black mb-1">Delete Timetable</h3>
                        <p className="text-[14px] text-gray-500 mb-2">Are you sure you want to delete</p>
                        <p className="text-[15px] font-bold text-black mb-6">&quot;{selectedTT?.title}&quot;?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteOpen(false)} className="flex-1 py-3 rounded-xl border-[1.5px] border-gray-200 text-[14px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer bg-white">Cancel</button>
                            <button onClick={handleDelete} className="flex-1 py-3 rounded-xl bg-[#E11D48] text-white text-[14px] font-semibold hover:bg-[#BE123C] transition-colors cursor-pointer border-none">Delete</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

/* ── Timetable Card Component ── */
function TimetableCard({
    tt,
    index,
    onView,
    onRename,
    onDelete,
}: {
    tt: TimetableEntry;
    index: number;
    allTimetables: TimetableEntry[];
    onView: () => void;
    onRename: () => void;
    onDelete: () => void;
}) {
    const pastelBgs = ['#EEF2FF', '#F0FDF4', '#FFF7ED', '#FDF2F8', '#ECFEFF', '#FEF9C3'];
    const pastelAccents = ['#A0C4FF', '#A7F3D0', '#FDBA74', '#F9A8D4', '#67E8F9', '#FDE047'];
    const bgColor = pastelBgs[index % pastelBgs.length];
    const accentColor = pastelAccents[index % pastelAccents.length];

    const createdDate = tt.createdAt
        ? new Date(tt.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';

    // mini preview grid
    const allCodes = tt.slots.map(s => s.courseCode);
    const grid: (string | null)[][] = Array.from({ length: 5 }, () => Array(13).fill(null));
    tt.slots.forEach(s => {
        const parts = s.slot.split('+');
        parts.forEach(p => {
            const pos = THEORY_SLOTS[p] || LAB_SLOTS[p];
            if (pos) grid[pos[0]][pos[1]] = s.courseCode;
        });
    });

    return (
        <div
            className="bg-white rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300 group cursor-pointer border border-gray-50"
            onClick={onView}
        >
            {/* Mini Timetable Preview */}
            <div className="p-4 pb-2" style={{ backgroundColor: bgColor }}>
                <div className="rounded-[14px] bg-white/70 backdrop-blur-sm p-3 border border-white/50">
                    <div className="grid grid-cols-13 gap-[2px]">
                        {grid.flat().map((cell, i) => (
                            <div
                                key={i}
                                className="h-[8px] rounded-[2px] transition-colors"
                                style={{
                                    backgroundColor: cell
                                        ? getSlotColor(cell, allCodes)
                                        : 'rgba(0,0,0,0.04)',
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Card Body */}
            <div className="px-5 pb-5 pt-3">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-[16px] font-bold text-black truncate group-hover:text-[#3B5BDB] transition-colors">
                            {tt.title}
                        </h3>
                        <p className="text-[12px] text-gray-400 font-medium mt-0.5">
                            {createdDate} · {tt.slots.length} course{tt.slots.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div
                        className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ml-2"
                        style={{ backgroundColor: accentColor }}
                    />
                </div>

                {/* Action Row */}
                <div className="flex items-center gap-2 mt-3">
                    <button
                        onClick={(e) => { e.stopPropagation(); onView(); }}
                        className="flex-1 py-2 rounded-[10px] text-[12px] font-semibold text-black bg-transparent border-[1.5px] border-gray-200 hover:border-[#A0C4FF] hover:bg-[#EEF2FF] transition-colors cursor-pointer"
                    >
                        View
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onRename(); }}
                        className="py-2 px-3 rounded-[10px] border-[1.5px] border-gray-200 hover:border-[#E9D5FF] hover:bg-[#F5F3FF] transition-colors cursor-pointer bg-transparent"
                        title="Rename"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="py-2 px-3 rounded-[10px] border-[1.5px] border-gray-200 hover:border-[#FFE4E6] hover:bg-[#FFF1F2] transition-colors cursor-pointer bg-transparent"
                        title="Delete"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Detail View Component ── */
function TimetableDetailView({
    tt,
    onBack,
    onRename,
    onDelete,
    onCopyLink,
    onTogglePublic,
}: {
    tt: TimetableEntry;
    onBack: () => void;
    onRename: () => void;
    onDelete: () => void;
    onCopyLink: () => void;
    onTogglePublic: () => void;
}) {
    const allCodes = tt.slots.map(s => s.courseCode);

    /* build the grid data */
    type CellData = { code: string; faculty: string } | null;
    const theoryGrid: CellData[][] = Array.from({ length: 5 }, () => Array(13).fill(null));
    const labGrid: CellData[][] = Array.from({ length: 5 }, () => Array(13).fill(null));

    tt.slots.forEach(s => {
        const parts = s.slot.split('+');
        parts.forEach(p => {
            if (THEORY_SLOTS[p]) {
                const [r, c] = THEORY_SLOTS[p];
                theoryGrid[r][c] = { code: s.courseCode, faculty: s.facultyName };
            }
            if (LAB_SLOTS[p]) {
                const [r, c] = LAB_SLOTS[p];
                labGrid[r][c] = { code: s.courseCode, faculty: s.facultyName };
            }
        });
    });

    /* group courses for summary */
    const courseMap = new Map<string, { courseName: string; facultyName: string; slots: string[] }>();
    tt.slots.forEach(s => {
        if (!courseMap.has(s.courseCode)) {
            courseMap.set(s.courseCode, { courseName: s.courseName, facultyName: s.facultyName, slots: [] });
        }
        courseMap.get(s.courseCode)!.slots.push(s.slot);
    });
    const courses = Array.from(courseMap.entries());

    return (
        <div className="w-[92%] max-w-[1400px] mt-[40px]">
            {/* Header Bar */}
            <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.03)] px-8 py-6 mb-6 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="w-10 h-10 rounded-xl border-[1.5px] border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer bg-white"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    </button>
                    <div>
                        <h1 className="text-[24px] font-bold text-black leading-tight">{tt.title}</h1>
                        <p className="text-[13px] text-gray-400 font-medium">
                            {tt.slots.length} course{tt.slots.length !== 1 ? 's' : ''} · Created {tt.createdAt ? new Date(tt.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onRename} className="py-2.5 px-4 rounded-xl border-[1.5px] border-gray-200 text-[13px] font-semibold text-gray-600 hover:border-[#E9D5FF] hover:bg-[#F5F3FF] transition-colors cursor-pointer bg-white flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        Rename
                    </button>
                    <button onClick={onDelete} className="py-2.5 px-4 rounded-xl border-[1.5px] border-gray-200 text-[13px] font-semibold text-gray-600 hover:border-[#FFE4E6] hover:bg-[#FFF1F2] transition-colors cursor-pointer bg-white flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                        Delete
                    </button>
                </div>
            </div>

            {/* Timetable Grid */}
            <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.03)] p-6 mb-6 overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-[11px]">
                    <thead>
                        <tr>
                            <th className="p-2 text-left text-[12px] font-bold text-gray-700 border-b-2 border-gray-100 w-[80px]"></th>
                            {THEORY_TIMES.map((t, i) => (
                                <th key={i} className="p-1.5 text-center text-[10px] font-semibold text-gray-500 border-b-2 border-gray-100" style={i === 5 ? { borderLeft: '3px solid #E5E7EB' } : {}}>
                                    {t}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {DAYS.map((day, rowIdx) => (
                            <>
                                {/* Theory row */}
                                <tr key={`theory-${day}`}>
                                    <td rowSpan={2} className="p-2 text-[12px] font-bold text-gray-700 border-b border-gray-100 align-middle">
                                        {day}
                                    </td>
                                    {theoryGrid[rowIdx].map((cell, colIdx) => {
                                        const theoryLabel = theoryLabels[rowIdx]?.[colIdx] || '';
                                        return (
                                            <td
                                                key={colIdx}
                                                className="p-1 border-b border-gray-50 text-center align-middle"
                                                style={colIdx === 5 ? { borderLeft: '3px solid #E5E7EB' } : {}}
                                            >
                                                {cell ? (
                                                    <div
                                                        className="rounded-lg px-1 py-1.5 text-[10px] font-semibold leading-tight"
                                                        style={{ backgroundColor: getSlotColor(cell.code, allCodes) }}
                                                    >
                                                        <div>{theoryLabel}</div>
                                                        <div className="text-[8px] font-medium opacity-70 mt-0.5 truncate">{cell.code}</div>
                                                    </div>
                                                ) : (
                                                    <div className="text-[9px] text-gray-300 font-medium">{theoryLabel}</div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                                {/* Lab row */}
                                <tr key={`lab-${day}`}>
                                    {labGrid[rowIdx].map((cell, colIdx) => {
                                        const labLabel = labLabels[rowIdx]?.[colIdx] || '';
                                        return (
                                            <td
                                                key={colIdx}
                                                className="p-1 border-b border-gray-100 text-center align-middle"
                                                style={colIdx === 5 ? { borderLeft: '3px solid #E5E7EB' } : {}}
                                            >
                                                {cell ? (
                                                    <div
                                                        className="rounded-lg px-1 py-1 text-[9px] font-semibold leading-tight"
                                                        style={{ backgroundColor: getSlotColor(cell.code, allCodes) }}
                                                    >
                                                        <div>{labLabel}</div>
                                                        <div className="text-[8px] font-medium opacity-70 truncate">{cell.code}</div>
                                                    </div>
                                                ) : (
                                                    <div className="text-[9px] text-gray-300 font-medium">{labLabel}</div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            </>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Bottom Section: Course Summary + Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 mb-12">
                {/* Course Summary */}
                <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.03)] p-8">
                    <h2 className="text-[18px] font-bold text-black mb-6">Selected Courses</h2>
                    <div className="space-y-3">
                        {courses.map(([code, info]) => (
                            <div key={code} className="flex items-center gap-4 py-3 px-4 rounded-2xl bg-gray-50 hover:bg-[#F8FAFC] transition-colors">
                                <div
                                    className="w-3 h-10 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: getSlotColor(code, allCodes) }}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[13px] font-bold text-black">{code}</span>
                                        <span className="text-[12px] text-gray-400">·</span>
                                        <span className="text-[12px] text-gray-500 font-medium truncate">{info.courseName}</span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[11px] text-gray-400 font-medium">{info.facultyName}</span>
                                        <span className="text-[11px] text-gray-300">|</span>
                                        <span className="text-[11px] text-gray-400 font-medium">{info.slots.join(', ')}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Share & Actions Panel */}
                <div className="flex flex-col gap-6">
                    <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.03)] p-8">
                        <h2 className="text-[16px] font-bold text-black mb-4">Sharing</h2>

                        {/* Public Toggle */}
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <p className="text-[14px] font-semibold text-gray-700">Public Access</p>
                                <p className="text-[12px] text-gray-400 mt-0.5">Allow anyone with the link to view</p>
                            </div>
                            <button
                                onClick={onTogglePublic}
                                className={`w-12 h-7 rounded-full transition-colors cursor-pointer border-none flex items-center px-0.5 ${tt.isPublic ? 'bg-[#22C55E]' : 'bg-gray-200'
                                    }`}
                            >
                                <div
                                    className={`w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${tt.isPublic ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                />
                            </button>
                        </div>

                        {/* Copy Link */}
                        <button
                            onClick={onCopyLink}
                            className="w-full py-3 rounded-xl bg-[#3B5BDB] text-white text-[14px] font-semibold hover:bg-[#364FC7] transition-colors cursor-pointer border-none flex items-center justify-center gap-2"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
                            Copy Share Link
                        </button>
                    </div>

                    <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.03)] p-8">
                        <h2 className="text-[16px] font-bold text-black mb-4">Quick Stats</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#EEF2FF] rounded-2xl p-4 text-center">
                                <p className="text-[24px] font-black text-[#3B5BDB]">{courses.length}</p>
                                <p className="text-[11px] font-semibold text-gray-500 mt-0.5">Courses</p>
                            </div>
                            <div className="bg-[#F0FDF4] rounded-2xl p-4 text-center">
                                <p className="text-[24px] font-black text-[#16A34A]">{tt.slots.length}</p>
                                <p className="text-[11px] font-semibold text-gray-500 mt-0.5">Slots</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Modal Wrapper ── */
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-[28px] shadow-2xl p-8 w-[90%] max-w-[420px] animate-[scaleIn_0.2s_ease]"
                onClick={e => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
}

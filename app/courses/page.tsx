'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { fullCourseData } from '@/lib/type';
import { getCourseType } from '@/lib/course_codes_map';
import { clashMap } from '@/lib/slots';

type FacultyEntry = {
    uid: string;
    no: number;
    courseCode: string;
    courseName: string;
    slot: string;
    facultyName: string;
};

type CourseGroup = {
    courseCode: string;
    courseName: string;
    slot: string;
    faculties: string[];
};

const setCookie = (name: string, value: string, days = 30) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/`;
};

const deleteCookie = (name: string) => {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

const getCookie = (name: string): string | null => {
    const nameEQ = `${name}=`;
    const cookies = document.cookie.split(';');

    for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.indexOf(nameEQ) === 0) {
            return decodeURIComponent(cookie.substring(nameEQ.length));
        }
    }

    return null;
};

const parseSubject = (subject: string | null) => {
    if (!subject) {
        return { courseCode: 'N/A', courseName: 'N/A' };
    }

    const [courseCode, ...nameParts] = subject.split(' - ');
    return {
        courseCode: courseCode || 'N/A',
        courseName: nameParts.join(' - ') || subject,
    };
};

const createUid = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const buildPreferenceCoursesFromRows = (rows: FacultyEntry[]): fullCourseData[] => {
    const groups: CourseGroup[] = [];

    rows.forEach((row) => {
        const existingGroup = groups.find(
            (group) =>
                group.courseCode === row.courseCode &&
                group.courseName === row.courseName &&
                group.slot === row.slot,
        );

        if (existingGroup) {
            existingGroup.faculties.push(row.facultyName);
            return;
        }

        groups.push({
            courseCode: row.courseCode,
            courseName: row.courseName,
            slot: row.slot,
            faculties: [row.facultyName],
        });
    });

    return groups.map((group) => ({
        id: `${group.courseCode} - ${group.courseName}_${group.slot}_${group.faculties.join('_')}`,
        courseType: getCourseType(group.courseCode),
        courseCode: group.courseCode,
        courseName: group.courseName,
        courseSlots: [
            {
                slotName: group.slot,
                slotFaculties: group.faculties.map((facultyName) => ({ facultyName })),
            },
        ],
    }));
};

// Detect if two slots clash
const doSlotsClash = (slot1: string, slot2: string): boolean => {
    const slots1 = slot1.split('+').map(s => s.trim());
    const slots2 = slot2.split('+').map(s => s.trim());

    for (const s1 of slots1) {
        for (const s2 of slots2) {
            if (s1 === s2) return true;
            if (clashMap[s1]?.includes(s2)) return true;
            if (clashMap[s2]?.includes(s1)) return true;
        }
    }
    return false;
};

// Find all clashing faculty UIDs
const findClashes = (faculties: FacultyEntry[]): Set<string> => {
    const clashingUids = new Set<string>();

    for (let i = 0; i < faculties.length; i++) {
        for (let j = i + 1; j < faculties.length; j++) {
            if (doSlotsClash(faculties[i].slot, faculties[j].slot)) {
                clashingUids.add(faculties[i].uid);
                clashingUids.add(faculties[j].uid);
            }
        }
    }

    return clashingUids;
};

export default function CoursesPage() {
    const router = useRouter();
    const { data: session } = useSession();

    const [allSubjectsMode, setAllSubjectsMode] = useState(false);
    const [faculties, setFaculties] = useState<FacultyEntry[]>([]);
    const [lastRemovedFaculties, setLastRemovedFaculties] = useState<FacultyEntry[] | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [rowEffects, setRowEffects] = useState<Record<string, string>>({});
    const [isReordering, setIsReordering] = useState(false);
    const [clashingUids, setClashingUids] = useState<Set<string>>(new Set());
    const [editingTimetableTitle, setEditingTimetableTitle] = useState<string | null>(null);
    const [deletedRow, setDeletedRow] = useState<{ faculty: FacultyEntry; index: number } | null>(null);

    useEffect(() => {
        try {
            const savedPreferenceCourses = getCookie('preferenceCourses');
            const savedFaculties = getCookie('preferenceMultipleFaculties');
            const savedSubject = getCookie('preferenceSubject');
            const savedSlot = getCookie('preferenceSlot');
            const savedAllSubjectsMode = getCookie('allSubjectsMode');
            const editingTitle = getCookie('editingTimetableTitle');

            if (savedAllSubjectsMode) {
                setAllSubjectsMode(JSON.parse(savedAllSubjectsMode));
            }

            if (editingTitle) {
                setEditingTimetableTitle(editingTitle);
            }

            if (savedPreferenceCourses) {
                const storedCourses = JSON.parse(savedPreferenceCourses) as fullCourseData[];
                const rows: FacultyEntry[] = [];

                storedCourses.forEach((course) => {
                    course.courseSlots.forEach((courseSlot) => {
                        courseSlot.slotFaculties.forEach((faculty) => {
                            rows.push({
                                uid: createUid(),
                                no: rows.length + 1,
                                courseCode: course.courseCode || 'N/A',
                                courseName: course.courseName || 'N/A',
                                slot: courseSlot.slotName || 'N/A',
                                facultyName: faculty.facultyName || 'N/A',
                            });
                        });
                    });
                });

                setFaculties(rows);
            } else if (savedFaculties) {
                const { courseCode, courseName } = parseSubject(savedSubject);
                const slot = savedSlot || 'N/A';
                const facultyList = JSON.parse(savedFaculties) as string[];
                const rows: FacultyEntry[] = facultyList.map((faculty, index) => ({
                    uid: createUid(),
                    no: index + 1,
                    courseCode,
                    courseName,
                    slot,
                    facultyName: faculty,
                }));
                setFaculties(rows);
            }
        } catch (error) {
            console.error('Error reading faculty cookies:', error);
        } finally {
            setLoaded(true);
        }
    }, []);

    useEffect(() => {
        if (!loaded) return;
        setCookie('allSubjectsMode', JSON.stringify(allSubjectsMode));
    }, [allSubjectsMode, loaded]);

    useEffect(() => {
        if (!loaded) return;
        const facultyNames = faculties.map((faculty) => faculty.facultyName);
        setCookie('preferenceMultipleFaculties', JSON.stringify(facultyNames));

        const updatedCourses = buildPreferenceCoursesFromRows(faculties);
        setCookie('preferenceCourses', JSON.stringify(updatedCourses));

        // Detect clashes
        setClashingUids(findClashes(faculties));
    }, [faculties, loaded]);

    useEffect(() => {
        if (!loaded) return;
        const timer = window.setTimeout(() => setIsVisible(true), 50);
        return () => window.clearTimeout(timer);
    }, [loaded]);

    const renumber = (items: FacultyEntry[]) =>
        items.map((item, index) => ({
            ...item,
            no: index + 1,
        }));

    const triggerRowEffects = (effects: Record<string, string>, duration = 500) => {
        setRowEffects((previous) => ({ ...previous, ...effects }));
        window.setTimeout(() => {
            setRowEffects((previous) => {
                const next = { ...previous };
                Object.keys(effects).forEach((uid) => {
                    delete next[uid];
                });
                return next;
            });
        }, duration);
    };

    const handleMoveUp = (index: number) => {
        if (index <= 0 || isReordering) return;
        const movingRow = faculties[index];
        const affectedRow = faculties[index - 1];
        setIsReordering(true);
        triggerRowEffects(
            {
                [movingRow.uid]: 'animate-cartoon-move-up',
                [affectedRow.uid]: 'animate-cartoon-move-down',
            },
            640,
        );

        window.setTimeout(() => {
            setFaculties((previous) => {
                const currentIndex = previous.findIndex((item) => item.uid === movingRow.uid);
                if (currentIndex <= 0) return previous;
                const next = [...previous];
                [next[currentIndex - 1], next[currentIndex]] = [next[currentIndex], next[currentIndex - 1]];
                return renumber(next);
            });
            setIsReordering(false);
        }, 360);
    };

    const handleMoveDown = (index: number) => {
        if (index >= faculties.length - 1 || isReordering) return;
        const movingRow = faculties[index];
        const affectedRow = faculties[index + 1];
        setIsReordering(true);
        triggerRowEffects(
            {
                [movingRow.uid]: 'animate-cartoon-move-down',
                [affectedRow.uid]: 'animate-cartoon-move-up',
            },
            640,
        );

        window.setTimeout(() => {
            setFaculties((previous) => {
                const currentIndex = previous.findIndex((item) => item.uid === movingRow.uid);
                if (currentIndex < 0 || currentIndex >= previous.length - 1) return previous;
                const next = [...previous];
                [next[currentIndex], next[currentIndex + 1]] = [next[currentIndex + 1], next[currentIndex]];
                return renumber(next);
            });
            setIsReordering(false);
        }, 360);
    };

    const handleRemove = (index: number) => {
        const rowToRemove = faculties[index];
        if (!rowToRemove) return;

        // Show inline undo row instead of immediately removing
        setDeletedRow({ faculty: rowToRemove, index });
        triggerRowEffects({ [rowToRemove.uid]: 'animate-dust-out' }, 820);

        window.setTimeout(() => {
            setFaculties((previous) => {
                const next = previous.filter((item) => item.uid !== rowToRemove.uid);
                return renumber(next);
            });
        }, 350);
    };

    const handleUndoSingleDelete = () => {
        if (!deletedRow) return;
        setFaculties((previous) => {
            const next = [...previous];
            next.splice(deletedRow.index, 0, deletedRow.faculty);
            return renumber(next);
        });
        setDeletedRow(null);
    };

    const handleRemoveAll = () => {
        setLastRemovedFaculties(faculties);
        setFaculties([]);
        setDeletedRow(null);
    };

    const handleUndoRemoveAll = () => {
        if (!lastRemovedFaculties || lastRemovedFaculties.length === 0) return;
        setFaculties(renumber(lastRemovedFaculties));
        setLastRemovedFaculties(null);
    };

    if (!loaded) {
        return (
            <div className="min-h-screen bg-[#F5E6D3] font-sans flex items-center justify-center">
                <div className="text-gray-700 font-semibold">Loading...</div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen bg-[#F5E6D3] font-sans flex flex-col transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            <div className="flex-1 p-8">
                

                {clashingUids.size > 0 && (
                    <div className="bg-red-100 border-2 border-red-400 rounded-lg px-6 py-4 mb-6 flex items-center gap-3 animate-lucid-fade-up">
                        <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <h3 className="text-red-800 font-bold text-lg">Slot Clash Detected!</h3>
                            <p className="text-red-700 text-sm">Some courses have overlapping time slots. Courses with clashes are highlighted in red.</p>
                        </div>
                    </div>
                )}

                {/* ── Selected Courses Card ── */}
                <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-4 animate-lucid-fade-up-delayed">
                    {/* Green header */}
                    <div className="bg-[#c6f6c6] px-6 py-4">
                        <h2 className="text-xl font-bold text-black">Selected Courses</h2>
                    </div>

                    {/* Table header */}
                    <div className="grid grid-cols-[56px_160px_1fr_140px_160px_120px] border-b border-gray-200 bg-white">
                        <div className="px-4 py-3 text-sm font-bold text-black">No</div>
                        <div className="px-4 py-3 text-sm font-bold text-black">Course Code</div>
                        <div className="px-4 py-3 text-sm font-bold text-black">Course Name</div>
                        <div className="px-4 py-3 text-sm font-bold text-black">Slot</div>
                        <div className="px-4 py-3 text-sm font-bold text-black">Faculty</div>
                        <div className="px-4 py-3 text-sm font-bold text-black"></div>
                    </div>

                    {/* Rows */}
                    {faculties.length === 0 && !lastRemovedFaculties ? (
                        <div className="px-6 py-10 text-center text-gray-400 text-sm">No courses selected yet</div>
                    ) : (
                        <div>
                            {faculties.map((faculty, index) => {
                                const hasClash = clashingUids.has(faculty.uid);
                                const isDusting = rowEffects[faculty.uid] === 'animate-dust-out';
                                // Split combined course names and slots (both/lab types use __ separator)
                                const nameParts = faculty.courseName.split('__');
                                const slotParts = faculty.slot.split('__');
                                return (
                                    <div key={faculty.uid}>
                                        <div
                                            className={`grid grid-cols-[56px_160px_1fr_140px_160px_120px] border-b border-gray-100 items-center transition-colors ${
                                                isDusting ? 'pointer-events-none' : ''
                                            } ${
                                                hasClash ? 'bg-red-50' : 'bg-white hover:bg-gray-50'
                                            } ${rowEffects[faculty.uid] || ''}`}
                                        >
                                            <div className={`px-4 py-4 text-sm font-semibold ${ hasClash ? 'text-red-600' : 'text-gray-800'}`}>{faculty.no}</div>
                                            <div className={`px-4 py-4 text-sm font-bold font-mono ${ hasClash ? 'text-red-600' : 'text-gray-900'}`}>{faculty.courseCode}</div>
                                            <div className={`px-4 py-4 text-sm ${ hasClash ? 'text-red-600' : 'text-gray-800'}`}>
                                                {nameParts.map((n, i) => <div key={i}>{n}</div>)}
                                            </div>
                                            <div className={`px-4 py-4 text-sm font-semibold ${ hasClash ? 'text-red-600' : 'text-gray-800'}`}>
                                                {slotParts.map((s, i) => <div key={i}>{s}</div>)}
                                            </div>
                                            <div className={`px-4 py-4 text-sm ${ hasClash ? 'text-red-600' : 'text-gray-600'}`}>{faculty.facultyName}</div>
                                            <div className="px-4 py-4 flex items-center gap-1">
                                                {/* Up button */}
                                                <button
                                                    onClick={() => handleMoveUp(index)}
                                                    disabled={index === 0 || isDusting || isReordering}
                                                    title="Move up"
                                                    className={`w-8 h-8 flex items-center justify-center rounded border transition-all ${
                                                        index === 0 || isDusting || isReordering
                                                            ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                                                            : 'border-gray-300 text-gray-500 hover:bg-gray-100 cursor-pointer'
                                                    }`}
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6"/></svg>
                                                </button>
                                                {/* Down button */}
                                                <button
                                                    onClick={() => handleMoveDown(index)}
                                                    disabled={index === faculties.length - 1 || isDusting || isReordering}
                                                    title="Move down"
                                                    className={`w-8 h-8 flex items-center justify-center rounded border transition-all ${
                                                        index === faculties.length - 1 || isDusting || isReordering
                                                            ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                                                            : 'border-gray-300 text-gray-500 hover:bg-gray-100 cursor-pointer'
                                                    }`}
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
                                                </button>
                                                {/* Delete button */}
                                                <button
                                                    onClick={() => handleRemove(index)}
                                                    disabled={isDusting}
                                                    title="Remove"
                                                    className={`w-8 h-8 flex items-center justify-center rounded border transition-all ${
                                                        isDusting
                                                            ? 'border-red-100 text-red-200 cursor-not-allowed'
                                                            : 'border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 cursor-pointer'
                                                    }`}
                                                >
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                                                </button>
                                            </div>
                                        </div>
                                        {/* Inline undo row shown right after deleted item position */}
                                        {deletedRow && deletedRow.index === index + 1 && (
                                            <div className="grid grid-cols-[56px_160px_1fr_140px_160px_120px] border-b border-gray-100 bg-gray-50 items-center">
                                                <div />
                                                <div className="col-span-4 px-4 py-3 text-sm text-gray-500 italic">Subject deleted.</div>
                                                <div className="px-4 py-3">
                                                    <button
                                                        onClick={handleUndoSingleDelete}
                                                        className="text-sm font-bold text-gray-800 hover:text-black transition cursor-pointer"
                                                    >Undo</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {/* Undo row at bottom when deleted row was last */}
                            {deletedRow && deletedRow.index >= faculties.length && (
                                <div className="grid grid-cols-[56px_160px_1fr_140px_160px_120px] border-b border-gray-100 bg-gray-50 items-center">
                                    <div />
                                    <div className="col-span-4 px-4 py-3 text-sm text-gray-500 italic">Subject deleted.</div>
                                    <div className="px-4 py-3">
                                        <button
                                            onClick={handleUndoSingleDelete}
                                            className="text-sm font-bold text-gray-800 hover:text-black transition cursor-pointer"
                                        >Undo</button>
                                    </div>
                                </div>
                            )}
                            {/* Remove all undo row */}
                            {faculties.length === 0 && lastRemovedFaculties && lastRemovedFaculties.length > 0 && (
                                <div className="grid grid-cols-[56px_160px_1fr_140px_160px_120px] border-b border-gray-100 bg-gray-50 items-center">
                                    <div />
                                    <div className="col-span-4 px-4 py-3 text-sm text-gray-500 italic">All courses deleted.</div>
                                    <div className="px-4 py-3">
                                        <button
                                            onClick={handleUndoRemoveAll}
                                            className="text-sm font-bold text-gray-800 hover:text-black transition cursor-pointer"
                                        >Undo</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer: Remove all */}
                    {faculties.length > 0 && (
                        <div className="px-6 py-3 border-t border-gray-100">
                            <button
                                onClick={handleRemoveAll}
                                className="text-sm font-semibold text-red-500 hover:text-red-700 transition cursor-pointer"
                            >
                                Remove all
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom nav */}
            <div className="bg-white border-t border-gray-300 py-6 px-8 shadow-lg animate-lucid-fade-up-delayed">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-3">
                        {session?.user?.image ? (
                            <img src={session.user.image} alt="User avatar" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                        ) : (
                            <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                        )}
                        <span className="text-gray-700 text-sm font-semibold">{session?.user?.name || 'Guest'}</span>
                    </div>

                    <div className="flex items-center gap-3">
                        {[1, 2, 3, 4].map((num) => (
                            <button
                                key={num}
                                onClick={() => {
                                    if (num === 1) router.push('/preferences');
                                    if (num === 2) router.push('/courses');
                                    if (num === 3) router.push('/timetable');
                                    if (num === 4) router.push('/saved');
                                }}
                                className={`px-5 py-2 rounded-lg font-semibold text-sm cursor-pointer ${
                                    num === 2 ? 'bg-[#A0C4FF] text-black' : 'bg-[#A0C4FF]/40 text-gray-700'
                                }`}
                            >
                                {num === 2 ? '2. Faculty Preferences' : num}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                deleteCookie('editingTimetableId');
                                deleteCookie('editingTimetableTitle');
                                router.push('/preferences');
                            }}
                            className="px-8 py-2.5 border-2 border-gray-400 rounded-lg font-semibold text-sm hover:bg-gray-50 text-black transition cursor-pointer"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => router.push('/timetable')}
                            className="px-10 py-2.5 rounded-lg font-semibold text-sm bg-[#A0C4FF] hover:bg-[#90B4EF] text-black transition cursor-pointer"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes lucidFadeUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes lucidRow {
                    from { opacity: 0; transform: translateX(8px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-lucid-fade-up { animation: lucidFadeUp 420ms ease-out; }
                .animate-lucid-fade-up-delayed { animation: lucidFadeUp 520ms ease-out; }
                .animate-lucid-row { animation: lucidRow 260ms ease-out; }

                @keyframes cartoonMoveUp {
                    0% { transform: translateY(0) scale(1,1); }
                    40% { transform: translateY(-8px) scale(1.02,0.98); }
                    70% { transform: translateY(2px) scale(0.995,1.005); }
                    100% { transform: translateY(0) scale(1,1); }
                }
                @keyframes cartoonMoveDown {
                    0% { transform: translateY(0) scale(1,1); }
                    40% { transform: translateY(8px) scale(1.02,0.98); }
                    70% { transform: translateY(-2px) scale(0.995,1.005); }
                    100% { transform: translateY(0) scale(1,1); }
                }
                @keyframes dustOut {
                    0% { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); }
                    55% { opacity: 0.65; transform: translateX(10px) scale(0.98); filter: blur(1px); }
                    100% { opacity: 0; transform: translateX(28px) scale(0.9); filter: blur(4px); }
                }
                .animate-cartoon-move-up { animation: cartoonMoveUp 620ms cubic-bezier(0.22,0.7,0.2,1); }
                .animate-cartoon-move-down { animation: cartoonMoveDown 620ms cubic-bezier(0.22,0.7,0.2,1); }
                .animate-dust-out { animation: dustOut 420ms steps(6,end) forwards; }
            `}</style>
        </div>
    );
}

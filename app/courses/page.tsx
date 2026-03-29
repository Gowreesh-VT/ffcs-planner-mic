'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { fullCourseData } from '@/lib/type';
import { getCourseType } from '@/lib/course_codes_map';
import { clashMap } from '@/lib/slots';
import { generateTT } from '@/lib/utils';
import { useTimetable } from '@/lib/TimeTableContext';
import { getPlannerStoredValue, setPlannerStoredValue } from '@/lib/plannerStorage';

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
    // 1. Group rows by course code (so a course only exists once)
    const coursesMap = new Map<string, {
        courseCode: string;
        courseName: string;
        slotsMap: Map<string, Set<string>>; // slotName -> set of faculty names
    }>();

    rows.forEach(row => {
        if (!coursesMap.has(row.courseCode)) {
            coursesMap.set(row.courseCode, {
                courseCode: row.courseCode,
                courseName: row.courseName, // typically identical across same course code
                slotsMap: new Map(),
            });
        }

        const courseGroup = coursesMap.get(row.courseCode)!;

        if (!courseGroup.slotsMap.has(row.slot)) {
            courseGroup.slotsMap.set(row.slot, new Set());
        }

        courseGroup.slotsMap.get(row.slot)!.add(row.facultyName);
    });

    const result: fullCourseData[] = [];

    // 2. Convert to the expected fullCourseData format
    coursesMap.forEach((course) => {
        const courseSlots = Array.from(course.slotsMap.entries()).map(([slotName, facultySet]) => ({
            slotName,
            slotFaculties: Array.from(facultySet).map(facultyName => ({ facultyName }))
        }));

        result.push({
            // Using a simpler ID or one that encompasses all slots securely
            id: `${course.courseCode}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            courseType: getCourseType(course.courseCode),
            courseCode: course.courseCode,
            courseName: course.courseName,
            courseSlots,
        });
    });

    return result;
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
    const { setTimetableData } = useTimetable();

    const [allSubjectsMode, setAllSubjectsMode] = useState(false);
    const [faculties, setFaculties] = useState<FacultyEntry[]>([]);
    const [lastRemovedFaculties, setLastRemovedFaculties] = useState<FacultyEntry[] | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [rowEffects, setRowEffects] = useState<Record<string, string>>({});
    const [isReordering, setIsReordering] = useState(false);
    const [clashingUids, setClashingUids] = useState<Set<string>>(new Set());
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    const [deletedRow, setDeletedRow] = useState<{ faculty: FacultyEntry; index: number } | null>(null);

    const visibleFaculties = useMemo(() => {
        if (allSubjectsMode) return faculties;
        const kept: FacultyEntry[] = [];
        faculties.forEach((faculty) => {
            const clashesWithKept = kept.some((existing) => doSlotsClash(existing.slot, faculty.slot));
            if (!clashesWithKept) {
                kept.push(faculty);
            }
        });
        return kept;
    }, [faculties, allSubjectsMode]);

    useEffect(() => {
        try {
            const savedPreferenceCourses = getPlannerStoredValue('preferenceCourses');
            const savedFaculties = getPlannerStoredValue('preferenceMultipleFaculties');
            const savedSubject = getCookie('preferenceSubject');
            const savedSlot = getCookie('preferenceSlot');
            const savedAllSubjectsMode = getCookie('allSubjectsMode');

            if (savedAllSubjectsMode) {
                setAllSubjectsMode(JSON.parse(savedAllSubjectsMode));
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
        setPlannerStoredValue('preferenceMultipleFaculties', JSON.stringify(facultyNames));

        const updatedCourses = buildPreferenceCoursesFromRows(faculties);
        setPlannerStoredValue('preferenceCourses', JSON.stringify(updatedCourses));
    }, [faculties, loaded]);

    useEffect(() => {
        if (!loaded) return;
        // Detect clashes only among visible rows (when prioritizing, clashes should vanish)
        setClashingUids(findClashes(visibleFaculties));
    }, [visibleFaculties, loaded]);

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

    const syncAndOpenTimetable = () => {
        const rowsForGeneration = allSubjectsMode ? faculties : visibleFaculties;
        const updatedCourses = buildPreferenceCoursesFromRows(rowsForGeneration);
        setPlannerStoredValue('generatedTimetableCourses', JSON.stringify(updatedCourses));

        const { result } = generateTT(updatedCourses);
        setTimetableData(result);
        router.push('/timetable');
    };

    if (!loaded) {
        return (
            <div className="min-h-screen bg-[#F5E6D3] font-sans flex items-center justify-center">
                <div className="text-gray-700 font-semibold">Loading...</div>
            </div>
        );
    }

    return (
        <div className={`h-screen bg-[#F5E6D3] font-sans flex flex-col overflow-hidden transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            <div className="flex-1 min-h-0 w-full flex justify-center px-4 sm:px-6 pt-6 pb-29">
                <div className="w-full max-w-6xl min-h-0 flex flex-col gap-4">
                    <h1 className="text-3xl sm:text-4xl font-bold text-black px-2 pt-2 shrink-0">Your Courses</h1>

                    {/* Selected Courses Card */}
                    <div className="w-full flex-1 min-h-0 bg-[#fcfcfc] rounded-3xl shadow-sm border border-[#eaeaea] overflow-hidden animate-lucid-fade-up-delayed flex flex-col">
                        <div className="bg-[#a9d6a9] px-6 py-4 shrink-0">
                            <h2 className="text-2xl font-bold text-[#1f1f1f]">Selected Courses</h2>
                        </div>

                        <div className="grid grid-cols-[60px_minmax(120px,1fr)_minmax(220px,1.4fr)_minmax(180px,1.2fr)_minmax(120px,1fr)_minmax(90px,120px)] border-b border-[#ededed] bg-[#fcfcfc] text-[#1f1f1f] shrink-0">
                            <div className="px-5 py-3 text-sm font-bold">No</div>
                            <div className="px-5 py-3 text-sm font-bold">Course Code</div>
                            <div className="px-5 py-3 text-sm font-bold">Course Name</div>
                            <div className="px-5 py-3 text-sm font-bold">Faculty Name</div>
                            <div className="px-5 py-3 text-sm font-bold">Slot</div>
                            <div className="px-5 py-3 text-sm font-bold text-right">Actions</div>
                        </div>

                        {visibleFaculties.length === 0 && !(lastRemovedFaculties && lastRemovedFaculties.length > 0) && !deletedRow ? (
                            <div className="flex-1 min-h-0 flex items-center justify-center px-6 py-12 text-xl text-[#1f1f1f] font-medium">
                                All subjects have been deleted.
                            </div>
                        ) : (
                            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-0">
                                {visibleFaculties.map((faculty, index) => {
                                    const hasClash = clashingUids.has(faculty.uid);
                                    const isDusting = rowEffects[faculty.uid] === 'animate-dust-out';
                                    const nameParts = faculty.courseName.split('__');
                                    const slotParts = faculty.slot.split('__');
                                    const fullIndex = faculties.findIndex((f) => f.uid === faculty.uid);
                                    return (
                                        <div key={faculty.uid}>
                                            <div
                                                className={`grid grid-cols-[60px_minmax(120px,1fr)_minmax(220px,1.4fr)_minmax(180px,1.2fr)_minmax(120px,1fr)_minmax(90px,120px)] border-b border-[#f0f0f0] items-center transition-colors ${isDusting ? 'pointer-events-none' : ''} ${hasClash ? 'bg-red-50' : 'bg-white hover:bg-[#f8f8f8]'} ${rowEffects[faculty.uid] || ''}`}
                                            >
                                                <div className={`px-5 py-4 text-sm font-semibold ${hasClash ? 'text-red-600' : 'text-[#1f1f1f]'}`}>{faculty.no}</div>
                                                <div className={`px-5 py-4 text-sm font-semibold font-mono ${hasClash ? 'text-red-600' : 'text-[#1f1f1f]'}`}>{faculty.courseCode}</div>
                                                <div className={`px-5 py-4 text-sm leading-relaxed ${hasClash ? 'text-red-600' : 'text-[#1f1f1f]'}`}>
                                                    {nameParts.map((n, i) => <div key={i}>{n}</div>)}
                                                </div>
                                                <div className={`px-5 py-4 text-sm leading-relaxed ${hasClash ? 'text-red-600' : 'text-[#1f1f1f]'}`}>
                                                    {faculty.facultyName}
                                                </div>
                                                <div className={`px-5 py-4 text-sm font-semibold ${hasClash ? 'text-red-600' : 'text-[#1f1f1f]'}`}>
                                                    {slotParts.map((s, i) => <div key={i}>{s}</div>)}
                                                </div>
                                                <div className="px-5 py-4 flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleMoveUp(fullIndex)}
                                                        disabled={fullIndex <= 0 || isDusting || isReordering}
                                                        title="Move up"
                                                        className={`w-8 h-8 flex items-center justify-center rounded border transition-all ${fullIndex <= 0 || isDusting || isReordering
                                                            ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                                                            : 'border-gray-300 text-gray-600 hover:bg-gray-100 cursor-pointer'
                                                            }`}
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6" /></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleMoveDown(fullIndex)}
                                                        disabled={fullIndex === faculties.length - 1 || isDusting || isReordering}
                                                        title="Move down"
                                                        className={`w-8 h-8 flex items-center justify-center rounded border transition-all ${fullIndex === faculties.length - 1 || isDusting || isReordering
                                                            ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                                                            : 'border-gray-300 text-gray-600 hover:bg-gray-100 cursor-pointer'
                                                            }`}
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemove(fullIndex)}
                                                        disabled={isDusting}
                                                        title="Remove"
                                                        className={`w-8 h-8 flex items-center justify-center rounded border transition-all ${isDusting
                                                            ? 'border-red-100 text-red-200 cursor-not-allowed'
                                                            : 'border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 cursor-pointer'
                                                            }`}
                                                    >
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                            {deletedRow && deletedRow.index === index + 1 && (
                                                <div className="grid grid-cols-[60px_minmax(120px,1fr)_minmax(220px,1.4fr)_minmax(180px,1.2fr)_minmax(120px,1fr)_minmax(90px,120px)] border-b border-[#f0f0f0] bg-[#fafafa] items-center">
                                                    <div />
                                                    <div className="col-span-3 px-5 py-3 text-sm text-gray-600 italic">Subject deleted.</div>
                                                    <div className="px-5 py-3 col-span-2 text-right">
                                                        <button
                                                            onClick={handleUndoSingleDelete}
                                                            className="text-sm font-bold text-[#1f1f1f] hover:text-black transition cursor-pointer"
                                                        >Undo</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {deletedRow && faculties.length === 0 && (
                                    <div className="grid grid-cols-[60px_minmax(120px,1fr)_minmax(220px,1.4fr)_minmax(180px,1.2fr)_minmax(120px,1fr)_minmax(90px,120px)] border-b border-[#f0f0f0] bg-[#fafafa] items-center">
                                        <div />
                                        <div className="col-span-3 px-5 py-3 text-sm text-gray-600 italic">Subject deleted.</div>
                                        <div className="px-5 py-3 col-span-2 text-right">
                                            <button
                                                onClick={handleUndoSingleDelete}
                                                className="text-sm font-bold text-[#1f1f1f] hover:text-black transition cursor-pointer"
                                            >Undo</button>
                                        </div>
                                    </div>
                                )}

                                {faculties.length === 0 && lastRemovedFaculties && lastRemovedFaculties.length > 0 && (
                                    <div className="grid grid-cols-[60px_minmax(120px,1fr)_minmax(220px,1.4fr)_minmax(180px,1.2fr)_minmax(120px,1fr)_minmax(90px,120px)] border-b border-[#f0f0f0] bg-[#fafafa] items-center">
                                        <div />
                                        <div className="col-span-3 px-5 py-3 text-sm text-gray-600 italic">All courses deleted.</div>
                                        <div className="px-5 py-3 col-span-2 text-right">
                                            <button
                                                onClick={handleUndoRemoveAll}
                                                className="text-sm font-bold text-[#1f1f1f] hover:text-black transition cursor-pointer"
                                            >Undo</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="px-6 py-4 flex items-center justify-between border-t border-[#ededed] bg-[#fcfcfc] shrink-0">

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 bg-[#f2e6b5] rounded-xl px-3 py-2 shadow-[0_4px_10px_rgba(0,0,0,0.08)]">
                                    <span className="text-sm font-semibold text-[#1f1f1f]">All subjects mode</span>
                                    <button
                                        type="button"
                                        onClick={() => setIsHelpOpen(true)}
                                        className="w-7 h-7 rounded-full bg-[#e6c44c] text-[#1f1f1f] font-bold text-sm shadow-inner grid place-items-center hover:brightness-95 transition"
                                        aria-label="All subjects mode info"
                                    >
                                        ?
                                    </button>
                                    <label className="relative inline-flex items-center cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={allSubjectsMode}
                                            onChange={(e) => setAllSubjectsMode(e.target.checked)}
                                        />
                                        <div className="w-12 h-7 bg-white border border-[#d8d1a3] rounded-full peer-checked:bg-[#e6c44c] transition-colors duration-200"></div>
                                        <div className="absolute left-1 top-1 w-5 h-5 bg-[#d8d1a3] rounded-full transition-all duration-200 peer-checked:translate-x-5 peer-checked:bg-white" />
                                    </label>
                                </div>
                            </div><button
                                onClick={handleRemoveAll}
                                className="flex items-center gap-2 text-sm font-semibold text-[#c9302c] bg-white border border-[#e9b3b0] rounded-full px-4 py-2 shadow-[0_3px_8px_rgba(0,0,0,0.08)] hover:bg-[#fff5f5] transition cursor-pointer"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#c9302c]">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                </svg>
                                Delete all
                            </button>
                        </div>
                    </div>
                </div>
            </div>


            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#F5E6D3] py-6 px-[clamp(16px,2vw,32px)] w-full flex justify-center">
                <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-4 w-full max-w-7xl">
                    {/* LEFT - USER BOX */}
                    <div className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3 w-full sm:w-auto overflow-hidden">
                        {session?.user?.image ? (
                            <img src={session.user.image} alt="User avatar" className="w-9.5 h-9.5 rounded-lg border border-gray-100 shrink-0" referrerPolicy="no-referrer" />
                        ) : (
                            <div className="w-9 h-9 bg-gray-300 rounded-lg flex items-center justify-center font-bold text-white text-sm shrink-0">
                                {session?.user?.name?.[0] || "?"}
                            </div>
                        )}
                        <span className="text-gray-800 text-sm font-bold truncate max-w-50 pr-2">
                            {session?.user?.name || "Guest"}
                        </span>
                    </div>

                    {/* CENTER - STEPS BOX */}
                    <div className="bg-white rounded-xl p-2 shadow-sm flex flex-wrap justify-center items-center gap-2 w-full sm:w-auto order-last md:order-0 mt-2 md:mt-0">
                        {[1, 2, 3, 4].map((num) => (
                            <button
                                key={num}
                                onClick={() => {
                                    if (num === 1) router.push('/preferences');
                                    if (num === 2) router.push('/courses');
                                    if (num === 3) syncAndOpenTimetable();
                                    if (num === 4) router.push('/saved');
                                }}
                                className={`h-9.5 flex items-center justify-center rounded-md font-bold text-sm cursor-pointer transition-colors border-none ${num === 2
                                        ? 'bg-[#A0C4FF] text-black px-4 min-w-9.5'
                                        : 'bg-[#A0C4FF]/40 text-black min-w-9.5'
                                    }`}
                            >
                                {num === 2 ? '2. Courses' : num}
                            </button>
                        ))}
                    </div>

                    {/* RIGHT - ACTION BOX */}
                    <div className="flex gap-3 justify-end shrink-0 ml-auto mr-auto sm:mr-0 mt-2 sm:mt-0">
                        <button
                            onClick={() => {
                                const editingTimetableId = getCookie('editingTimetableId');
                                deleteCookie('editingTimetableId');
                                if (editingTimetableId) {
                                    router.push('/saved');
                                    return;
                                }
                                router.push('/preferences');
                            }}
                            className="px-8 py-3 bg-[#f1eacb] hover:bg-[#E8DDB8] border-2 border-[#A0C4FF] rounded-[10px] font-bold text-sm text-black transition-all duration-200 cursor-pointer"
                        >
                            Previous
                        </button>
                        <button
                            onClick={syncAndOpenTimetable}
                            className="px-10 py-3 bg-[#A0C4FF] hover:bg-[#90B4EF] rounded-[10px] font-bold text-sm text-black transition-all duration-200 cursor-pointer"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {isHelpOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/35" onClick={() => setIsHelpOpen(false)}></div>
                    <div className="relative w-[92%] max-w-md bg-[#f4edcf] rounded-sm shadow-[0_16px_34px_rgba(0,0,0,0.20)] overflow-hidden">
                        <div className="px-8 py-2 bg-[#f1e7b8] border-b-4 border-[#7c6f1f]">
                            <div className="text-[17px] leading-none font-bold text-black">Alert</div>
                        </div>
                        <div className="px-8 py-7 text-left text-[#1f1f1f]">
                            <div className="space-y-5 text-[16px] leading-[1.34] font-normal">
                                <div className="space-y-1">
                                    <div className="font-extrabold text-[17px] leading-[1.2]">All Subjects Mode - ON</div>
                                    <div className="mb-4">Generated timetables strictly include all of the selected subjects.</div>
                                </div>
                                <br></br>
                                <div className="space-y-1">
                                    <div className="font-extrabold text-[17px] leading-[1.2]">All Subjects Mode - OFF</div>
                                    <div>Subjects are prioritized based on their order. If a clash is detected then the subject with lower priority is excluded.</div>
                                </div>
                            </div>
                            <div className="pt-6 text-center">
                                <button
                                    type="button"
                                    onClick={() => setIsHelpOpen(false)}
                                    className="inline-flex min-w-21.5 items-center justify-center px-7 py-2 bg-[#f0df93] rounded-[5px] text-[14px] leading-none font-semibold text-[#1f1f1f] hover:brightness-95 transition"
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes lucidFadeUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-lucid-fade-up-delayed { animation: lucidFadeUp 520ms ease-out; }
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
                .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #7bcf86 #eeeeee; }
                .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #eeeeee; border-radius: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #7bcf86; border-radius: 6px; border: 1px solid #eeeeee; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6bc679; }
            `}</style>
        </div>
    );
}

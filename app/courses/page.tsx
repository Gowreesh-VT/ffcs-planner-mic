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

        triggerRowEffects({ [rowToRemove.uid]: 'animate-dust-out' }, 820);

        window.setTimeout(() => {
            setFaculties((previous) => {
                const next = previous.filter((item) => item.uid !== rowToRemove.uid);
                return renumber(next);
            });
        }, 350);
    };

    const handleRemoveAll = () => {
        if (confirm('Are you sure you want to remove all faculties?')) {
            setLastRemovedFaculties(faculties);
            setFaculties([]);
        }
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
                <div className="flex items-center gap-4 mb-8">
                    <h1 className="text-4xl font-bold text-black animate-lucid-fade-up">Your Faculty Preferences</h1>
                    {editingTimetableTitle && (
                        <div className="bg-blue-100 border-2 border-blue-400 rounded-lg px-4 py-2 flex items-center gap-2 animate-lucid-fade-up">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span className="text-blue-800 font-semibold text-sm">Editing: {editingTimetableTitle}</span>
                        </div>
                    )}
                </div>

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

                <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8 transition-shadow duration-300 hover:shadow-xl animate-lucid-fade-up-delayed">
                    <div className="bg-green-400 px-8 py-4 rounded-t-2xl">
                        <h2 className="text-2xl font-bold text-black">Selected Faculties</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-100 border-b border-gray-300">
                                    <th className="px-6 py-4 text-left font-bold text-black w-12">No</th>
                                    <th className="px-6 py-4 text-left font-bold text-black">Course Code</th>
                                    <th className="px-6 py-4 text-left font-bold text-black">Course Name</th>
                                    <th className="px-6 py-4 text-left font-bold text-black">Slot</th>
                                    <th className="px-6 py-4 text-left font-bold text-black">Faculty Name</th>
                                    <th className="px-6 py-4 text-center font-bold text-black w-32">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {faculties.length > 0 ? (
                                    faculties.map((faculty, index) => {
                                        const hasClash = clashingUids.has(faculty.uid);
                                        return (
                                        <tr
                                            key={faculty.uid}
                                            className={`border-b border-gray-200 transition-colors duration-200 animate-lucid-row ${rowEffects[faculty.uid] || ''} ${rowEffects[faculty.uid] === 'animate-dust-out' ? 'pointer-events-none' : ''} ${hasClash ? 'bg-red-100 hover:bg-red-200' : 'hover:bg-gray-50'}`}
                                        >
                                            <td className={`px-6 py-4 font-semibold text-center ${hasClash ? 'text-red-700' : 'text-black'}`}>{faculty.no}</td>
                                            <td className={`px-6 py-4 font-mono font-bold text-sm ${hasClash ? 'text-red-700' : 'text-black'}`}>{faculty.courseCode}</td>
                                            <td className={`px-6 py-4 ${hasClash ? 'text-red-700' : 'text-black'}`}>
                                                <div className="text-sm whitespace-pre-wrap">{faculty.courseName}</div>
                                            </td>
                                            <td className={`px-6 py-4 ${hasClash ? 'text-red-700' : 'text-black'}`}>
                                                <div className="text-sm whitespace-pre-wrap font-semibold">{faculty.slot}</div>
                                            </td>
                                            <td className={`px-6 py-4 font-semibold ${hasClash ? 'text-red-700' : 'text-black'}`}>{faculty.facultyName}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleMoveUp(index)}
                                                        disabled={index === 0 || rowEffects[faculty.uid] === 'animate-dust-out' || isReordering}
                                                        className={`px-3 py-2 rounded text-lg font-bold transition-all duration-200 ${index === 0 || rowEffects[faculty.uid] === 'animate-dust-out' || isReordering ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-200 hover:-translate-y-0.5 cursor-pointer'}`}
                                                        title="Move up"
                                                    >
                                                        ↑
                                                    </button>
                                                    <button
                                                        onClick={() => handleMoveDown(index)}
                                                        disabled={index === faculties.length - 1 || rowEffects[faculty.uid] === 'animate-dust-out' || isReordering}
                                                        className={`px-3 py-2 rounded text-lg font-bold transition-all duration-200 ${index === faculties.length - 1 || rowEffects[faculty.uid] === 'animate-dust-out' || isReordering ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-200 hover:-translate-y-0.5 cursor-pointer'}`}
                                                        title="Move down"
                                                    >
                                                        ↓
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemove(index)}
                                                        disabled={rowEffects[faculty.uid] === 'animate-dust-out'}
                                                        className={`px-3 py-2 rounded text-lg font-bold text-red-500 hover:text-red-700 hover:bg-red-50 transition-all duration-200 cursor-pointer ${rowEffects[faculty.uid] === 'animate-dust-out' ? 'opacity-40 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
                                                        title="Remove"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                            No faculties selected yet
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-gray-50 px-8 py-4 border-t border-gray-200 flex justify-between items-center ">
                        <div className="flex items-center gap-2 bg-yellow-100 rounded-lg px-4 py-2 hidden">
                            <span className="text-yellow-600 font-bold text-lg">?</span>
                            <span className="text-sm text-gray-700 font-medium">All subjects mode</span>
                            <button
                                onClick={() => setAllSubjectsMode((prev) => !prev)}
                                className={`ml-3 w-12 h-6 rounded-full transition-all duration-300 flex items-center px-1 shadow-sm ${allSubjectsMode ? 'bg-blue-500 scale-105 ring-2 ring-blue-200 animate-cartoon-pulse' : 'bg-gray-300'}`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-md ${allSubjectsMode ? 'translate-x-6 animate-cartoon-bounce' : 'translate-x-0'}`}></div>
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            {faculties.length === 0 && lastRemovedFaculties && lastRemovedFaculties.length > 0 && (
                                <button
                                    onClick={handleUndoRemoveAll}
                                    className="text-blue-600 hover:text-blue-800 font-semibold text-sm transition"
                                >
                                    Undo remove all
                                </button>
                            )}

                            <button
                                onClick={handleRemoveAll}
                                disabled={faculties.length === 0}
                                className={`text-red-500 hover:text-red-700 font-semibold text-sm transition cursor-pointer ${faculties.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                            >
                                Remove all
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border-t border-gray-300 py-6 px-8 shadow-lg animate-lucid-fade-up-delayed">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-3">
                        {session?.user?.image ? (
                            <img src={session.user.image} alt="User avatar" className="w-10 h-10 rounded-full" />
                        ) : (
                            <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                        )}
                        <span className="text-gray-700 text-sm font-semibold">{session?.user?.name || "Guest"}</span>
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
                                className={`px-5 py-2 rounded-lg font-semibold text-sm cursor-pointer ${num === 2 ? 'bg-[#A0C4FF] text-black' : 'bg-[#A0C4FF]/40 text-gray-700'}`}
                            >
                                {num === 2 ? '2. Faculty Preferences' : num}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                // Clear editing state when going back
                                deleteCookie('editingTimetableId');
                                deleteCookie('editingTimetableTitle');
                                router.push('/preferences');
                            }}
                            className="px-8 py-2.5 border-2 border-gray-400 rounded-lg font-semibold text-sm hover:bg-gray-50 text-black transition"
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
                @keyframes cartoonBounce {
                    0% { transform: translateX(1.5rem) scale(1); }
                    35% { transform: translateX(1.5rem) scale(1.18); }
                    60% { transform: translateX(1.5rem) scale(0.92); }
                    100% { transform: translateX(1.5rem) scale(1); }
                }

                @keyframes cartoonPulse {
                    0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.35); }
                    70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
                }

                .animate-cartoon-bounce {
                    animation: cartoonBounce 350ms ease-out;
                }

                .animate-cartoon-pulse {
                    animation: cartoonPulse 1200ms ease-out;
                }

                @keyframes lucidFadeUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @keyframes lucidRow {
                    from { opacity: 0; transform: translateX(8px); }
                    to { opacity: 1; transform: translateX(0); }
                }

                .animate-lucid-fade-up {
                    animation: lucidFadeUp 420ms ease-out;
                }

                .animate-lucid-fade-up-delayed {
                    animation: lucidFadeUp 520ms ease-out;
                }

                .animate-lucid-row {
                    animation: lucidRow 260ms ease-out;
                }

                @keyframes cartoonMoveUp {
                    0% { transform: translateY(0) scale(1, 1); }
                    40% { transform: translateY(-8px) scale(1.02, 0.98); }
                    70% { transform: translateY(2px) scale(0.995, 1.005); }
                    100% { transform: translateY(0) scale(1, 1); }
                }

                @keyframes cartoonMoveDown {
                    0% { transform: translateY(0) scale(1, 1); }
                    40% { transform: translateY(8px) scale(1.02, 0.98); }
                    70% { transform: translateY(-2px) scale(0.995, 1.005); }
                    100% { transform: translateY(0) scale(1, 1); }
                }

                @keyframes dustOut {
                    0% {
                        opacity: 1;
                        transform: translateX(0) scale(1);
                        filter: blur(0);
                        background-position: 0 0;
                    }
                    55% {
                        opacity: 0.65;
                        transform: translateX(10px) scale(0.98);
                        filter: blur(1px);
                    }
                    100% {
                        opacity: 0;
                        transform: translateX(28px) scale(0.9);
                        filter: blur(4px);
                        background-position: 130% 0;
                    }
                }

                .animate-cartoon-move-up {
                    animation: cartoonMoveUp 620ms cubic-bezier(0.22, 0.7, 0.2, 1);
                }

                .animate-cartoon-move-down {
                    animation: cartoonMoveDown 620ms cubic-bezier(0.22, 0.7, 0.2, 1);
                }

                .animate-dust-out {
                    background-image: repeating-linear-gradient(
                        90deg,
                        rgba(255, 255, 255, 0) 0 6px,
                        rgba(255, 255, 255, 0.45) 6px 8px
                    );
                    background-size: 200% 100%;
                    animation: dustOut 420ms steps(6, end) forwards;
                }
            `}</style>
        </div>
    );
}

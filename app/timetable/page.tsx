'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import type { AxiosError } from 'axios';
import posthog from 'posthog-js';
import LoginModal from '@/components/loginPopup';
import { useTimetable } from '@/lib/TimeTableContext';
import { exportToPDF } from '@/lib/exportToPDF';
import { generateTT } from '@/lib/utils';
import { getSlotViewPayload } from '@/lib/slot-view';
import { fullCourseData, timetableDisplayData } from '@/lib/type';
import { clearPlannerClientCache } from '@/lib/clientCache';
import { getShortCourseName } from '@/lib/courseDisplay';
import { getPlannerStoredValue } from '@/lib/plannerStorage';

const setCookie = (name: string, value: string) => {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=${value}; path=/; max-age=3600`;
};

const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    const nameEQ = name + '=';
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.indexOf(nameEQ) === 0) {
            return decodeURIComponent(cookie.substring(nameEQ.length));
        }
    }
    return null;
};

const deleteCookie = (name: string) => {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

const THEORY_FILLED_COLOR = '#BFF0C8';
const THEORY_EMPTY_COLOR = '#E1F9E9';
const LAB_FILLED_COLOR = '#FFE78A';
const LAB_EMPTY_COLOR = '#FFF2BF';
const THEORY_POPUP_COLOR = '#CFF3D5';
const THEORY_POPUP_BORDER = '#6AA874';
const LAB_POPUP_COLOR = '#FFF0A6';
const LAB_POPUP_BORDER = '#8F8443';

function isSameSlot(a: timetableDisplayData | null, b: timetableDisplayData | null) {
    if (!a || !b) return false;
    return (
        a.courseCode === b.courseCode &&
        a.courseName === b.courseName &&
        a.slotName === b.slotName &&
        a.facultyName === b.facultyName
    );
}

type HighlightedCell = {
    rect: { top: number; left: number; width: number; height: number };
    label: string;
    courseCode: string;
    backgroundColor: string;
};

type SlotCategory = 'theory' | 'lab';

function getSlotTokens(slotName: string) {
    return slotName
        .split('+')
        .map(token => token.trim())
        .filter(Boolean);
}

function TimetableTable({
    scheduleRows,
    leftTimes,
    rightTimes,
    theoryGrid,
    labGrid,
    selectedSlot,
    openSelectedSlot,
    exportMode = false,
}: {
    scheduleRows: ReturnType<typeof getSlotViewPayload>['scheduleRows'];
    leftTimes: ReturnType<typeof getSlotViewPayload>['leftTimes'];
    rightTimes: ReturnType<typeof getSlotViewPayload>['rightTimes'];
    theoryGrid: (timetableDisplayData | null)[][];
    labGrid: (timetableDisplayData | null)[][];
    selectedSlot: timetableDisplayData | null;
    openSelectedSlot: (slot: timetableDisplayData, category: SlotCategory) => void;
    exportMode?: boolean;
}) {
    return (
        <table className={`w-full table-fixed border-collapse bg-white text-center min-w-full ${exportMode ? '' : 'h-full'}`}>
            <thead className={exportMode ? '' : 'h-12 sticky top-0 z-20 shadow-sm'}>
                <tr className={`border-b-2 border-white ${exportMode ? 'h-18.5' : 'h-7.5'}`}>
                    <th className={`text-center font-bold text-black border-r-2 border-white bg-white ${exportMode ? 'w-37.5 p-3 text-[20px] leading-tight' : 'w-[5vw] p-0.5 text-[9px] leading-tight'}`}>Theory Hours</th>
                    {[...leftTimes, { theory: '', lab: '' }, ...rightTimes].map((t, i) => (
                        <th key={i} className={`text-center font-bold text-black border-r-2 border-white bg-white ${i === 6 ? (exportMode ? 'w-10.5 px-0' : 'w-6 px-0') : (exportMode ? 'min-w-33 p-2 text-[16px] leading-tight' : 'min-w-12.5 p-0.5 text-[10px] leading-tight')}`}>
                            {t.theory ? t.theory.split('-').map((part, idx, arr) => (
                                <span key={idx} className="block whitespace-nowrap">{part}{idx < arr.length - 1 ? '-' : ''}</span>
                            )) : null}
                        </th>
                    ))}
                </tr>
                <tr className={`border-b-2 border-white ${exportMode ? 'h-18.5' : 'h-7.5'}`}>
                    <th className={`text-center font-bold text-black border-r-2 border-white bg-white ${exportMode ? 'w-37.5 p-3 text-[20px] leading-tight' : 'w-[5vw] p-0.5 text-[9px] leading-tight'}`}>Lab Hours</th>
                    {[...leftTimes, { theory: '', lab: '' }, ...rightTimes].map((t, i) => (
                        <th key={i} className={`text-center font-bold text-black border-r-2 border-white bg-white ${i === 6 ? (exportMode ? 'w-10.5 px-0' : 'w-6 px-0') : (exportMode ? 'min-w-33 p-2 text-[16px] leading-tight' : 'min-w-12.5 p-0.5 text-[10px] leading-tight')}`}>
                            {t.lab ? t.lab.split('-').map((part, idx, arr) => (
                                <span key={idx} className="block whitespace-nowrap">{part}{idx < arr.length - 1 ? '-' : ''}</span>
                            )) : null}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="bg-white">
                {scheduleRows.map((row, rowIdx) => (
                    <tr key={row.day} className={exportMode ? '' : 'group h-[20%]'}>
                        <td className={`text-black text-center align-middle border-r-2 border-white bg-white font-bold ${exportMode ? 'w-37.5 p-0 text-[20px]' : 'w-[5vw] p-0 text-[9px]'}`}>{row.day}</td>
                        {Array.from({ length: 13 }).map((_, colIdx) => {
                            if (colIdx === 6) {
                                const lunchLetters = ['L', 'U', 'N', 'C', 'H'];
                                return (
                                    <td key="lunch-spacer" className={`border-r-2 border-white align-middle bg-[#f8f9fa] ${exportMode ? 'w-10.5' : 'w-6'}`}>
                                        <div className="flex h-full flex-col items-center justify-center">
                                            <span className={`font-black text-black opacity-80 ${exportMode ? 'text-[18px]' : 'text-[9px]'}`}>
                                                {lunchLetters[rowIdx]}
                                            </span>
                                        </div>
                                    </td>
                                );
                            }

                            const theoryCell = theoryGrid[rowIdx][colIdx];
                            const labCell = labGrid[rowIdx][colIdx];
                            const theoryBackgroundColor = theoryCell ? THEORY_FILLED_COLOR : THEORY_EMPTY_COLOR;
                            const labBackgroundColor = labCell ? LAB_FILLED_COLOR : LAB_EMPTY_COLOR;

                            let theoryLabel = '';
                            let labLabel = '';
                            if (colIdx < 6) {
                                theoryLabel = row.theoryLeft[colIdx].label;
                                labLabel = row.labLeft[colIdx].label;
                            } else {
                                theoryLabel = row.theoryRight[colIdx - 7].label;
                                labLabel = row.labRight[colIdx - 7].label;
                            }

                            return (
                                <td key={colIdx} className="align-top border-r-2 border-white p-0 bg-white">
                                    <div className={`grid w-full grid-rows-2 gap-0 ${exportMode ? 'min-h-41' : 'h-full min-h-17'}`}>
                                        <div
                                            data-slot-label={theoryLabel}
                                            data-slot-category="theory"
                                            data-bgcolor={theoryBackgroundColor}
                                            className={`relative flex flex-col items-center justify-center transition-all cursor-pointer ${theoryCell ? 'z-10' : ''} ${isSameSlot(selectedSlot, theoryCell) ? 'brightness-110' : ''} ${exportMode ? 'min-h-20.5 px-2.5 py-1.5' : 'h-full py-0'}`}
                                            style={{ backgroundColor: theoryBackgroundColor }}
                                            onClick={() => theoryCell && openSelectedSlot(theoryCell, 'theory')}
                                        >
                                            {theoryCell ? (
                                                <>
                                                    <span className={`font-bold text-black leading-tight ${exportMode ? 'text-[15px]' : 'text-[10px]'}`}>{theoryLabel}</span>
                                                    <span className={`font-bold text-black opacity-80 uppercase leading-tight ${exportMode ? 'mt-1 px-1 text-[13px]' : 'px-1 text-[8px] max-w-15.5 truncate'}`}>{theoryCell.courseCode}</span>
                                                    {exportMode && (
                                                        <span className="mt-1 px-2 text-center text-[11px] font-semibold leading-tight text-black/85 wrap-break-word line-clamp-2">
                                                            {getShortCourseName(theoryCell.courseName)}
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className={`font-bold text-[#4ea075] ${exportMode ? 'text-[15px]' : 'text-[10px]'}`}>{theoryLabel}</span>
                                            )}
                                        </div>

                                        <div
                                            data-slot-label={labLabel}
                                            data-slot-category="lab"
                                            data-bgcolor={labBackgroundColor}
                                            className={`relative flex flex-col items-center justify-center transition-all cursor-pointer ${labCell ? 'z-10' : ''} ${isSameSlot(selectedSlot, labCell) ? 'brightness-110' : ''} ${exportMode ? 'min-h-20.5 px-2.5 py-1.5' : 'h-full py-0'}`}
                                            style={{ backgroundColor: labBackgroundColor }}
                                            onClick={() => labCell && openSelectedSlot(labCell, 'lab')}
                                        >
                                            {labCell ? (
                                                <>
                                                    <span className={`font-bold text-black leading-tight ${exportMode ? 'text-[15px]' : 'text-[10px]'}`}>{labLabel}</span>
                                                    <span className={`font-bold text-black opacity-80 uppercase leading-tight ${exportMode ? 'mt-1 px-1 text-[13px]' : 'px-1 text-[8px] max-w-15.5 truncate'}`}>{labCell.courseCode}</span>
                                                    {exportMode && (
                                                        <span className="mt-1 px-2 text-center text-[11px] font-semibold leading-tight text-black/85 wrap-break-word line-clamp-2">
                                                            {getShortCourseName(labCell.courseName)}
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className={`font-bold text-[#d4a044] ${exportMode ? 'text-[15px]' : 'text-[10px]'}`}>{labLabel}</span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                            );
                        })}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export default function TimetablePage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const { timetableData, setTimetableData } = useTimetable();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedSlot, setSelectedSlot] = useState<timetableDisplayData | null>(null);
    const [highlightedCells, setHighlightedCells] = useState<HighlightedCell[]>([]);
    const [selectedSlotCategory, setSelectedSlotCategory] = useState<SlotCategory | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');
    const [clashMessage, setClashMessage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [timetableTitle, setTimetableTitle] = useState('My Schedule');
    const [saveError, setSaveError] = useState('');
    const { scheduleRows, leftTimes, rightTimes } = useMemo(() => getSlotViewPayload(), []);

    const hasInitialized = useRef(false);

    // Load from cookies and generate if context is empty
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;



        if (!timetableData || timetableData.length === 0) {
            const savedCoursesRaw = getPlannerStoredValue('generatedTimetableCourses') || getPlannerStoredValue('preferenceCourses');
            if (savedCoursesRaw) {
                try {
                    setIsGenerating(true);
                    const savedCourses = JSON.parse(savedCoursesRaw) as fullCourseData[];
                    const { result, clashes } = generateTT(savedCourses);
                    setTimetableData(result);
                    setClashMessage(clashes);
                } catch (error) {
                    console.error('Error generating timetable:', error);
                } finally {
                    setIsGenerating(false);
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const currentTT = useMemo(() => timetableData?.[currentIndex] || [], [timetableData, currentIndex]);
    const selectedCourses = useMemo(() => {
        const courseMap = new Map<string, { courseName: string; facultyName: string; slots: string[] }>();
        currentTT.forEach((slot) => {
            if (!courseMap.has(slot.courseCode)) {
                courseMap.set(slot.courseCode, {
                    courseName: slot.courseName,
                    facultyName: slot.facultyName,
                    slots: [],
                });
            }
            courseMap.get(slot.courseCode)!.slots.push(slot.slotName);
        });
        return Array.from(courseMap.entries());
    }, [currentTT]);
    const exportCreditsLabel = 'TBD';

    const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
        setToast(msg);
        setToastType(type);
        setTimeout(() => setToast(''), 3000);
    }, []);

    const getRequestErrorMessage = useCallback((error: unknown, fallback: string) => {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{ error?: string; detail?: string }>;
            return axiosError.response?.data?.error || axiosError.response?.data?.detail || fallback;
        }

        if (error instanceof Error && error.message) {
            return error.message;
        }

        return fallback;
    }, []);

    const clearSelectedSlot = useCallback(() => {
        setSelectedSlot(null);
        setHighlightedCells([]);
        setSelectedSlotCategory(null);
    }, []);

    const openSelectedSlot = useCallback((
        slot: timetableDisplayData,
        category: SlotCategory,
    ) => {
        const slotTokens = getSlotTokens(slot.slotName);
        const highlights: HighlightedCell[] = slotTokens.flatMap((token) => {
            const nodeList = document.querySelectorAll<HTMLElement>(`[data-slot-label="${token}"][data-slot-category="${category}"]`);
            return Array.from(nodeList).map((node) => {
                const rect = node.getBoundingClientRect();
                return {
                    rect: {
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height,
                    },
                    label: token,
                    courseCode: slot.courseCode,
                    backgroundColor: node.dataset.bgcolor || '#ffffff',
                };
            });
        });

        setSelectedSlot(slot);
        setHighlightedCells(highlights);
        setSelectedSlotCategory(category);
    }, []);

    const handleSave = async (customTitle?: string, options?: { skipRedirect?: boolean; makePublic?: boolean }) => {
        if (!session?.user?.email) {
            setShowLogin(true);
            showToast('Please sign in to save or share your timetable.');
            return null;
        }
        if (isSaving || currentTT.length === 0) return null;

        setSaveError('');
        setIsSaving(true);
        try {
            const editingTimetableId = getCookie('editingTimetableId');
            const title = customTitle?.trim() || timetableTitle.trim() || 'My Schedule';

            const slotsData = currentTT.map(s => ({
                slot: s.slotName,
                courseCode: s.courseCode,
                courseName: s.courseName,
                facultyName: s.facultyName,
            }));

            if (editingTimetableId) {
                // Update existing timetable
                const res = await axios.patch(`/api/timetables/${editingTimetableId}`, {
                    title,
                    slots: slotsData,
                    ...(options?.makePublic ? { isPublic: true } : {}),
                });

                if (res.data.success) {
                    const resolvedTitle = res.data?.timetable?.title;
                    if (typeof resolvedTitle === 'string' && resolvedTitle.trim().length > 0) {
                        setTimetableTitle(resolvedTitle);
                    }
                    posthog.capture('timetable_saved', {
                        mode: 'update',
                        slots_count: slotsData.length,
                        title_length: (resolvedTitle || title).length,
                    });
                    if (!options?.skipRedirect) {
                        setShowSaveModal(false);
                        if (resolvedTitle && resolvedTitle !== title) {
                            showToast(`Timetable updated as "${resolvedTitle}"`);
                        } else {
                            showToast('Timetable updated successfully!');
                        }
                        setTimeout(() => { router.refresh(); router.push('/saved'); }, 1200);
                    }
                    return { _id: editingTimetableId, shareId: null };
                }
            } else {
                // Create new timetable
                const res = await axios.post('/api/save-timetable', {
                    title,
                    slots: slotsData,
                    owner: session.user.email,
                    isPublic: options?.makePublic ?? false,
                });

                if (res.data.success) {
                    const resolvedTitle = res.data?.timetable?.title;
                    if (typeof resolvedTitle === 'string' && resolvedTitle.trim().length > 0) {
                        setTimetableTitle(resolvedTitle);
                    }
                    posthog.capture('timetable_saved', {
                        mode: 'create',
                        slots_count: slotsData.length,
                        title_length: (resolvedTitle || title).length,
                    });
                    // Update editing cookie so subsequent shares bind to the new save!
                    setCookie('editingTimetableId', res.data.timetable._id);


                    if (!options?.skipRedirect) {
                        setShowSaveModal(false);
                        if (resolvedTitle && resolvedTitle !== title) {
                            showToast(`Timetable saved as "${resolvedTitle}"`);
                        } else {
                            showToast('Timetable saved successfully!');
                        }
                        setTimeout(() => {
                            clearPlannerClientCache({ includeEditingState: true, clearPlannerState: false });
                            router.refresh();
                            router.push('/saved');
                        }, 1200);
                    }
                    return res.data.timetable;
                }
            }
        } catch (error) {
            console.error('Save error:', error);
            const message = getRequestErrorMessage(error, 'Failed to save timetable.');
            setSaveError(message);
            showToast(message, 'error');
        } finally {
            setIsSaving(false);
        }
        return null;
    };

    const handleDownload = async (target: 'timetable' | 'slots') => {
        console.log('handleDownload called', { currentTTLength: currentTT.length });
        if (currentTT.length === 0) {
            showToast('No timetable data to download.', 'error');
            window.alert('No timetable data to download.');
            return;
        }
        showToast('Preparing PDF...');
        try {
            await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
            const elementId = target === 'timetable' ? 'rat-export' : 'selected-courses-export';
            const filename = target === 'timetable'
                ? `timetable-option-${currentIndex + 1}.pdf`
                : `selected-courses-option-${currentIndex + 1}.pdf`;
            await exportToPDF(elementId, filename);
            showToast('PDF downloaded successfully!');
        } catch (error: unknown) {
            console.error('PDF error:', error);
            showToast('Failed to generate PDF. Please try again.', 'error');
            const message = error instanceof Error ? error.message : String(error);
            window.alert('Failed to generate PDF: ' + message);
        } finally {
            setShowDownloadModal(false);
        }
    };

    const copyToClipboard = async (text: string): Promise<boolean> => {
        // Try the modern Clipboard API first
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch {
                // Fall through to fallback
            }
        }
        // Fallback: create a temporary textarea and use execCommand
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            textarea.style.top = '-9999px';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(textarea);
            return ok;
        } catch {
            return false;
        }
    };

    const handleShare = async () => {
        console.log('handleShare called!');
        if (!session?.user?.email) {
            setShowLogin(true);
            showToast('Please sign in to share your timetable.', 'error');
            return;
        }
        if (currentTT.length === 0) {
            window.alert('No timetable data to share.');
            showToast('No timetable data to share.', 'error');
            return;
        }

        try {
            console.log('Starting share flow...');
            const editingTimetableId = getCookie('editingTimetableId');
            let shareId: string | null = null;

            if (editingTimetableId) {
                console.log('Editing existing timetable:', editingTimetableId);
                const slotsData = currentTT.map(s => ({
                    slot: s.slotName,
                    courseCode: s.courseCode,
                    courseName: s.courseName,
                    facultyName: s.facultyName,
                }));
                await axios.patch(`/api/timetables/${editingTimetableId}`, {
                    slots: slotsData,
                });
                const timetableRes = await axios.get(`/api/timetables/${editingTimetableId}`);
                shareId = timetableRes.data.shareId;
            } else {
                console.log('Saving new private timetable...');
                const saved = await handleSave(timetableTitle, { skipRedirect: true, makePublic: true });
                console.log('Save result:', saved);
                if (saved?.shareId) {
                    shareId = saved.shareId;
                } else if (saved?._id) {
                    const res = await axios.get(`/api/timetables/${saved._id}`);
                    shareId = res.data.shareId;
                } else {
                    return;
                }
            }

            console.log('Got shareId:', shareId);
            if (!shareId) {
                window.alert('Could not generate or find shareId.');
                showToast('Could not generate share link.', 'error');
                return;
            }

            const url = `${window.location.origin}/share/${shareId}`;
            console.log('Attempting to copy:', url);
            const copied = await copyToClipboard(url);
            posthog.capture('timetable_shared', {
                source: editingTimetableId ? 'existing_timetable' : 'new_timetable',
                slots_count: currentTT.length,
                copied_to_clipboard: copied,
            });
            if (copied) {
                window.alert('Share link copied!\n' + url);
                showToast('Share link copied to clipboard!');
            } else {
                window.prompt('Copy this share link:', url);
            }
        } catch (error: unknown) {
            console.error('Share error:', error);
            const message = getRequestErrorMessage(error, 'Failed to share timetable. Please try again.');
            window.alert('Share Error: ' + message);
            showToast(message, 'error');
        }
    };

    /* Build the grid display data for rendering */
    const theoryGrid: (timetableDisplayData | null)[][] = Array.from({ length: 5 }, () => Array(13).fill(null));
    const labGrid: (timetableDisplayData | null)[][] = Array.from({ length: 5 }, () => Array(13).fill(null));

    currentTT.forEach(s => {
        const parts = s.slotName.split(/\+|__/);
        parts.forEach(p => {
            const cleanP = p.trim();
            // We need to find where this slot belongs in our 5x13 grid
            scheduleRows.forEach((row, dayIdx) => {
                row.theoryLeft.forEach((cell, colIdx) => { if (cell.key === cleanP) theoryGrid[dayIdx][colIdx] = s; });
                row.theoryRight.forEach((cell, colIdx) => { if (cell.key === cleanP) theoryGrid[dayIdx][colIdx + 7] = s; });
                row.labLeft.forEach((cell, colIdx) => { if (cell.key === cleanP) labGrid[dayIdx][colIdx] = s; });
                row.labRight.forEach((cell, colIdx) => { if (cell.key === cleanP) labGrid[dayIdx][colIdx + 7] = s; });
            });
        });
    });

    if (status === 'loading' || isGenerating) {
        return (
            <div className="min-h-screen bg-cream flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-[16px] font-bold text-gray-700">Generating your timetables...</p>
                </div>
            </div>
        );
    }

    if (!timetableData || timetableData.length === 0) {
        return (
            <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-8">
                <h1 className="text-3xl font-black text-black mb-4">No Timetables Found</h1>
                <p className="text-gray-600 mb-8 max-w-md text-center">
                    {clashMessage || "We couldn't generate any non-clashing combinations based on your selections."}
                </p>
                <button
                    onClick={() => {
                        // Keep editing state in case user wants to try again
                        router.push('/courses');
                    }}
                    className="px-8 py-3 bg-[#A0C4FF] text-black font-bold rounded-xl shadow-lg hover:scale-105 transition-all"
                >
                    Back to Selection
                </button>
            </div>
        );
    }

    return (
        <div className="h-screen bg-[#F5E6D3] font-sans overflow-hidden">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-8 right-8 z-100 text-white px-8 py-4 rounded-2xl shadow-2xl text-[14px] font-bold animate-[slideIn_0.3s_ease] border border-white/10 ${toastType === 'error' ? 'bg-red-500' : 'bg-[#1a1a2e]'}`}>
                    {toast}
                </div>
            )}

            <div className="h-full px-[clamp(12px,1.5vw,24px)] pt-[clamp(10px,1vh,18px)] pb-29">
                <div className="w-full max-w-450 h-full mx-auto flex flex-col min-h-0">
                    <div className="flex items-center gap-4 px-2 pt-4.5 pb-2 shrink-0">
                        <h1 className="text-[24px] font-bold text-black">Timetables Generated</h1>
                    </div>

                    {/* Main Table Container */}
                    <div className="bg-white rounded-[18px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-white flex-1 min-h-0 overflow-hidden flex flex-col p-3" id="timetable-grid">

                        <div id="rat" className="flex-1 min-h-0 overflow-auto scrollbar-thin rounded-[14px] border border-[#f1f1f1]">
                            <div className="min-h-full">
                                <TimetableTable
                                    scheduleRows={scheduleRows}
                                    leftTimes={leftTimes}
                                    rightTimes={rightTimes}
                                    theoryGrid={theoryGrid}
                                    labGrid={labGrid}
                                    selectedSlot={selectedSlot}
                                    openSelectedSlot={openSelectedSlot}
                                />
                            </div>
                        </div>

                        {/* Pagination & Action Controls */}
                        <div className="flex flex-wrap items-center justify-between pt-2 mt-2 gap-3 shrink-0 w-full border-t border-[#f2ede3]">
                            {/* Pagination */}
                            <div className="flex items-center gap-1 bg-[#A0C4FF]/80 p-2 rounded-xl shadow-sm">
                                <button
                                    onClick={() => setCurrentIndex(0)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-black hover:bg-white/40 transition-colors font-bold text-lg"
                                >
                                    «
                                </button>
                                <div className="flex gap-1">
                                    {[0, 1, 2, 3].map(idx => (
                                        idx < (timetableData?.length || 0) && (
                                            <button
                                                key={idx}
                                                onClick={() => setCurrentIndex(idx)}
                                                className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm transition-all ${currentIndex === idx
                                                    ? 'bg-white text-black shadow-sm'
                                                    : 'bg-transparent text-black hover:bg-white/40'
                                                    }`}
                                            >
                                                {idx + 1}
                                            </button>
                                        )
                                    ))}
                                </div>
                                <button
                                    onClick={() => setCurrentIndex((timetableData?.length || 1) - 1)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-black hover:bg-white/40 transition-colors font-bold text-lg"
                                >
                                    »
                                </button>
                            </div>

                            {/* Action Bar */}
                            <div className="flex flex-wrap items-center justify-end gap-3">
                                <button
                                    onClick={handleShare}
                                    className="flex items-center gap-2 bg-[#A0C4FF] hover:bg-[#8ab2f2] text-black font-semibold py-2.5 px-6 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95 text-[14px]"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" /></svg>
                                    Share
                                </button>
                                <button
                                    onClick={() => setShowDownloadModal(true)}
                                    className="flex items-center gap-2 bg-[#C8F7DC] hover:bg-[#b0eac8] text-black font-semibold py-2.5 px-6 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95 text-[14px]"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                                    Download
                                </button>
                                <button
                                    onClick={() => {
                                        if (!session?.user?.email) {
                                            setShowLogin(true);
                                            showToast('Please sign in to save your timetable.', 'error');
                                            return;
                                        }
                                        setShowSaveModal(true);
                                    }}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 bg-[#F9A8D4]/60 hover:bg-[#F9A8D4]/80 text-black font-semibold py-2.5 px-6 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 text-[14px]"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                                    Save
                                </button>
                            </div>
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
                            <img src={session.user.image} alt="User avatar" className="w-9 h-9 rounded-lg border border-gray-100 shrink-0" referrerPolicy="no-referrer" />
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
                                    if (num === 3) router.push('/timetable');
                                    if (num === 4) {
                                        if (!session?.user?.email) {
                                            setShowLogin(true);
                                            showToast('Please sign in to continue to saved timetables.', 'error');
                                            return;
                                        }
                                        router.push('/saved');
                                    }
                                }}
                                className={`h-9.5 flex items-center justify-center rounded-md font-bold text-sm cursor-pointer transition-colors border-none ${
                                    num === 3
                                        ? 'bg-[#A0C4FF] text-black px-4 min-w-9.5'
                                        : 'bg-[#A0C4FF]/40 text-black min-w-9.5'
                                }`}
                            >
                                {num === 3 ? '3. Timetable' : num}
                            </button>
                        ))}
                    </div>

                    {/* RIGHT - ACTION BOX */}
                    <div className="flex gap-3 justify-end shrink-0 ml-auto mr-auto sm:mr-0 mt-2 sm:mt-0">
                        <button
                            onClick={() => router.push('/courses')}
                            className="px-8 py-3 bg-[#f1eacb] hover:bg-[#E8DDB8] border-2 border-[#A0C4FF] rounded-[10px] font-bold text-sm text-black transition-all duration-200 cursor-pointer"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => {
                                if (!session?.user?.email) {
                                    setShowLogin(true);
                                    showToast('Please sign in to continue to saved timetables.', 'error');
                                    return;
                                }
                                router.push('/saved');
                            }}
                            className="px-10 py-3 bg-[#A0C4FF] hover:bg-[#90B4EF] rounded-[10px] font-bold text-sm text-black transition-all duration-200 cursor-pointer"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            <div className="pointer-events-none fixed -left-2500 -top-2500" aria-hidden="true">
                <div id="rat-export" className="w-600 bg-[#F8E8D2] p-12 font-sans">
                    <div className="rounded-4xl border border-[#efe7d6] bg-[#FFFBF0] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.04)]">
                        <div className="mb-8 flex items-center gap-5 px-1">
                            <h1 className="text-[42px] font-bold text-black">{timetableTitle || 'My Schedule'}</h1>
                            <div className="rounded-2xl border-2 border-green-400 bg-green-100 px-5 py-3 text-[22px] font-semibold text-green-800">
                                PDF Export
                            </div>
                        </div>
                        <div className="overflow-hidden rounded-3xl border border-[#ece6d8] bg-white p-6">
                            <TimetableTable
                                scheduleRows={scheduleRows}
                                leftTimes={leftTimes}
                                rightTimes={rightTimes}
                                theoryGrid={theoryGrid}
                                labGrid={labGrid}
                                selectedSlot={null}
                                openSelectedSlot={openSelectedSlot}
                                exportMode
                            />
                        </div>
                    </div>
                </div>
                <div id="selected-courses-export" className="w-300 bg-[#F8E8D2] p-12 font-sans">
                    <div className="rounded-[36px] border border-[#d9d9d9] bg-white px-10 pt-8 pb-10 shadow-[0_12px_40px_rgba(0,0,0,0.04)]">
                        <h2 className="mb-20 text-center text-[30px] leading-[1.2] font-black text-black">{timetableTitle || 'Selected Courses'}</h2>
                        <div className="overflow-hidden border-y border-[#2c2c2c] bg-white" style={{ marginBottom: 32 }}>
                            <table className="w-full border-collapse text-center">
                                <thead className="bg-[#D9EBE5]">
                                    <tr>
                                        <th className="w-[15%] border-r border-[#d9e2de] px-5 py-4 text-[17px] font-black text-black">Slot</th>
                                        <th className="w-[18%] border-r border-[#d9e2de] px-5 py-4 text-[17px] font-black text-black">Course Code</th>
                                        <th className="w-[32%] border-r border-[#d9e2de] px-5 py-4 text-[17px] font-black text-black">Course Title</th>
                                        <th className="w-[18%] border-r border-[#d9e2de] px-5 py-4 text-[17px] font-black text-black">Faculty</th>
                                        <th className="w-[9%] border-r border-[#d9e2de] px-5 py-4 text-[17px] font-black text-black">Venue</th>
                                        <th className="w-[8%] px-5 py-4 text-[17px] font-black text-black">Credits</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedCourses.map(([code, info]) => (
                                        <tr key={code} className="border-t border-[#2c2c2c]">
                                            <td className="px-5 py-4 text-[16px] font-medium text-black whitespace-pre-wrap">{info.slots.join('\n')}</td>
                                            <td className="px-5 py-4 text-[16px] font-medium text-black">{code}</td>
                                            <td className="px-5 py-4 text-[16px] font-medium text-black">{info.courseName}</td>
                                            <td className="px-5 py-4 text-[16px] font-medium text-black">{info.facultyName}</td>
                                            <td className="px-5 py-4 text-[16px] font-medium text-black">TBD</td>
                                            <td className="px-5 py-4 text-[16px] font-medium text-black">TBD</td>
                                        </tr>
                                    ))}
                                    <tr className="border-t border-[#2c2c2c] bg-[#E7E7E7]">
                                        <td colSpan={6} className="px-5 py-4 text-center text-[18px] font-black text-black">
                                            Total Credits: {exportCreditsLabel}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Popover */}
            {selectedSlot && (
                <div className="slot-detail-backdrop fixed inset-0 z-500 flex items-center justify-center px-4" onClick={clearSelectedSlot}>
                    {highlightedCells.map((highlightedCell) => (
                        <div
                            key={`${highlightedCell.label}-${highlightedCell.rect.top}-${highlightedCell.rect.left}`}
                            className="pointer-events-none fixed z-505 flex flex-col items-center justify-center shadow-[0_12px_24px_rgba(0,0,0,0.14)]"
                            style={{
                                top: highlightedCell.rect.top,
                                left: highlightedCell.rect.left,
                                width: highlightedCell.rect.width,
                                height: highlightedCell.rect.height,
                                backgroundColor: selectedSlotCategory === 'theory' ? THEORY_POPUP_COLOR : LAB_POPUP_COLOR,
                            }}
                        >
                            <span className="text-[10px] font-bold leading-tight text-black">{highlightedCell.label}</span>
                            <span className="max-w-15.5 truncate px-1 text-[8px] font-bold uppercase leading-tight text-black opacity-80">
                                {highlightedCell.courseCode}
                            </span>
                        </div>
                    ))}
                    <div
                        className="relative z-510 flex shrink-0 flex-col animate-[scaleIn_0.2s_ease] overflow-hidden rounded-xl border-[1.5px] px-5 pt-5 pb-4"
                        style={{
                            width: '335px',
                            height: '312px',
                            maxWidth: '92vw',
                            backgroundColor: selectedSlotCategory === 'theory' ? THEORY_POPUP_COLOR : LAB_POPUP_COLOR,
                            borderColor: selectedSlotCategory === 'theory' ? THEORY_POPUP_BORDER : LAB_POPUP_BORDER,
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={clearSelectedSlot}
                            className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full text-black/80 transition-colors hover:bg-black/5 hover:text-black"
                            aria-label="Close course details"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>

                        <div className="pr-8">
                            <h2 className="text-center text-[22px] font-black leading-[1.1] text-black">
                                {selectedSlot.courseCode} - {selectedSlot.courseName}
                            </h2>
                            <p className="mt-2 text-center text-[18px] font-black text-black">
                                Slot: {selectedSlot.slotName}
                            </p>
                        </div>

                        <div className="mt-4 flex flex-1 flex-col justify-evenly">
                            <p className="text-[16px] leading-[1.35] text-black">
                                <span className="font-black">Faculty Name:</span>{' '}
                                <span className="font-semibold text-black/75">{selectedSlot.facultyName || '-'}</span>
                            </p>
                            <p className="text-[16px] leading-[1.35] text-black">
                                <span className="font-black">Course Name:</span>{' '}
                                <span className="font-semibold text-black/75">{selectedSlot.courseName || '-'}</span>
                            </p>
                            <p className="text-[16px] leading-[1.35] text-black">
                                <span className="font-black">Course Code:</span>{' '}
                                <span className="font-semibold text-black/75">{selectedSlot.courseCode || '-'}</span>
                            </p>
                            <p className="text-[16px] leading-[1.35] text-black">
                                <span className="font-black">Timing:</span>{' '}
                                <span className="font-semibold text-black/75">{selectedSlot.slotName || '-'}</span>
                            </p>
                            <p className="text-[16px] leading-[1.35] text-black">
                                <span className="font-black">Classroom:</span>{' '}
                                <span className="font-semibold text-black/75">TBD</span>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {showDownloadModal && (
                <div className="fixed inset-0 z-520 flex items-center justify-center bg-black/35 backdrop-blur-xs" onClick={() => setShowDownloadModal(false)}>
                    <div className="w-[92%] max-w-105 rounded-3xl bg-white p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-center text-[24px] font-black text-black">Download PDF</h2>
                        <p className="mt-2 text-center text-[15px] font-medium text-gray-600">Choose what you want to download.</p>
                        <div className="mt-6 flex flex-col gap-3">
                            <br></br>
                            <button
                                onClick={() => handleDownload('timetable')}
                                className="rounded-2xl bg-[#C8F7DC] px-5 py-4 text-left text-[16px] font-bold text-black transition-colors hover:bg-[#b0eac8]"
                            >
                                Timetable
                            </button>
                            <button
                                onClick={() => handleDownload('slots')}
                                className="rounded-2xl bg-[#A0C4FF] px-5 py-4 text-left text-[16px] font-bold text-black transition-colors hover:bg-[#8fb6f2]"
                            >
                                Selected Courses
                            </button>
                        </div>
                        <br></br>
                        <button
                            onClick={() => setShowDownloadModal(false)}
                            className="mt-3! w-full rounded-[14px] bg-[#f3f4f6] px-4 py-3 text-[15px] font-semibold text-gray-700 transition-colors hover:bg-[#e5e7eb]"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Save Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => {
                    setSaveError('');
                    setShowSaveModal(false);
                }}>
                    <div
                        className="bg-white rounded-3xl shadow-2xl p-8 w-[90%] max-w-100 relative animate-[scaleIn_0.2s_ease]"
                        onClick={e => e.stopPropagation()}
                    >
                        <h2 className="text-[24px] font-black text-black mb-4">Save Timetable</h2>
                        <input
                            type="text"
                            value={timetableTitle}
                            onChange={(e) => {
                                setTimetableTitle(e.target.value);
                                if (saveError) {
                                    setSaveError('');
                                }
                            }}
                            className="w-full p-4 border-2 border-gray-100 rounded-xl mb-6 text-black font-semibold text-[16px] focus:border-[#A0C4FF] focus:ring-2 focus:ring-[#A0C4FF]/20 outline-none transition-all placeholder:font-medium"
                            placeholder="Enter a title..."
                            autoFocus
                        />
                        {saveError && (
                            <p className="mb-4 rounded-xl bg-[#fff1f2] px-4 py-3 text-[14px] font-medium text-[#b42318]">
                                {saveError}
                            </p>
                        )}
                        <div className="mt-4! margin flex items-center justify-end gap-5">
                            <button
                                onClick={() => {
                                    setSaveError('');
                                    setShowSaveModal(false);
                                }}
                                className="min-w-33 px-6 py-3 text-center text-[16px] font-bold text-[#667085] transition-colors hover:text-[#475467]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    handleSave(timetableTitle);
                                }}
                                disabled={isSaving || !timetableTitle.trim()}
                                className="min-w-30 rounded-[22px] bg-[#9dbcf2] px-8 py-3 text-center text-[18px] font-black text-black shadow-[0_8px_18px_rgba(157,188,242,0.35)] transition-all hover:bg-[#8eb1ef] disabled:opacity-50"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showLogin && (
                <LoginModal
                    onClose={() => setShowLogin(false)}
                    callbackUrl={typeof window !== 'undefined' ? window.location.href : '/timetable'}
                />
            )}
        </div>
    );
}

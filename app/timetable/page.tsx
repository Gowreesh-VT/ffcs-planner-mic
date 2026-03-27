'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useTimetable } from '@/lib/TimeTableContext';
import { exportToPDF } from '@/lib/exportToPDF';
import { generateTT } from '@/lib/utils';
import { getSlotViewPayload } from '@/lib/slot-view';
import { fullCourseData, timetableDisplayData } from '@/lib/type';
import { clearPlannerClientCache } from '@/lib/clientCache';
import LoginModal from '@/components/loginPopup';

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

type SelectedSlotState = {
    slot: timetableDisplayData;
    kind: 'theory' | 'lab';
};

const THEORY_SLOT_COLORS = ['#DFFBEE', '#DFFBEE', '#DFFBEE', '#DFFBEE', '#DFFBEE', '#DFFBEE'];
const LAB_SLOT_COLORS = ['#F6F2DD', '#F6F2DD', '#F6F2DD', '#F6F2DD', '#F6F2DD', '#F6F2DD'];
const ACTIVE_THEORY_COLOR = '#B8EDC0';
const ACTIVE_LAB_COLOR = '#F9EEAA';

function getSlotColor(code: string, allCodes: string[], kind: 'theory' | 'lab' = 'theory') {
    const unique = [...new Set(allCodes)];
    const idx = unique.indexOf(code);
    const palette = kind === 'lab' ? LAB_SLOT_COLORS : THEORY_SLOT_COLORS;
    return palette[idx % palette.length];
}

export default function TimetablePage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const { timetableData, setTimetableData } = useTimetable();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedSlot, setSelectedSlot] = useState<SelectedSlotState | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState('');
    const [clashMessage, setClashMessage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [timetableTitle, setTimetableTitle] = useState('My Schedule');
    const [showLoginModal, setShowLoginModal] = useState(false);

    const { scheduleRows, leftTimes, rightTimes } = useMemo(() => getSlotViewPayload(), []);

    const hasInitialized = useRef(false);

    // Load from cookies and generate if context is empty
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;



        if (!timetableData || timetableData.length === 0) {
            const savedCoursesRaw = getCookie('generatedTimetableCourses') || getCookie('preferenceCourses');
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

    const currentTT = timetableData?.[currentIndex] || [];
    const allCodes = currentTT.map(s => s.courseCode);
    const selectedSlotAccent = selectedSlot
        ? getSlotColor(selectedSlot.slot.courseCode, allCodes, selectedSlot.kind)
        : '#d9c9f7';
    const selectedSlotBackground = selectedSlot?.kind === 'lab'
        ? 'linear-gradient(180deg, #FFF3B0 0%, #F9EEAA 100%)'
        : 'linear-gradient(180deg, #D6F6DA 0%, #B8EDC0 100%)';

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    }, []);

    const handleSave = async (customTitle?: string, options?: { skipRedirect?: boolean }) => {
        if (!session?.user?.email) {
            setShowLoginModal(true);
            return null;
        }
        if (isSaving || currentTT.length === 0) return null;

        setIsSaving(true);
        try {
            const editingTimetableId = getCookie('editingTimetableId');

            const slotsData = currentTT.map(s => ({
                slot: s.slotName,
                courseCode: s.courseCode,
                courseName: s.courseName,
                facultyName: s.facultyName,
            }));

            if (editingTimetableId) {
                // Update existing timetable
                const title = customTitle?.trim() || timetableTitle.trim() || 'My Schedule';
                const res = await axios.patch(`/api/timetables/${editingTimetableId}`, {
                    title,
                    slots: slotsData,
                });

                if (res.data.success) {
                    if (!options?.skipRedirect) {
                        showToast('Timetable updated successfully!');
                        setTimeout(() => { router.refresh(); router.push('/saved'); }, 1200);
                    }
                    return { _id: editingTimetableId, shareId: null };
                }
            } else {
                // Create new timetable
                const title = customTitle?.trim() || timetableTitle.trim() || 'My Schedule';
                const res = await axios.post('/api/save-timetable', {
                    title,
                    slots: slotsData,
                    owner: session.user.email,
                    isPublic: false,
                });

                if (res.data.success) {
                    // Update editing cookie so subsequent shares bind to the new save!
                    setCookie('editingTimetableId', res.data.timetable._id);


                    if (!options?.skipRedirect) {
                        showToast('Timetable saved successfully!');
                        setTimeout(() => {
                            clearPlannerClientCache({ includeEditingState: true });
                            router.refresh();
                            router.push('/saved');
                        }, 1200);
                    }
                    return res.data.timetable;
                }
            }
        } catch (error: any) {
            const detail = error?.response?.data?.detail || error?.response?.data?.error || error?.message || 'Unknown error';
            console.error('Save error:', detail, error);
            showToast(`Failed to save: ${detail}`);
        } finally {
            setIsSaving(false);
        }
        return null;
    };

    const handleDownload = async () => {
        console.log('handleDownload called', { currentTTLength: currentTT.length });
        if (currentTT.length === 0) {
            showToast('No timetable data to download.');
            window.alert('No timetable data to download.');
            return;
        }
        showToast('Preparing PDF...');
        try {
            await exportToPDF('rat', `timetable-option-${currentIndex + 1}.pdf`);
            showToast('PDF downloaded successfully!');
        } catch (error: any) {
            console.error('PDF error:', error);
            showToast('Failed to generate PDF. Please try again.');
            window.alert('Failed to generate PDF: ' + (error?.message || String(error)));
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
            setShowLoginModal(true);
            return;
        }
        if (currentTT.length === 0) {
            window.alert('No timetable data to share.');
            showToast('No timetable data to share.');
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
                const saved = await handleSave(timetableTitle, { skipRedirect: true });
                console.log('Save result:', saved);
                if (saved?.shareId) {
                    shareId = saved.shareId;
                } else if (saved?._id) {
                    const res = await axios.get(`/api/timetables/${saved._id}`);
                    shareId = res.data.shareId;
                } else {
                    window.alert('Failed to save timetable for sharing (null result).');
                    showToast('Failed to save timetable for sharing.');
                    return;
                }
            }

            console.log('Got shareId:', shareId);
            if (!shareId) {
                window.alert('Could not generate or find shareId.');
                showToast('Could not generate share link.');
                return;
            }

            const url = `${window.location.origin}/share/${shareId}`;
            console.log('Attempting to copy:', url);
            const copied = await copyToClipboard(url);
            if (copied) {
                window.alert('Share link copied!\n' + url);
                showToast('Share link copied to clipboard!');
            } else {
                window.prompt('Copy this share link:', url);
            }
        } catch (error: any) {
            const detail = error?.response?.data?.detail || error?.response?.data?.error || error?.message || 'Unknown error';
            console.error('Share error:', detail, error);
            showToast(`Failed to share: ${detail}`);
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
        <div className="h-screen bg-[#F5E6D3] font-sans flex flex-col justify-between overflow-hidden items-center">
            {/* Toast */}
            {toast && (
                <div className="fixed top-8 right-8 z-[100] bg-[#1a1a2e] text-white px-8 py-4 rounded-2xl shadow-2xl text-[14px] font-bold animate-[slideIn_0.3s_ease] border border-white/10">
                    {toast}
                </div>
            )}


            <div className="w-[98%] max-w-[1800px] flex-1 min-h-0 flex flex-col bg-[#FFFBF0] rounded-[32px] p-[clamp(16px,2vw,32px)] my-[clamp(12px,2vh,32px)] pb-4 shadow-sm mx-auto">
                <div className="flex items-center gap-4 pb-4 ml-2 shrink-0">
                    <h1 className="text-[26px] font-bold text-black">Timetables Generated</h1>

                </div>

                {/* Main Table Container */}
                <div className="bg-white rounded-[16px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-auto border border-white flex-1 min-h-0 custom-scrollbar" id="timetable-grid">
                    <div id="rat"> <table className="w-full border-collapse bg-white overflow-hidden text-center rounded-[16px]">
                        <thead>
                            <tr className="border-b-[2px] border-white h-[44px]">
                                <th className="p-2 text-center text-[11px] font-extrabold text-black border-r-[2px] border-white bg-white w-[5vw]">Theory Hours</th>
                                {[...leftTimes, { theory: '', lab: '' }, ...rightTimes].map((t, i) => (
                                    <th key={i} className={`p-1 pt-3 pb-3 text-center text-[10px] leading-tight font-bold text-black border-r-[2px] border-white bg-white ${i === 6 ? 'w-[36px] px-0' : 'min-w-[65px]'}`}>
                                        {t.theory ? t.theory.split('-').map((part, idx, arr) => (
                                            <span key={idx} className="block whitespace-nowrap">{part}{idx < arr.length - 1 ? '-' : ''}</span>
                                        )) : null}
                                    </th>
                                ))}
                            </tr>
                            <tr className="border-b-[2px] border-white h-[44px]">
                                <th className="p-2 text-center text-[11px] font-extrabold text-black border-r-[2px] border-white bg-white w-[5vw]">Lab Hours</th>
                                {[...leftTimes, { theory: '', lab: '' }, ...rightTimes].map((t, i) => (
                                    <th key={i} className={`p-1 pt-3 pb-3 text-center text-[10px] leading-tight font-bold text-black border-r-[2px] border-white bg-white ${i === 6 ? 'w-[36px] px-0' : 'min-w-[65px]'}`}>
                                        {t.lab ? t.lab.split('-').map((part, idx, arr) => (
                                            <span key={idx} className="block whitespace-nowrap">{part}{idx < arr.length - 1 ? '-' : ''}</span>
                                        )) : null}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {scheduleRows.map((row, rowIdx) => (
                                <tr key={row.day} className="group border-b-[2px] border-white">
                                    <td className="p-0 text-[11px] font-bold text-black text-center align-middle w-[5vw] border-r-[2px] border-white bg-white">{row.day}</td>
                                    {Array.from({ length: 13 }).map((_, colIdx) => {
                                        if (colIdx === 6) {
                                            // Space for Lunch
                                            const lunchLetters = ['L', 'U', 'N', 'C', 'H'];
                                            return (
                                                <td key="lunch-spacer" className="w-[36px] border-r-[2px] border-white align-middle bg-[#f8f9fa]">
                                                    <div className="flex flex-col items-center justify-center h-full py-2">
                                                        <span className="text-[11px] font-black text-black/40">
                                                            {lunchLetters[rowIdx]}
                                                        </span>
                                                    </div>
                                                </td>
                                            )
                                        }
                                        const actualColIdx = colIdx > 6 ? colIdx - 1 : colIdx;
                                        const theoryCell = theoryGrid[rowIdx][colIdx];
                                        const labCell = labGrid[rowIdx][colIdx];

                                        // Get labels from scheduleRows
                                        let theoryLabel = '';
                                        let labLabel = '';
                                        if (colIdx < 6) {
                                            theoryLabel = row.theoryLeft[colIdx].label;
                                            labLabel = row.labLeft[colIdx].label;
                                        } else {
                                            theoryLabel = row.theoryRight[colIdx - 7].label;
                                            labLabel = row.labRight[colIdx - 7].label;
                                        }

                                        const isSelectedTheory =
                                            selectedSlot?.kind === 'theory' &&
                                            !!theoryCell &&
                                            theoryCell.courseCode === selectedSlot.slot.courseCode &&
                                            theoryCell.slotName === selectedSlot.slot.slotName &&
                                            theoryCell.facultyName === selectedSlot.slot.facultyName;

                                        const isSelectedLab =
                                            selectedSlot?.kind === 'lab' &&
                                            !!labCell &&
                                            labCell.courseCode === selectedSlot.slot.courseCode &&
                                            labCell.slotName === selectedSlot.slot.slotName &&
                                            labCell.facultyName === selectedSlot.slot.facultyName;

                                        const shouldDimTheory = !!selectedSlot && !isSelectedTheory;
                                        const shouldDimLab = !!selectedSlot && !isSelectedLab;

                                        return (
                                            <td key={colIdx} className="align-top border-r-[2px] border-white p-0 bg-white min-w-[65px]">
                                                <div className="flex flex-col h-full w-full">
                                                    {/* Theory Slot */}
                                                    <div
                                                        className={`flex-1 flex flex-col items-center justify-center min-h-[46px] py-[3px] transition-all duration-300 cursor-pointer relative ${theoryCell ? 'z-10' : ''} ${isSelectedTheory ? 'z-[105] rounded-[4px] shadow-[0_0_0_1px_rgba(255,255,255,0.9),0_6px_18px_rgba(0,0,0,0.18)] scale-[1.03]' : ''}`}
                                                        style={{
                                                            backgroundColor: isSelectedTheory
                                                                ? ACTIVE_THEORY_COLOR
                                                                : theoryCell
                                                                    ? getSlotColor(theoryCell.courseCode, allCodes, 'theory')
                                                                    : '#f8fdfb',
                                                            filter: shouldDimTheory ? 'blur(0.35px) saturate(1)' : 'none',
                                                            opacity: shouldDimTheory ? 0.9 : 1,
                                                            transform: isSelectedTheory ? 'scale(1.03)' : 'none',
                                                        }}
                                                        onClick={() => theoryCell && setSelectedSlot({ slot: theoryCell, kind: 'theory' })}
                                                    >
                                                        {theoryCell ? (
                                                            <>
                                                                <span className="text-[10px] font-extrabold text-black leading-tight">{theoryLabel}</span>
                                                                <span className="text-[7.5px] font-extrabold text-black opacity-80 uppercase mt-[1px] truncate px-1 max-w-[62px] leading-tight">{theoryCell.courseCode}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-[#4ea075] opacity-40">{theoryLabel}</span>
                                                        )}
                                                    </div>

                                                    {/* White separator between Theory and Lab */}
                                                    <div className="h-[2px] w-full bg-white flex-shrink-0" />

                                                    {/* Lab Slot */}
                                                    <div
                                                        className={`flex-1 flex flex-col items-center justify-center min-h-[46px] py-[3px] transition-all duration-300 cursor-pointer relative ${labCell ? 'z-10' : ''} ${isSelectedLab ? 'z-[105] rounded-[4px] shadow-[0_0_0_1px_rgba(255,255,255,0.9),0_6px_18px_rgba(0,0,0,0.18)] scale-[1.03]' : ''}`}
                                                        style={{
                                                            backgroundColor: isSelectedLab
                                                                ? ACTIVE_LAB_COLOR
                                                                : labCell
                                                                    ? getSlotColor(labCell.courseCode, allCodes, 'lab')
                                                                    : '#fbf9f0',
                                                            filter: shouldDimLab ? 'blur(0.35px) saturate(1)' : 'none',
                                                            opacity: shouldDimLab ? 0.9 : 1,
                                                            transform: isSelectedLab ? 'scale(1.03)' : 'none',
                                                        }}
                                                        onClick={() => labCell && setSelectedSlot({ slot: labCell, kind: 'lab' })}
                                                    >
                                                        {labCell ? (
                                                            <>
                                                                <span className="text-[10px] font-extrabold text-black leading-tight">{labLabel}</span>
                                                                <span className="text-[7.5px] font-extrabold text-black opacity-80 uppercase mt-[1px] truncate px-1 max-w-[62px] leading-tight">{labCell.courseCode}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-[#d4a044] opacity-40">{labLabel}</span>
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
                    </div>
                    {/* Pagination & Action Controls */}
                    <div className="flex flex-wrap items-center justify-between p-3 py-2 mt-auto mb-1 gap-3 shrink-0">
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
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={handleShare}
                                className="flex items-center justify-center gap-2 bg-[#A0C4FF] hover:bg-[#8ab2f2] text-black font-semibold py-2.5 px-6 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95 text-[14px] min-w-[140px]"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" /></svg>
                                Share
                            </button>
                            <button
                                onClick={handleDownload}
                                className="flex items-center justify-center gap-2 bg-[#C8F7DC] hover:bg-[#b0eac8] text-black font-semibold py-2.5 px-6 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95 text-[14px] min-w-[140px]"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                                Download
                            </button>
                            <button
                                onClick={() => {
                                    if (!session?.user?.email) {
                                        setShowLoginModal(true);
                                        return;
                                    }
                                    setShowSaveModal(true);
                                }}
                                disabled={isSaving}
                                className="flex items-center justify-center gap-2 bg-[#F9A8D4]/60 hover:bg-[#F9A8D4]/80 text-black font-semibold py-2.5 px-6 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 text-[14px] min-w-[140px]"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="bg-white border-t border-gray-300 py-4 px-[clamp(16px,2vw,32px)] shadow-lg animate-lucid-fade-up-delayed w-full mt-auto shrink-0">
                <div className="flex flex-wrap items-center justify-between max-w-[1800px] mx-[1%] lg:mx-auto gap-3">
                    <div className="flex items-center gap-3">
                        {session?.user?.image ? (
                            <img src={session.user.image} alt="User avatar" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                        ) : (
                            <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                        )}
                        <span className="text-gray-700 text-sm font-semibold">{session?.user?.name || "Guest"}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {[1, 2, 3, 4].map((num) => (
                            <button
                                key={num}
                                onClick={() => {
                                    if (num === 1) router.push('/preferences');
                                    if (num === 2) router.push('/courses');
                                    if (num === 3) router.push('/timetable');
                                    if (num === 4) router.push('/saved');
                                }}
                                className={`px-6 py-2.5 rounded-xl font-bold text-[15px] cursor-pointer transition-all ${num === 3 ? 'bg-[#A0C4FF] text-black' : 'bg-[#A0C4FF]/30 text-gray-700 hover:bg-[#A0C4FF]/40'}`}
                            >
                                {num === 3 ? '3. Timetable' : num}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => router.push('/courses')}
                            className="px-10 py-3 bg-[#f1eacb] border-2 border-[#A0C4FF] rounded-xl font-bold text-[15px] hover:bg-[#E8DDB8] text-black transition-transform duration-200 hover:-translate-y-0.5 active:scale-95 shadow-sm hover:shadow-md cursor-pointer"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => {
                                if (!session?.user?.email) {
                                    setShowLoginModal(true);
                                    return;
                                }
                                router.push('/saved');
                            }}
                            className="px-12 py-3 rounded-xl font-bold text-[15px] bg-[#A0C4FF] hover:bg-[#90B4EF] text-black transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Popover */}
            {selectedSlot && (
                <div className="slot-detail-backdrop fixed inset-0 z-[100] pointer-events-none" />
            )}
            {selectedSlot && (
                <div className="slot-detail-overlay fixed inset-0 z-[110] flex items-center justify-center px-4" onClick={() => setSelectedSlot(null)}>
                    <div
                        className="slot-detail-dialog relative animate-[scaleIn_0.2s_ease] px-7 pt-8 pb-7 sm:px-7 sm:pt-8 sm:pb-7"
                        style={{ borderColor: `${selectedSlotAccent}99`, background: selectedSlotBackground }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelectedSlot(null)}
                            aria-label="Close slot details"
                            className="slot-detail-close absolute right-4 top-3 text-[34px] font-light text-black transition-transform duration-200 hover:scale-110 cursor-pointer"
                        >
                            ×
                        </button>

                        <div className="text-center mb-6">
                            <h2 className="text-[24px] font-black leading-tight text-black mb-1">
                                {selectedSlot.slot.courseCode} - {selectedSlot.slot.courseName}
                            </h2>
                            <p className="text-[17px] font-extrabold text-black/90">
                                Slot: {selectedSlot.slot.slotName}
                            </p>
                        </div>

                        <div className="mt-6 space-y-4 text-[16px] text-black">
                            <div className="slot-detail-field">
                                <span className="font-bold min-w-[120px]">Faculty Name:</span>
                                <span className="font-semibold">{selectedSlot.slot.facultyName || '-'}</span>
                            </div>
                            <div className="slot-detail-field">
                                <span className="font-bold min-w-[120px]">Course Name:</span>
                                <span className="font-semibold">{selectedSlot.slot.courseName || '-'}</span>
                            </div>
                            <div className="slot-detail-field">
                                <span className="font-bold min-w-[120px]">Course Code:</span>
                                <span className="font-semibold">{selectedSlot.slot.courseCode || '-'}</span>
                            </div>
                            <div className="slot-detail-field">
                                <span className="font-bold min-w-[120px]">Timing:</span>
                                <span className="font-semibold">{selectedSlot.slot.slotName || '-'}</span>
                            </div>
                            <div className="slot-detail-field">
                                <span className="font-bold min-w-[120px]">Classroom:</span>
                                <span className="font-semibold">Main Campus - TBD</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Login Modal */}
            {showLoginModal && (
                <LoginModal onClose={() => setShowLoginModal(false)} callbackUrl="/timetable" />
            )}

            {/* Save Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowSaveModal(false)}>
                    <div
                        className="bg-white rounded-[24px] shadow-2xl p-8 w-[90%] max-w-[400px] relative animate-[scaleIn_0.2s_ease]"
                        onClick={e => e.stopPropagation()}
                    >
                        <h2 className="text-[24px] font-black text-black mb-4">Save Timetable</h2>
                        <input
                            type="text"
                            value={timetableTitle}
                            onChange={(e) => setTimetableTitle(e.target.value)}
                            className="w-full p-4 border-2 border-gray-100 rounded-xl mb-6 text-black font-semibold text-[16px] focus:border-[#A0C4FF] focus:ring-2 focus:ring-[#A0C4FF]/20 outline-none transition-all placeholder:font-medium"
                            placeholder="Enter a title..."
                            autoFocus
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowSaveModal(false)}
                                className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowSaveModal(false);
                                    handleSave(timetableTitle);
                                }}
                                disabled={isSaving || !timetableTitle.trim()}
                                className="px-6 py-2.5 rounded-xl font-bold bg-[#A0C4FF] text-black hover:bg-[#8ab2f2] transition-colors disabled:opacity-50"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

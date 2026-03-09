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

const SLOT_COLORS = ['#C8F7DC', '#E0D4F5', '#FFF3B0', '#FFD6E0', '#BDD7FF', '#B8F0E0'];

function getSlotColor(code: string, allCodes: string[]) {
    const unique = [...new Set(allCodes)];
    const idx = unique.indexOf(code);
    return SLOT_COLORS[idx % SLOT_COLORS.length];
}

export default function TimetablePage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const { timetableData, setTimetableData } = useTimetable();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedSlot, setSelectedSlot] = useState<timetableDisplayData | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState('');
    const [clashMessage, setClashMessage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [timetableTitle, setTimetableTitle] = useState('My Schedule');

    const { scheduleRows, leftTimes, rightTimes } = useMemo(() => getSlotViewPayload(), []);

    const hasInitialized = useRef(false);

    // Load from cookies and generate if context is empty
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        // Check if we're editing an existing timetable
        const editingTitle = getCookie('editingTimetableTitle');
        if (editingTitle) {
            setEditingTimetableTitle(editingTitle);
        }

        if (!timetableData || timetableData.length === 0) {
            const savedCoursesRaw = getCookie('preferenceCourses');
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

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    }, []);

    const handleSave = async (isPublic = false, customTitle?: string) => {
        if (!session?.user?.email) {
            showToast('Please sign in to save or share your timetable.');
            return null;
        }
        if (isSaving || currentTT.length === 0) return null;
        
        setIsSaving(true);
        try {
            const editingTimetableId = getCookie('editingTimetableId');
            const editingTimetableTitle = getCookie('editingTimetableTitle');
            
            const slotsData = currentTT.map(s => ({
                slot: s.slotName,
                courseCode: s.courseCode,
                courseName: s.courseName,
                facultyName: s.facultyName,
            }));

            if (editingTimetableId) {
                // Update existing timetable
                const res = await axios.patch(`/api/timetables/${editingTimetableId}`, {
                    slots: slotsData,
                    isPublic,
                });

                if (res.data.success) {
                    // Keep editing cookies so user can continue to update the same timetable
                    if (!isPublic) showToast('Timetable updated successfully!');
                    return { _id: editingTimetableId, shareId: null };
                }
            } else {
                // Create new timetable
                const title = isPublic ? 'Shared Timetable' : (prompt('Enter a title for this timetable:', 'My Schedule') || 'Untitled');
                const res = await axios.post('/api/save-timetable', {
                    title,
                    slots: slotsData,
                    owner: session.user.email,
                    isPublic,
                });

                if (res.data.success) {
                    if (!isPublic) showToast('Timetable saved successfully!');
                    return res.data.timetable;
                }
            }
        } catch (error) {
            console.error('Save error:', error);
            showToast('Failed to save timetable.');
        } finally {
            setIsSaving(false);
        }
        return null;
    };

    const handleDownload = async () => {
        if (currentTT.length === 0) return;
        showToast('Preparing PDF...');
        try {
            await exportToPDF('rat', `timetable-option-${currentIndex + 1}.pdf`);
            showToast('PDF downloaded successfully!');
        } catch (error) {
            console.error('PDF error:', error);
            showToast('Failed to generate PDF.');
        }
    };

    const handleShare = async () => {
        if (!session?.user?.email || currentTT.length === 0) return;
        const editingTimetableId = getCookie('editingTimetableId');
        
        if (editingTimetableId) {
            // Update existing timetable and get its shareId
            await handleSave(true);
            const timetableRes = await axios.get(`/api/timetables/${editingTimetableId}`);
            const shareId = timetableRes.data.shareId;
            if (shareId) {
                const url = `${window.location.origin}/share/${shareId}`;
                await navigator.clipboard.writeText(url);
                showToast('Share link copied to clipboard!');
            }
        } else {
            // Create new timetable
            const saved = await handleSave(true);
            if (saved?.shareId) {
                const url = `${window.location.origin}/share/${saved.shareId}`;
                await navigator.clipboard.writeText(url);
                showToast('Share link copied to clipboard!');
            }
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
        <div className="min-h-screen bg-[#F5E6D3] font-sans flex flex-col items-center justify-between">
            {/* Toast */}
            {toast && (
                <div className="fixed top-8 right-8 z-[100] bg-[#1a1a2e] text-white px-8 py-4 rounded-2xl shadow-2xl text-[14px] font-bold animate-[slideIn_0.3s_ease] border border-white/10">
                    {toast}
                </div>
            )}
            <div className='w-full max-w-[1400px] pt-4 px-6 mx-auto mb-2'>
                <h1 className="text-[22px] font-bold text-black">Timetables Generated</h1>
            </div>

            <div className="w-[95%] max-w-[1400px] bg-[#FFFBF0] rounded-[32px] p-8 my-8 pb-4 shadow-sm">
                <div className="flex items-center gap-4 pb-6 ml-2">
                    <h1 className="text-[26px] font-bold text-black">Timetables Generated</h1>
                    {editingTimetableTitle && (
                        <div className="bg-blue-100 border-2 border-blue-400 rounded-lg px-4 py-2 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span className="text-blue-800 font-semibold text-sm">Editing: {editingTimetableTitle}</span>
                        </div>
                    )}
                </div>

                {/* Main Table Container */}
                <div className="bg-white rounded-[16px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-x-auto border border-white" id="timetable-grid">
                    <div id="rat"> <table className="w-full border-collapse bg-white overflow-hidden text-center rounded-[16px]">
                        <thead>
                            <tr className="border-b-[2px] border-white">
                                <th className="p-2 text-center text-xs font-bold text-black border-r-[2px] border-white bg-white w-[5vw]">Theory Hours</th>
                                {[...leftTimes, { theory: '', lab: '' }, ...rightTimes].map((t, i) => (
                                    <th key={i} className={`p-1 pt-2 pb-2 text-center text-[10px] leading-tight font-bold text-black border-r-[2px] border-white bg-white ${i === 6 ? 'w-[30px] px-0' : 'min-w-[60px]'}`}>
                                        {t.theory ? t.theory.split('-').map((part, idx, arr) => (
                                            <span key={idx} className="block whitespace-nowrap">{part}{idx < arr.length - 1 ? '-' : ''}</span>
                                        )) : null}
                                    </th>
                                ))}
                            </tr>
                            <tr className="border-b-[2px] border-white">
                                <th className="p-2 text-center text-xs font-bold text-black border-r-[2px] border-white bg-white w-[5vw]">Lab Hours</th>
                                {[...leftTimes, { theory: '', lab: '' }, ...rightTimes].map((t, i) => (
                                    <th key={i} className={`p-1 pt-2 pb-2 text-center text-[10px] leading-tight font-bold text-black border-r-[2px] border-white bg-white ${i === 6 ? 'w-[30px] px-0' : 'min-w-[60px]'}`}>
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
                                                <td key="lunch-spacer" className="w-[30px] border-r-[2px] border-white align-middle bg-[#f8f9fa]">
                                                    <div className="flex flex-col items-center justify-center h-full py-1">
                                                        <span className="text-[11px] font-black text-black opacity-80">
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

                                        return (
                                            <td key={colIdx} className="align-top border-r-[2px] border-white p-0 bg-white">
                                                <div className="flex flex-col h-full w-full">
                                                    {/* Theory Slot */}
                                                    <div
                                                        className={`flex-1 flex flex-col items-center justify-center min-h-[36px] py-[2px] transition-all cursor-pointer ${theoryCell ? 'z-10' : ''}`}
                                                        style={{
                                                            backgroundColor: theoryCell ? getSlotColor(theoryCell.courseCode, allCodes) : '#e6f9ed',
                                                        }}
                                                        onClick={() => theoryCell && setSelectedSlot(theoryCell)}
                                                    >
                                                        {theoryCell ? (
                                                            <>
                                                                <span className="text-[10px] font-bold text-black leading-tight">{theoryLabel}</span>
                                                                <span className="text-[7.5px] font-bold text-black opacity-80 uppercase mt-[1px] truncate px-1 max-w-[65px] leading-tight">{theoryCell.courseCode}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-[#4ea075]">{theoryLabel}</span>
                                                        )}
                                                    </div>

                                                    {/* White separator between Theory and Lab */}
                                                    <div className="h-[2px] w-full bg-white flex-shrink-0" />

                                                    {/* Lab Slot */}
                                                    <div
                                                        className={`flex-1 flex flex-col items-center justify-center min-h-[36px] py-[2px] transition-all cursor-pointer ${labCell ? 'z-10' : ''}`}
                                                        style={{
                                                            backgroundColor: labCell ? getSlotColor(labCell.courseCode, allCodes) : '#fff6e0',
                                                        }}
                                                        onClick={() => labCell && setSelectedSlot(labCell)}
                                                    >
                                                        {labCell ? (
                                                            <>
                                                                <span className="text-[10px] font-bold text-black leading-tight">{labLabel}</span>
                                                                <span className="text-[7.5px] font-bold text-black opacity-80 uppercase mt-[1px] truncate px-1 max-w-[65px] leading-tight">{labCell.courseCode}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-[#d4a044]">{labLabel}</span>
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
                    <div className="flex flex-wrap items-center justify-between p-3 py-2 mt-4 mb-1">
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
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleShare}
                                className="flex items-center gap-2 bg-[#A0C4FF] hover:bg-[#8ab2f2] text-black font-semibold py-2.5 px-6 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95 text-[14px]"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" /></svg>
                                Share
                            </button>
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 bg-[#C8F7DC] hover:bg-[#b0eac8] text-black font-semibold py-2.5 px-6 rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95 text-[14px]"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                                Download
                            </button>
                            <button
                                onClick={() => setShowSaveModal(true)}
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

            {/* Bottom Navigation */}
            <div className="bg-white border-t border-gray-300 py-4 px-8 shadow-lg animate-lucid-fade-up-delayed w-full mt-auto">
                <div className="flex items-center justify-between max-w-[1400px] mx-auto">
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
                                className={`px-5 py-2 rounded-lg font-semibold text-sm cursor-pointer ${num === 3 ? 'bg-[#A0C4FF] text-black' : 'bg-[#A0C4FF]/40 text-gray-700'}`}
                            >
                                {num === 3 ? '3. Timetable' : num}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                // Keep editing state when going back to make more changes
                                router.push('/courses');
                            }}
                            className="px-8 py-2.5 border-2 border-gray-400 rounded-lg font-semibold text-sm hover:bg-gray-50 text-black transition"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => router.push('/saved')}
                            className="px-10 py-2.5 rounded-lg font-semibold text-sm bg-[#A0C4FF] hover:bg-[#90B4EF] text-black transition-all duration-200 cursor-pointer"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Popover */}
            {selectedSlot && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/20 backdrop-blur-[4px]" onClick={() => setSelectedSlot(null)}>
                    <div
                        className="bg-white rounded-[40px] shadow-2xl p-12 w-[90%] max-w-[500px] relative animate-[scaleIn_0.2s_ease] border-4"
                        style={{ borderColor: getSlotColor(selectedSlot.courseCode, allCodes) }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelectedSlot(null)}
                            className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors text-black"
                        >
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>

                        <div className="mb-10">
                            <span className="px-5 py-2 rounded-full text-[12px] font-black bg-gray-100 text-gray-500 uppercase tracking-widest mb-4 inline-block">Course Details</span>
                            <h2 className="text-[32px] font-black text-black leading-tight mt-2">{selectedSlot.courseCode}</h2>
                            <p className="text-[18px] font-bold text-gray-600 mt-2">{selectedSlot.courseName}</p>
                        </div>

                        <div className="space-y-8">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-[20px]">👨‍🏫</div>
                                <div>
                                    <p className="text-[12px] font-black text-gray-300 uppercase tracking-widest mb-1">Faculty</p>
                                    <p className="text-[18px] font-bold text-black">{selectedSlot.facultyName}</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-[20px]">🕒</div>
                                <div>
                                    <p className="text-[12px] font-black text-gray-300 uppercase tracking-widest mb-1">Slot</p>
                                    <p className="text-[18px] font-bold text-black">{selectedSlot.slotName}</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-[20px]">📍</div>
                                <div>
                                    <p className="text-[12px] font-black text-gray-300 uppercase tracking-widest mb-1">Classroom</p>
                                    <p className="text-[18px] font-bold text-black">Main Campus - TBD</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
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
                                    handleSave(false, timetableTitle);
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

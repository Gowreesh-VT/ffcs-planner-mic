'use client';

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { getSlotViewPayload } from "@/lib/slot-view";

type SharedSlot = {
    slot: string;
    courseCode: string;
    courseName: string;
    facultyName: string;
};

const SLOT_COLORS = ['#C8F7DC', '#E0D4F5', '#FFF3B0', '#FFD6E0', '#BDD7FF', '#B8F0E0'];

function getSlotColor(code: string, allCodes: string[]) {
    const unique = [...new Set(allCodes)];
    const idx = unique.indexOf(code);
    return SLOT_COLORS[idx % SLOT_COLORS.length];
}

export default function SharePage() {
    const { shareId } = useParams();
    const [timetable, setTimetable] = useState<SharedSlot[]>([]);
    const [title, setTitle] = useState("");
    const [loading, setLoading] = useState(true);
    const [selectedSlot, setSelectedSlot] = useState<SharedSlot | null>(null);

    const { scheduleRows, leftTimes, rightTimes } = useMemo(() => getSlotViewPayload(), []);

    useEffect(() => {
        if (!shareId) return;

        axios.get(`/api/shared-timetable/${shareId}`)
            .then(res => {
                if (res.data.success) {
                    setTitle(res.data.timetable.title);
                    setTimetable(res.data.timetable.slots);
                }
            })
            .finally(() => setLoading(false));
    }, [shareId]);

    const allCodes = timetable.map(s => s.courseCode);

    const theoryGrid: (SharedSlot | null)[][] = Array.from({ length: 5 }, () => Array(13).fill(null));
    const labGrid: (SharedSlot | null)[][] = Array.from({ length: 5 }, () => Array(13).fill(null));

    timetable.forEach(s => {
        const parts = s.slot.split(/\+|__/);
        parts.forEach((p: string) => {
            const clean = p.trim();
            scheduleRows.forEach((row, dayIdx) => {
                row.theoryLeft.forEach((cell, colIdx) => { if (cell.key === clean) theoryGrid[dayIdx][colIdx] = s; });
                row.theoryRight.forEach((cell, colIdx) => { if (cell.key === clean) theoryGrid[dayIdx][colIdx + 7] = s; });
                row.labLeft.forEach((cell, colIdx) => { if (cell.key === clean) labGrid[dayIdx][colIdx] = s; });
                row.labRight.forEach((cell, colIdx) => { if (cell.key === clean) labGrid[dayIdx][colIdx + 7] = s; });
            });
        });
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-cream flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#A0C4FF] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[16px] font-bold text-gray-700">Loading timetable...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5E6D3] font-sans flex flex-col items-center py-8">
            <div className="w-[95%] max-w-[1400px] bg-[#FFFBF0] rounded-[32px] p-8 my-8 pb-4 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 ml-2">
                    <div className="flex items-center gap-4">
                        <h1 className="text-[26px] font-bold text-black">{title || 'Shared Timetable'}</h1>
                        <div className="bg-green-100 border-2 border-green-400 rounded-lg px-4 py-2 flex items-center gap-2">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            <span className="text-green-800 font-semibold text-sm">View Only</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[16px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-x-auto border border-white">
                    <table className="w-full border-collapse bg-white overflow-hidden text-center rounded-[16px]">
                        <thead>
                            <tr className="border-b-[2px] border-white">
                                <th className="p-2 text-center text-xs font-bold text-black border-r-[2px] border-white bg-white w-[5vw] min-w-[70px]">Theory Hours</th>
                                {[...leftTimes, { theory: '', lab: '' }, ...rightTimes].map((t, i) => (
                                    <th key={i} className={`p-1 pt-2 pb-2 text-center text-[10px] leading-tight font-bold text-black border-r-[2px] border-white bg-white ${i === 6 ? 'w-[30px] px-0' : 'min-w-[60px]'}`}>
                                        {t.theory ? t.theory.split('-').map((part, idx, arr) => (
                                            <span key={idx} className="block whitespace-nowrap">{part}{idx < arr.length - 1 ? '-' : ''}</span>
                                        )) : null}
                                    </th>
                                ))}
                            </tr>
                            <tr className="border-b-[2px] border-white">
                                <th className="p-2 text-center text-xs font-bold text-black border-r-[2px] border-white bg-white w-[5vw] min-w-[70px]">Lab Hours</th>
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
                                    <td className="p-0 text-[11px] font-bold text-black text-center align-middle w-[5vw] min-w-[70px] border-r-[2px] border-white bg-white">{row.day}</td>
                                    {Array.from({ length: 13 }).map((_, colIdx) => {
                                        if (colIdx === 6) {
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
                                        
                                        const theoryCell = theoryGrid[rowIdx][colIdx];
                                        const labCell = labGrid[rowIdx][colIdx];

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
                                                        className={`flex-1 flex flex-col items-center justify-center min-h-[40px] py-[4px] transition-all cursor-pointer ${theoryCell ? 'z-10 hover:shadow-sm' : ''}`}
                                                        style={{ backgroundColor: theoryCell ? getSlotColor(theoryCell.courseCode, allCodes) : '#e6f9ed' }}
                                                        onClick={() => theoryCell && setSelectedSlot(theoryCell)}
                                                    >
                                                        {theoryCell ? (
                                                            <>
                                                                <span className="text-[10px] font-bold text-black leading-tight">{theoryLabel}</span>
                                                                <span className="text-[8px] font-bold text-black opacity-80 uppercase mt-[2px] truncate px-1 max-w-[65px] leading-tight">{theoryCell.courseCode}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-[#4ea075]">{theoryLabel}</span>
                                                        )}
                                                    </div>

                                                    {/* Divider */}
                                                    <div className="h-[2px] w-full bg-white flex-shrink-0" />

                                                    {/* Lab Slot */}
                                                    <div
                                                        className={`flex-1 flex flex-col items-center justify-center min-h-[40px] py-[4px] transition-all cursor-pointer ${labCell ? 'z-10 hover:shadow-sm' : ''}`}
                                                        style={{ backgroundColor: labCell ? getSlotColor(labCell.courseCode, allCodes) : '#fff6e0' }}
                                                        onClick={() => labCell && setSelectedSlot(labCell)}
                                                    >
                                                        {labCell ? (
                                                            <>
                                                                <span className="text-[10px] font-bold text-black leading-tight">{labLabel}</span>
                                                                <span className="text-[8px] font-bold text-black opacity-80 uppercase mt-[2px] truncate px-1 max-w-[65px] leading-tight">{labCell.courseCode}</span>
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
            </div>

            {/* Popover */}
            {selectedSlot && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/20 backdrop-blur-[4px]" onClick={() => setSelectedSlot(null)}>
                    <div
                        className="bg-white rounded-[32px] shadow-2xl p-10 w-[90%] max-w-[450px] relative animate-[scaleIn_0.2s_ease] border-4"
                        style={{ borderColor: getSlotColor(selectedSlot.courseCode, allCodes) }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelectedSlot(null)}
                            className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors text-black"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>

                        <div className="mb-8 pr-8">
                            <span className="px-4 py-1.5 rounded-full text-[11px] font-black bg-gray-100 text-gray-500 uppercase tracking-widest mb-4 inline-block">Course Details</span>
                            <h2 className="text-[28px] font-black text-black leading-tight mt-1">{selectedSlot.courseCode}</h2>
                            <p className="text-[16px] font-bold text-gray-600 mt-2 leading-snug">{selectedSlot.courseName}</p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex gap-4 items-center">
                                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-[20px] flex-shrink-0">👨‍🏫</div>
                                <div>
                                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Faculty</p>
                                    <p className="text-[16px] font-bold text-black">{selectedSlot.facultyName}</p>
                                </div>
                            </div>
                            <div className="flex gap-4 items-center">
                                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-[20px] flex-shrink-0">🕒</div>
                                <div>
                                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Slot</p>
                                    <p className="text-[16px] font-bold text-black">{selectedSlot.slot}</p>
                                </div>
                            </div>
                            <div className="flex gap-4 items-center">
                                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-[20px] flex-shrink-0">📍</div>
                                <div>
                                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Classroom</p>
                                    <p className="text-[16px] font-bold text-black">Main Campus - TBD</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

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

const theoryGrid: (SharedSlot | null)[][] =
Array.from({ length: 5 }, () => Array(13).fill(null));

const labGrid: (SharedSlot | null)[][] =
Array.from({ length: 5 }, () => Array(13).fill(null));

timetable.forEach(s => {


const parts = s.slot.split(/\+|__/);

parts.forEach((p: string) => {

  const clean = p.trim();

  scheduleRows.forEach((row, dayIdx) => {

    row.theoryLeft.forEach((cell, colIdx) => {
      if (cell.key === clean)
        theoryGrid[dayIdx][colIdx] = s;
    });

    row.theoryRight.forEach((cell, colIdx) => {
      if (cell.key === clean)
        theoryGrid[dayIdx][colIdx + 7] = s;
    });

    row.labLeft.forEach((cell, colIdx) => {
      if (cell.key === clean)
        labGrid[dayIdx][colIdx] = s;
    });

    row.labRight.forEach((cell, colIdx) => {
      if (cell.key === clean)
        labGrid[dayIdx][colIdx + 7] = s;
    });

  });

});


});

if (loading) {
return ( <div className="min-h-screen flex items-center justify-center">
Loading timetable... </div>
);
}

return (


<div className="min-h-screen bg-[#F5E6D3] p-10">

  <h1 className="text-3xl font-bold text-center mb-8">
    Shared Timetable
  </h1>

  <div className="bg-white rounded-2xl p-6 shadow overflow-x-auto">

    <table className="w-full border-collapse text-center">

      <thead>

        <tr>
          <th className="p-2 text-xs font-bold">Theory Hours</th>

          {[...leftTimes, { theory: '', lab: '' }, ...rightTimes].map((t, i) => (
            <th key={i} className="text-xs">
              {t.theory}
            </th>
          ))}
        </tr>

      </thead>

      <tbody>

        {scheduleRows.map((row, rowIdx) => (

          <tr key={row.day}>

            <td className="font-bold text-sm">
              {row.day}
            </td>

            {Array.from({ length: 13 }).map((_, colIdx) => {

              if (colIdx === 6) {
                return (
                  <td key={colIdx} className="border w-4"></td>
                );
              }

              const theoryCell = theoryGrid[rowIdx][colIdx];

              return (

                <td
                  key={colIdx}
                  className="border p-2 text-xs font-semibold"
                  style={{
                    backgroundColor: theoryCell
                      ? getSlotColor(theoryCell.courseCode, allCodes)
                      : "#f8f8f8"
                  }}
                >

                  {theoryCell ? theoryCell.courseCode : ""}

                </td>

              );

            })}

          </tr>

        ))}

      </tbody>

    </table>

  </div>

</div>

);

}

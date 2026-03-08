export type SlotViewCategory = 'theory' | 'lab';

export type SlotButton = {
    key: string;
    label: string;
    category: SlotViewCategory;
};

export type SlotCell = {
    key: string | null;
    label: string;
    kind: 'slot' | 'special' | 'empty';
};

export type SlotScheduleRow = {
    day: string;
    theoryLeft: SlotCell[];
    theoryRight: SlotCell[];
    labLeft: SlotCell[];
    labRight: SlotCell[];
};

export type SlotSelectorPanel = {
    id: string;
    rows: SlotButton[][];
};

export type SlotViewPayload = {
    theoryPanels: SlotSelectorPanel[];
    labPanels: SlotSelectorPanel[];
    scheduleRows: SlotScheduleRow[];
    leftTimes: { theory: string; lab: string }[];
    rightTimes: { theory: string; lab: string }[];
    conflicts: Record<string, string[]>;
};

type Occupancy = {
    day: number;
    columns: number[];
};

const LEFT_TIMES = [
    { theory: '8:00am-8:50am', lab: '8:00am-8:50am' },
    { theory: '8:55am-9:45am', lab: '8:50am-9:40am' },
    { theory: '9:50am-10:40am', lab: '9:50am-10:40am' },
    { theory: '10:45am-11:35am', lab: '10:40am-11:30am' },
    { theory: '11:40am-12:30pm', lab: '11:40am-12:30pm' },
    { theory: '12:30pm-1:20pm', lab: '12:30pm-1:20pm' },
];

const RIGHT_TIMES = [
    { theory: '2:00pm-2:50pm', lab: '2:00pm-2:50pm' },
    { theory: '2:55pm-3:45pm', lab: '2:55pm-3:40pm' },
    { theory: '3:50pm-4:40pm', lab: '3:50pm-4:40pm' },
    { theory: '4:45pm-5:35pm', lab: '4:40pm-5:30pm' },
    { theory: '5:40pm-6:30pm', lab: '5:40pm-6:30pm' },
    { theory: '6:35pm-7:25pm', lab: '6:30pm-7:20pm' },
];

function makeTheoryButton(key: string): SlotButton {
    return { key, label: key, category: 'theory' };
}

function makeLabButton(key: string): SlotButton {
    const labNumber = Number.parseInt(key.slice(1), 10);
    return {
        key,
        label: `${key}+L${labNumber + 1}`,
        category: 'lab',
    };
}

function slotCell(key: string): SlotCell {
    return { key, label: key, kind: 'slot' };
}

function specialCell(label: string): SlotCell {
    return { key: null, label, kind: 'special' };
}

function emptyCell(): SlotCell {
    return { key: null, label: '-', kind: 'empty' };
}

const theoryPanels: SlotSelectorPanel[] = [
    {
        id: 'left-theory',
        rows: [
            ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1'].map(makeTheoryButton),
            ['TA1', 'TB1', 'TC1', 'TD1', 'TE1', 'TF1', 'TG1'].map(makeTheoryButton),
            ['TAA1', 'TBB1', 'TCC1', 'TDD1'].map(makeTheoryButton),
        ],
    },
    {
        id: 'right-theory',
        rows: [
            ['A2', 'B2', 'C2', 'D2', 'E2', 'F2', 'G2'].map(makeTheoryButton),
            ['TA2', 'TB2', 'TC2', 'TD2', 'TE2', 'TF2', 'TG2'].map(makeTheoryButton),
            ['TAA2', 'TBB2', 'TCC2', 'TDD2'].map(makeTheoryButton),
        ],
    },
];

const labPanels: SlotSelectorPanel[] = [
    {
        id: 'left-lab',
        rows: [
            ['L1', 'L3', 'L5', 'L7', 'L9'].map(makeLabButton),
            ['L11', 'L13', 'L15', 'L17', 'L19'].map(makeLabButton),
            ['L21', 'L23', 'L25', 'L27', 'L29'].map(makeLabButton),
        ],
    },
    {
        id: 'right-lab',
        rows: [
            ['L31', 'L33', 'L35', 'L37', 'L39'].map(makeLabButton),
            ['L41', 'L43', 'L45', 'L47', 'L49'].map(makeLabButton),
            ['L51', 'L53', 'L55', 'L57', 'L59'].map(makeLabButton),
        ],
    },
];

const scheduleRows: SlotScheduleRow[] = [
    {
        day: 'Monday',
        theoryLeft: [slotCell('A1'), slotCell('F1'), slotCell('D1'), slotCell('TB1'), slotCell('TG1'), specialCell('S11')],
        theoryRight: [slotCell('A2'), slotCell('F2'), slotCell('D2'), slotCell('TB2'), slotCell('TG2'), specialCell('S11')],
        labLeft: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].map(slotCell),
        labRight: ['L31', 'L32', 'L33', 'L34', 'L35', 'L36'].map(slotCell),
    },
    {
        day: 'Tuesday',
        theoryLeft: [slotCell('B1'), slotCell('G1'), slotCell('E1'), slotCell('TC1'), slotCell('TAA1'), emptyCell()],
        theoryRight: [slotCell('B2'), slotCell('G2'), slotCell('E2'), slotCell('TC2'), slotCell('TAA2'), emptyCell()],
        labLeft: ['L7', 'L8', 'L9', 'L10', 'L11', 'L12'].map(slotCell),
        labRight: ['L37', 'L38', 'L39', 'L40', 'L41', 'L42'].map(slotCell),
    },
    {
        day: 'Wednesday',
        theoryLeft: [slotCell('C1'), slotCell('A1'), slotCell('F1'), slotCell('TD1'), slotCell('TBB1'), emptyCell()],
        theoryRight: [slotCell('C2'), slotCell('A2'), slotCell('F2'), slotCell('TD2'), slotCell('TBB2'), emptyCell()],
        labLeft: ['L13', 'L14', 'L15', 'L16', 'L17', 'L18'].map(slotCell),
        labRight: ['L43', 'L44', 'L45', 'L46', 'L47', 'L48'].map(slotCell),
    },
    {
        day: 'Thursday',
        theoryLeft: [slotCell('D1'), slotCell('B1'), slotCell('G1'), slotCell('TE1'), slotCell('TCC1'), emptyCell()],
        theoryRight: [slotCell('D2'), slotCell('B2'), slotCell('G2'), slotCell('TE2'), slotCell('TCC2'), emptyCell()],
        labLeft: ['L19', 'L20', 'L21', 'L22', 'L23', 'L24'].map(slotCell),
        labRight: ['L49', 'L50', 'L51', 'L52', 'L53', 'L54'].map(slotCell),
    },
    {
        day: 'Friday',
        theoryLeft: [slotCell('E1'), slotCell('C1'), slotCell('TA1'), slotCell('TF1'), slotCell('TDD1'), specialCell('S15')],
        theoryRight: [slotCell('E2'), slotCell('C2'), slotCell('TA2'), slotCell('TF2'), slotCell('TDD2'), specialCell('S15')],
        labLeft: ['L25', 'L26', 'L27', 'L28', 'L29', 'L30'].map(slotCell),
        labRight: ['L55', 'L56', 'L57', 'L58', 'L59', 'L60'].map(slotCell),
    },
];

function buildTheoryOccupancy(rows: SlotScheduleRow[]): Map<string, Occupancy[]> {
    const occupancy = new Map<string, Occupancy[]>();

    rows.forEach((row, dayIndex) => {
        row.theoryLeft.forEach((cell, columnIndex) => {
            if (!cell.key) {
                return;
            }
            occupancy.set(cell.key, [...(occupancy.get(cell.key) ?? []), { day: dayIndex, columns: [columnIndex] }]);
        });

        row.theoryRight.forEach((cell, columnIndex) => {
            if (!cell.key) {
                return;
            }
            occupancy.set(cell.key, [...(occupancy.get(cell.key) ?? []), { day: dayIndex, columns: [columnIndex + 6] }]);
        });
    });

    return occupancy;
}

function buildLabOccupancy(): Map<string, Occupancy[]> {
    const occupancy = new Map<string, Occupancy[]>();
    const leftKeys = [
        ['L1', 'L3', 'L5'],
        ['L7', 'L9', 'L11'],
        ['L13', 'L15', 'L17'],
        ['L19', 'L21', 'L23'],
        ['L25', 'L27', 'L29'],
    ];
    const rightKeys = [
        ['L31', 'L33', 'L35'],
        ['L37', 'L39', 'L41'],
        ['L43', 'L45', 'L47'],
        ['L49', 'L51', 'L53'],
        ['L55', 'L57', 'L59'],
    ];

    leftKeys.forEach((row, day) => {
        row.forEach((key, blockIndex) => {
            const startColumn = blockIndex * 2;
            occupancy.set(key, [{ day, columns: [startColumn, startColumn + 1] }]);
        });
    });

    rightKeys.forEach((row, day) => {
        row.forEach((key, blockIndex) => {
            const startColumn = 6 + blockIndex * 2;
            occupancy.set(key, [{ day, columns: [startColumn, startColumn + 1] }]);
        });
    });

    return occupancy;
}

function overlaps(a: Occupancy[], b: Occupancy[]): boolean {
    return a.some(aItem =>
        b.some(bItem =>
            aItem.day === bItem.day && aItem.columns.some(column => bItem.columns.includes(column))
        )
    );
}

function buildConflicts(): Record<string, string[]> {
    const conflicts = new Map<string, Set<string>>();
    const theoryOccupancy = buildTheoryOccupancy(scheduleRows);
    const labOccupancy = buildLabOccupancy();

    for (const theoryKey of theoryOccupancy.keys()) {
        conflicts.set(theoryKey, new Set());
    }

    for (const labKey of labOccupancy.keys()) {
        conflicts.set(labKey, new Set());
    }

    for (const [theoryKey, theorySlots] of theoryOccupancy.entries()) {
        for (const [labKey, labSlots] of labOccupancy.entries()) {
            if (!overlaps(theorySlots, labSlots)) {
                continue;
            }
            conflicts.get(theoryKey)?.add(labKey);
            conflicts.get(labKey)?.add(theoryKey);
        }
    }

    return Object.fromEntries(
        Array.from(conflicts.entries()).map(([key, value]) => [key, Array.from(value).sort()])
    );
}

export function getSlotViewPayload(): SlotViewPayload {
    return {
        theoryPanels,
        labPanels,
        scheduleRows,
        leftTimes: LEFT_TIMES,
        rightTimes: RIGHT_TIMES,
        conflicts: buildConflicts(),
    };
}

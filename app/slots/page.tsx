'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { SlotButton, SlotCell, SlotViewPayload, SlotViewCategory } from '@/lib/slot-view';
import './slots.css';

function getLabSelectorKey(key: string | null): string | null {
	if (!key || !key.startsWith('L')) {
		return key;
	}

	const labNumber = Number.parseInt(key.slice(1), 10);
	if (Number.isNaN(labNumber)) {
		return key;
	}

	return labNumber % 2 === 0 ? `L${labNumber - 1}` : key;
}

function SlotChip({
	slot,
	isSelected,
	isBlocked,
	onClick,
}: {
	slot: SlotButton;
	isSelected: boolean;
	isBlocked: boolean;
	onClick: () => void;
}) {
	let stateClass = 'slot-chip-default';
	if (isSelected) stateClass = 'slot-chip-selected';
	if (isBlocked) stateClass = 'slot-chip-blocked';

	return (
		<button
			type="button"
			disabled={isBlocked}
			onClick={onClick}
			className={`slot-chip ${stateClass}`}
		>
			{slot.label}
		</button>
	);
}

function splitTime(value: string) {
	const [start, end] = value.split('-');
	return (
		<>
			<span>{start}</span>
			<span>{end}</span>
		</>
	);
}

function ScheduleCellView({ cell, selectedKeys }: { cell: SlotCell; selectedKeys: Set<string> }) {
	const normalizedKey = cell.key?.startsWith('L') ? getLabSelectorKey(cell.key) : cell.key;
	const isSelected = normalizedKey ? selectedKeys.has(normalizedKey) : false;

	const className = isSelected ? 'cell-theory-selected' : 'cell-theory';

	return (
		<td className={className}>
			{cell.label}
		</td>
	);
}

function ScheduleLabCellView({ cell, selectedKeys }: { cell: SlotCell; selectedKeys: Set<string> }) {
	const selectorKey = getLabSelectorKey(cell.key);
	const isSelected = selectorKey ? selectedKeys.has(selectorKey) : false;

	const className = isSelected ? 'cell-lab-selected' : 'cell-lab';

	return (
		<td className={className}>
			{cell.label}
		</td>
	);
}

export default function SlotsPage() {
	const [payload, setPayload] = useState<SlotViewPayload | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [activeCategory, setActiveCategory] = useState<SlotViewCategory>('theory');
	const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

	useEffect(() => {
		let cancelled = false;

		async function loadSlots() {
			try {
				setLoading(true);
				const response = await fetch('/api/slots', { cache: 'no-store' });

				if (!response.ok) {
					throw new Error('Unable to load slots');
				}

				const data: SlotViewPayload = await response.json();
				if (!cancelled) {
					setPayload(data);
					setError('');
				}
			} catch {
				if (!cancelled) {
					setError('Failed to load slot data.');
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		}

		loadSlots();
		return () => {
			cancelled = true;
		};
	}, []);

	const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);
	const blockedSet = useMemo(() => {
		const blocked = new Set<string>();

		if (!payload) {
			return blocked;
		}

		selectedKeys.forEach(key => {
			payload.conflicts[key]?.forEach(conflict => {
				if (!selectedSet.has(conflict)) {
					blocked.add(conflict);
				}
			});
		});

		return blocked;
	}, [payload, selectedKeys, selectedSet]);

	const panels = activeCategory === 'theory' ? payload?.theoryPanels ?? [] : payload?.labPanels ?? [];

	function handleToggle(slotKey: string) {
		if (blockedSet.has(slotKey)) {
			return;
		}

		setSelectedKeys(current =>
			current.includes(slotKey) ? current.filter(key => key !== slotKey) : [...current, slotKey]
		);
	}

	return (
		<div className="slots-page-wrapper">
			<div className="slots-card">
				{/* Header */}
				<header className="slots-header">
					<Link href="/" className="back-link" aria-label="Back">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<path d="M15 18l-6-6 6-6" />
						</svg>
					</Link>
					<h1 className="page-title">Slot View</h1>
					<div className="h-8 w-8" />
				</header>

				{/* Tabs */}
				<div className="tabs-container">
					<div className="tabs-pill">
						<button
							type="button"
							onClick={() => setActiveCategory('theory')}
							className={`tab-button ${activeCategory === 'theory' ? 'active' : ''}`}
						>
							Theory
						</button>
						<button
							type="button"
							onClick={() => setActiveCategory('lab')}
							className={`tab-button ${activeCategory === 'lab' ? 'active' : ''}`}
						>
							Lab
						</button>
					</div>
				</div>

				{loading ? (
					<div className="loading-container">
						Loading slot view...
					</div>
				) : error || !payload ? (
					<div className="error-container">
						{error || 'Slot data unavailable.'}
					</div>
				) : (
					<>
						{/* Slots Grid */}
						<div className="slots-grid-wrapper">
							<div className="slots-grid-flex">
								{panels.map((panel) => (
									<div key={panel.id} className="panel-column">
										{panel.rows.map((row, rowIndex) => (
											<div key={`${panel.id}-${rowIndex}`} className="panel-row">
												{row.map(slot => (
													<SlotChip
														key={slot.key}
														slot={slot}
														isSelected={selectedSet.has(slot.key)}
														isBlocked={blockedSet.has(slot.key)}
														onClick={() => handleToggle(slot.key)}
													/>
												))}
											</div>
										))}
									</div>
								))}
							</div>
						</div>

						<div className="timetable-container">
							<table className="timetable-table">
								<thead>
									<tr>
										<th className="timetable-header-cell text-left">Theory Hours</th>
										{payload.leftTimes.map(time => (
											<th key={`theory-left-${time.theory}`} className="timetable-header-cell">
												<span className="theory-time-span">{splitTime(time.theory)}</span>
											</th>
										))}
										<th rowSpan={2} className="spacer-col" />
										<th rowSpan={2} className="lunch-header-cell-empty">
											{/* Top header lunch cell is empty placeholder */}
										</th>
										<th rowSpan={2} className="spacer-col" />
										{payload.rightTimes.map((time) => (
											<th key={`theory-right-${time.theory}`} className="timetable-header-cell">
												<span className="theory-time-span">{splitTime(time.theory)}</span>
											</th>
										))}
									</tr>
									<tr>
										<th className="timetable-header-cell text-left">Lab Hours</th>
										{payload.leftTimes.map(time => (
											<th key={`lab-left-${time.lab}`} className="timetable-header-cell">
												<span className="theory-time-span">{splitTime(time.lab)}</span>
											</th>
										))}
										{payload.rightTimes.map(time => (
											<th key={`lab-right-${time.lab}`} className="timetable-header-cell">
												<span className="theory-time-span">{splitTime(time.lab)}</span>
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{payload.scheduleRows.map((row, idx) => (
										<FragmentRows
											key={row.day}
											row={row}
											selectedKeys={selectedSet}
											lunchLetter={"LUNCH"[idx] || ""}
										/>
									))}
								</tbody>
							</table>
						</div>
					</>
				)}
			</div>
		</div>
	);
}

function FragmentRows({
	row,
	selectedKeys,
	lunchLetter,
}: {
	row: SlotViewPayload['scheduleRows'][number];
	selectedKeys: Set<string>;
	lunchLetter: string;
}) {
	return (
		<>
			<tr>
				<th rowSpan={2} className="day-header">{row.day}</th>
				{row.theoryLeft.map(cell => (
					<ScheduleCellView key={`${row.day}-th-left-${cell.label}`} cell={cell} selectedKeys={selectedKeys} />
				))}
				<td rowSpan={2} className="spacer-col" />
				<td rowSpan={2} className="lunch-cell">
					<span className="lunch-letter">{lunchLetter}</span>
				</td>
				<td rowSpan={2} className="spacer-col" />
				{row.theoryRight.map(cell => (
					<ScheduleCellView
						key={`${row.day}-th-right-${cell.label}`}
						cell={cell}
						selectedKeys={selectedKeys}
					/>
				))}
			</tr>
			<tr>
				{row.labLeft.map(cell => (
					<ScheduleLabCellView key={`${row.day}-lab-left-${cell.label}`} cell={cell} selectedKeys={selectedKeys} />
				))}
				{row.labRight.map(cell => (
					<ScheduleLabCellView
						key={`${row.day}-lab-right-${cell.label}`}
						cell={cell}
						selectedKeys={selectedKeys}
					/>
				))}
			</tr>
		</>
	);
}

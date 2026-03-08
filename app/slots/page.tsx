'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { SlotButton, SlotCell, SlotViewPayload, SlotViewCategory } from '@/lib/slot-view';

const panelBase =
	'rounded-[5px] border-[1.5px] px-[12px] py-[5px] text-[13px] font-bold tracking-tight transition-colors duration-150 cursor-pointer select-none';

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
	const stateClass = isSelected
		? 'border-[#53b648] bg-[#55f14d] text-[#0c1b0c] shadow-[0_2px_0_#2b6b27]'
		: isBlocked
			? 'cursor-not-allowed border-[#bdbdbd] bg-[#cfcfcf] text-[#555555] shadow-[0_2px_0_#7a7a7a]'
			: 'border-[#8cb5ed] bg-[#f0f0f2] text-[#101010] shadow-[0_2px_0_#8cb5ed] hover:bg-[#ebeff5]';

	return (
		<button
			type="button"
			disabled={isBlocked}
			onClick={onClick}
			className={`${panelBase} ${stateClass} min-w-[48px]`}
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

	const className = isSelected
		? 'bg-[#5df25b] text-[#0e4f17]'
		: cell.kind === 'special'
			? 'bg-[#dff0df] text-[#38743d]'
			: cell.kind === 'empty'
				? 'bg-[#dff0df] text-[#7e8a7e]'
				: 'bg-[#d8efe0] text-[#267246]';

	return (
		<td className={`h-[28px] border border-[#ddd9ce] text-center text-[10px] font-bold ${className}`}>
			{cell.label}
		</td>
	);
}

function ScheduleLabCellView({ cell, selectedKeys }: { cell: SlotCell; selectedKeys: Set<string> }) {
	const selectorKey = getLabSelectorKey(cell.key);
	const isSelected = selectorKey ? selectedKeys.has(selectorKey) : false;

	return (
		<td
			className={`h-[28px] border border-[#ddd9ce] text-center text-[10px] font-bold ${
				isSelected ? 'bg-[#5df25b] text-[#0e4f17]' : 'bg-[#f0e8ca] text-[#9e8620]'
			}`}
		>
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
		<div className="min-h-screen bg-[#FFF8E7] px-2 py-2 sm:px-4 sm:py-4">
			<div className="mx-auto mt-4 flex w-[96%] max-w-[1280px] flex-col rounded-[24px] bg-[#f5f1e4] px-5 py-5 shadow-[0_4px_20px_rgba(120,100,50,0.06)] sm:px-7">
				<div className="mb-2 flex items-center justify-between">
					<div className="h-8 w-8" />
					<h1 className="text-center text-[26px] font-black tracking-[-0.01em] text-black">Slot View</h1>
					<Link
						href="/"
						className="flex h-8 w-8 items-center justify-center text-[#888888] transition-colors hover:text-[#333333]"
						aria-label="Close slot view"
					>
						<svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
							<path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
						</svg>
					</Link>
				</div>

				<div className="mb-4 flex justify-center">
					<div className="inline-flex rounded-[7px] bg-[#a3c2ec] p-[3px]">
						<button
							type="button"
							onClick={() => setActiveCategory('theory')}
							className={`min-w-[90px] rounded-[5px] px-5 py-[6px] text-[14px] font-bold transition-colors ${
								activeCategory === 'theory' ? 'bg-white text-black' : 'text-[#1d3a5e]'
							}`}
						>
							Theory
						</button>
						<button
							type="button"
							onClick={() => setActiveCategory('lab')}
							className={`min-w-[90px] rounded-[5px] px-5 py-[6px] text-[14px] font-bold transition-colors ${
								activeCategory === 'lab' ? 'bg-white text-black' : 'text-[#1d3a5e]'
							}`}
						>
							Lab
						</button>
					</div>
				</div>

				{loading ? (
					<div className="flex min-h-[520px] items-center justify-center text-[15px] font-semibold text-[#555555]">
						Loading slot view...
					</div>
				) : error || !payload ? (
					<div className="flex min-h-[520px] items-center justify-center text-[15px] font-semibold text-[#8b2b2b]">
						{error || 'Slot data unavailable.'}
					</div>
				) : (
					<>
						<div className="mb-3 grid gap-6 lg:grid-cols-2">
							{panels.map(panel => (
								<div key={panel.id} className="space-y-[5px]">
									{panel.rows.map((row, rowIndex) => (
										<div
											key={`${panel.id}-${rowIndex}`}
											className="flex flex-wrap justify-center gap-[5px]"
										>
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

						<div className="overflow-x-auto rounded-[6px] bg-transparent p-0">
							<table className="w-full border-separate border-spacing-0 overflow-hidden rounded-[6px]">
								<tbody>
									<tr>
										<th className="min-w-[80px] rounded-tl-[4px] border border-[#d6d6d6] bg-[#e8e8e8] px-2 py-[5px] text-[11px] font-extrabold text-[#222222]">
											Theory Hours
										</th>
										{payload.leftTimes.map(time => (
											<th
												key={`theory-left-${time.theory}`}
												className="border border-[#d6d6d6] bg-[#e8e8e8] px-1 py-[5px] text-[9px] font-bold leading-[1.15] text-[#222222]"
											>
												<span className="flex flex-col">{splitTime(time.theory)}</span>
											</th>
										))}
										<th
											rowSpan={12}
												className="border border-[#d6d6d6] bg-[#e0ddd4] px-[2px] text-center text-[10px] font-black tracking-[0.15em] text-[#555555]"
										>
											<span className="inline-block [writing-mode:vertical-rl] [text-orientation:upright]">LUNCH</span>
										</th>
										{payload.rightTimes.map((time, index) => (
											<th
												key={`theory-right-${time.theory}`}
												className={`border border-[#d6d6d6] bg-[#e8e8e8] px-1 py-[5px] text-[9px] font-bold leading-[1.15] text-[#222222] ${
													index === payload.rightTimes.length - 1 ? 'rounded-tr-[4px]' : ''
												}`}
											>
												<span className="flex flex-col">{splitTime(time.theory)}</span>
											</th>
										))}
									</tr>

									<tr>
										<th className="min-w-[80px] border border-[#d6d6d6] bg-[#e8e8e8] px-2 py-[5px] text-[11px] font-extrabold text-[#222222]">
											Lab Hours
										</th>
										{payload.leftTimes.map(time => (
											<th
												key={`lab-left-${time.lab}`}
												className="border border-[#d6d6d6] bg-[#e8e8e8] px-1 py-[5px] text-[9px] font-bold leading-[1.15] text-[#222222]"
											>
												<span className="flex flex-col">{splitTime(time.lab)}</span>
											</th>
										))}
										{payload.rightTimes.map(time => (
											<th
												key={`lab-right-${time.lab}`}
												className="border border-[#d6d6d6] bg-[#e8e8e8] px-1 py-[5px] text-[9px] font-bold leading-[1.15] text-[#222222]"
											>
												<span className="flex flex-col">{splitTime(time.lab)}</span>
											</th>
										))}
									</tr>

									{payload.scheduleRows.map(row => (
										<FragmentRows
											key={row.day}
											row={row}
											selectedKeys={selectedSet}
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
}: {
	row: SlotViewPayload['scheduleRows'][number];
	selectedKeys: Set<string>;
}) {
	return (
		<>
			<tr>
				<th
					rowSpan={2}
					className="min-w-[80px] border border-[#d6d6d6] bg-[#e8e8e8] px-2 py-[5px] text-[11px] font-extrabold text-[#222222]"
				>
					{row.day}
				</th>
				{row.theoryLeft.map(cell => (
					<ScheduleCellView key={`${row.day}-th-left-${cell.label}`} cell={cell} selectedKeys={selectedKeys} />
				))}
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

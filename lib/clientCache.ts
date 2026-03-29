'use client';

import { LARGE_PLANNER_STORAGE_KEYS, removePlannerStoredValue } from '@/lib/plannerStorage';

const PLANNER_COOKIE_KEYS = [
    'preferenceStep',
    'preferenceDepartments',
    'preferenceDomains',
    'preferenceSubjects',
    'preferenceSlots',
    'facultyPriority',
    'preferenceSubject',
    'preferenceSlot',
    'allSubjectsMode',
] as const;

const EDITING_COOKIE_KEYS = ['editingTimetableId'] as const;

const clearCookie = (name: string) => {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

export const clearPlannerClientCache = (options?: { includeEditingState?: boolean; clearPlannerState?: boolean }) => {
    if (typeof document === 'undefined') return;

    if (options?.clearPlannerState !== false) {
        for (const key of PLANNER_COOKIE_KEYS) {
            clearCookie(key);
        }

        for (const key of LARGE_PLANNER_STORAGE_KEYS) {
            removePlannerStoredValue(key);
        }
    }

    if (options?.includeEditingState) {
        for (const key of EDITING_COOKIE_KEYS) {
            clearCookie(key);
        }
    }
};

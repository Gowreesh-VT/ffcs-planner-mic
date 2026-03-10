'use client';

const PLANNER_COOKIE_KEYS = [
    'preferenceStep',
    'preferenceDepartments',
    'preferenceDomains',
    'preferenceSubjects',
    'preferenceSlots',
    'preferenceMultipleFaculties',
    'facultyPriority',
    'preferenceCourses',
    'preferenceSubject',
    'preferenceSlot',
    'allSubjectsMode',
] as const;

const EDITING_COOKIE_KEYS = ['editingTimetableId', 'editingTimetableTitle'] as const;

const clearCookie = (name: string) => {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

export const clearPlannerClientCache = (options?: { includeEditingState?: boolean }) => {
    if (typeof document === 'undefined') return;

    for (const key of PLANNER_COOKIE_KEYS) {
        clearCookie(key);
    }

    if (options?.includeEditingState) {
        for (const key of EDITING_COOKIE_KEYS) {
            clearCookie(key);
        }
    }
};
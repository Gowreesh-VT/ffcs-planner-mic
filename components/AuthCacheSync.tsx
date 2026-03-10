'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useTimetable } from '@/lib/TimeTableContext';
import { usePreferences } from '@/lib/PreferencesContext';
import { clearPlannerClientCache } from '@/lib/clientCache';

export default function AuthCacheSync() {
    const { data: session, status } = useSession();
    const { setTimetableData } = useTimetable();
    const { clearCourses } = usePreferences();
    const previousUserEmailRef = useRef<string | null>(null);

    useEffect(() => {
        if (status === 'loading') return;

        const currentEmail = session?.user?.email ?? null;
        const previousEmail = previousUserEmailRef.current;

        if (status === 'unauthenticated') {
            clearPlannerClientCache({ includeEditingState: true });
            setTimetableData(null);
            clearCourses();
        } else if (previousEmail && currentEmail && previousEmail !== currentEmail) {
            clearPlannerClientCache({ includeEditingState: true });
            setTimetableData(null);
            clearCourses();
        }

        previousUserEmailRef.current = currentEmail;
    }, [status, session?.user?.email, setTimetableData, clearCourses]);

    return null;
}

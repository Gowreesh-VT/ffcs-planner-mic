'use client';

import { SessionProvider } from 'next-auth/react';
import { TimetableProvider } from '@/lib/TimeTableContext';

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <TimetableProvider>
                {children}
            </TimetableProvider>
        </SessionProvider>
    );
}

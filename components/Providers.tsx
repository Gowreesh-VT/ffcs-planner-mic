'use client';

import { SessionProvider } from 'next-auth/react';
import { TimetableProvider } from '@/lib/TimeTableContext';
import { PreferencesProvider } from '@/lib/PreferencesContext';
import AuthCacheSync from '@/components/AuthCacheSync';

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <PreferencesProvider>
                <TimetableProvider>
                    <AuthCacheSync />
                    {children}
                </TimetableProvider>
            </PreferencesProvider>
        </SessionProvider>
    );
}

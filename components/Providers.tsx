'use client';

import { useEffect, useRef } from 'react';
import { SessionProvider } from 'next-auth/react';
import { useSession } from 'next-auth/react';
import { TimetableProvider } from '@/lib/TimeTableContext';
import { PreferencesProvider } from '@/lib/PreferencesContext';
import AuthCacheSync from '@/components/AuthCacheSync';
import posthog from 'posthog-js';

function PostHogAuthSync() {
    const { data: session, status } = useSession();
    const lastIdentifiedEmail = useRef<string | null>(null);

    useEffect(() => {
        if (status !== 'authenticated') {
            lastIdentifiedEmail.current = null;
            return;
        }

        const email = session?.user?.email;
        if (!email || lastIdentifiedEmail.current === email) return;

        posthog.identify(email, {
            email,
            name: session.user?.name ?? undefined,
        });
        posthog.capture('login_succeeded', {
            provider: 'google',
        });
        lastIdentifiedEmail.current = email;
    }, [session, status]);

    return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <PostHogAuthSync />
            <PreferencesProvider>
                <TimetableProvider>
                    <AuthCacheSync />
                    {children}
                </TimetableProvider>
            </PreferencesProvider>
        </SessionProvider>
    );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function MobileGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        const checkScreenSize = () => {
            // 1024px is a common tablet landscape breakpoint, but 800px is safe for portrait tabs.
            // Usually "less than tab screen size" means < 768px (iPad portrait is 768px).
            const isMobile = window.innerWidth < 768;

            if (isMobile && pathname !== "/mobile") {
                router.replace("/mobile");
                setShouldRender(false);
            } else if (!isMobile && pathname === "/mobile") {
                router.replace("/");
                setShouldRender(false);
            } else {
                setShouldRender(true);
            }
        };

        // Initial check
        checkScreenSize();

        // Listen to resize events
        window.addEventListener("resize", checkScreenSize);
        return () => window.removeEventListener("resize", checkScreenSize);
    }, [router, pathname]);

    if (!shouldRender) {
        return <div className="min-h-screen bg-white"></div>; // Prevents flashing during redirect
    }

    return <>{children}</>;
}

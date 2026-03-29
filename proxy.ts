import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PATH_PREFIXES = ['/saved'];
const SESSION_COOKIE_NAMES = ['next-auth.session-token', '__Secure-next-auth.session-token'];

const isProtectedPath = (pathname: string) =>
    PROTECTED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;

    if (!isProtectedPath(pathname)) {
        return NextResponse.next();
    }

    const hasSessionCookie = SESSION_COOKIE_NAMES.some((cookieName) => Boolean(req.cookies.get(cookieName)?.value));

    if (!hasSessionCookie) {
        const signInUrl = new URL('/', req.url);
        signInUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(signInUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/saved/:path*'],
};
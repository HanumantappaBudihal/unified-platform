import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Enforce auth ONLY when SSO is configured (NEXTAUTH_URL set). Without it, the
// portal runs open for local development — matching the documented contract in
// lib/auth.ts (SSO_ENABLED). `withAuth` enforces unconditionally, so we gate it
// behind the env check ourselves rather than letting it redirect to a NextAuth
// handler that has no provider configured.
const enforce = withAuth({ pages: { signIn: '/auth/signin' } });

export default function middleware(req: NextRequest, event: any) {
  if (!process.env.NEXTAUTH_URL) {
    return NextResponse.next();
  }
  return (enforce as any)(req, event);
}

export const config = {
  // Protect all routes except auth endpoints, API routes, and static assets
  matcher: [
    '/((?!api/auth|auth/signin|_next/static|_next/image|favicon.ico).*)',
  ],
};

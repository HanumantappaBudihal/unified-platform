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
  // A token-based tenant session (cookie) also satisfies the gate — the proxy
  // forwards it and the API does the real validation. This lets the portal be
  // used via Keycloak SSO *or* a tenant API token.
  if (req.cookies.get('platform_token')) {
    return NextResponse.next();
  }
  return (enforce as any)(req, event);
}

export const config = {
  // Gate PAGES only. All /api/* routes self-authenticate (the proxy forwards the
  // SSO/tenant token; /api/session manages the cookie), so they must bypass the
  // middleware — otherwise the portal can't call its own API or sign in.
  matcher: [
    '/((?!api|auth/signin|signin|_next/static|_next/image|favicon.ico).*)',
  ],
};

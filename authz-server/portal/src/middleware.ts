import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Gate pages behind the Seiton Platform IdP — but ONLY when SSO is configured
// (issuer + client + NEXTAUTH_SECRET present). Without it the portal runs open
// for local development.
const ssoEnabled = Boolean(
  process.env.PLATFORM_ISSUER && process.env.OIDC_CLIENT_ID && process.env.NEXTAUTH_SECRET,
);

const enforce = withAuth({ pages: { signIn: '/auth/signin' } });

export default function middleware(req: NextRequest, event: unknown) {
  if (!ssoEnabled) return NextResponse.next();
  return (enforce as unknown as (req: NextRequest, event: unknown) => unknown)(req, event) as never;
}

export const config = {
  matcher: ['/((?!api|auth/signin|_next/static|_next/image|favicon.ico).*)'],
};

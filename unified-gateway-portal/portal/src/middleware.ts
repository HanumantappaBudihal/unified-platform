import { withAuth } from 'next-auth/middleware';

// Only enforce auth when NEXTAUTH_URL is set (production/staging)
// In development without NEXTAUTH_URL, this middleware is a no-op
export default withAuth({
  pages: { signIn: '/auth/signin' },
});

export const config = {
  // Protect all routes except auth endpoints, API routes, and static assets
  matcher: [
    '/((?!api/auth|auth/signin|_next/static|_next/image|favicon.ico).*)',
  ],
};

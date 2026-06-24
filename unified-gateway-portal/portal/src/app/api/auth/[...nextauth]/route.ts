import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// NextAuth route handler — exposes /api/auth/* (signin, callback, session…).
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

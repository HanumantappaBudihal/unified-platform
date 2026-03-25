/**
 * Shared Keycloak OIDC configuration for NextAuth.js
 *
 * Usage in each portal:
 *   // src/app/api/auth/[...nextauth]/route.ts
 *   import { authOptions } from '@shared/portal-auth';
 *   import NextAuth from 'next-auth';
 *   const handler = NextAuth(authOptions);
 *   export { handler as GET, handler as POST };
 */

const keycloakProvider = {
  id: 'keycloak',
  name: 'Keycloak',
  type: 'oauth',
  wellKnown: `${process.env.KEYCLOAK_ISSUER || 'http://localhost:8080/realms/infrastructure'}/.well-known/openid-configuration`,
  clientId: process.env.KEYCLOAK_CLIENT_ID || 'gateway-portal',
  clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || '',
  authorization: { params: { scope: 'openid profile email roles' } },
  idToken: true,
  profile(profile) {
    return {
      id: profile.sub,
      name: profile.preferred_username || profile.name,
      email: profile.email,
      image: null,
      roles: profile.realm_access?.roles || [],
    };
  },
};

const authOptions = {
  providers: [keycloakProvider],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.idToken = account.id_token;
        token.roles = profile?.realm_access?.roles || [];
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.roles = token.roles || [];
      session.user.id = token.sub;
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
};

module.exports = { authOptions, keycloakProvider };

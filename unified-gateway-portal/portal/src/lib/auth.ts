import type { NextAuthOptions } from 'next-auth';

export const authOptions: NextAuthOptions = {
  providers: [
    {
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
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, account, profile }: any) {
      if (account) {
        token.accessToken = account.access_token;
        token.roles = profile?.realm_access?.roles || [];
      }
      return token;
    },
    async session({ session, token }: any) {
      session.accessToken = token.accessToken;
      session.roles = token.roles || [];
      if (session.user) session.user.id = token.sub;
      return session;
    },
  },
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
};

// Set to true to enable SSO enforcement
// When false, portal runs without authentication (development mode)
export const SSO_ENABLED = process.env.NEXTAUTH_URL !== undefined;

import type { NextAuthOptions } from 'next-auth';

// Browser-facing issuer (used for redirects + id_token `iss` validation).
const ISSUER = process.env.KEYCLOAK_ISSUER || 'http://localhost:8180/realms/platform';
// Server-to-server issuer (the portal container reaches Keycloak via this host).
// Defaults to ISSUER when the portal and browser share a hostname.
const INTERNAL = process.env.KEYCLOAK_INTERNAL_ISSUER || ISSUER;

export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: 'keycloak',
      name: 'Keycloak',
      type: 'oauth',
      issuer: ISSUER,
      // Split endpoints solve the docker dual-hostname problem: the browser is
      // redirected to ISSUER (localhost), while the portal exchanges the code and
      // fetches keys over INTERNAL (host.docker.internal). Keycloak's KC_HOSTNAME_URL
      // keeps the issued token `iss` == ISSUER regardless of the backchannel host.
      authorization: {
        url: `${ISSUER}/protocol/openid-connect/auth`,
        params: { scope: 'openid profile email roles' },
      },
      token: `${INTERNAL}/protocol/openid-connect/token`,
      userinfo: `${INTERNAL}/protocol/openid-connect/userinfo`,
      jwks_endpoint: `${INTERNAL}/protocol/openid-connect/certs`,
      clientId: process.env.KEYCLOAK_CLIENT_ID || 'gateway-portal',
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || 'gateway-portal-secret',
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
        // Keep the Keycloak access token — the portal proxy forwards it to the
        // platform-api, which validates it and maps tenant + roles.
        token.accessToken = account.access_token;
        token.tenant = profile?.tenant || null;
        token.roles = profile?.realm_access?.roles || [];
      }
      return token;
    },
    async session({ session, token }: any) {
      session.accessToken = token.accessToken;
      session.tenant = token.tenant;
      session.roles = token.roles || [];
      if (session.user) session.user.id = token.sub;
      return session;
    },
  },
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
};

// SSO is enforced (by middleware) only when NEXTAUTH_URL is configured.
export const SSO_ENABLED = process.env.NEXTAUTH_URL !== undefined;

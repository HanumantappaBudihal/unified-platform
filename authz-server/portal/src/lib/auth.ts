import type { AuthOptions, Profile } from 'next-auth';

// OIDC against the Seiton Platform IdP (the single identity provider for the
// whole suite). The authz portal is an OAuth client registered on the Platform.
//
// SSO is enabled only when the issuer + client are configured. Without them the
// portal runs OPEN for local development (middleware does not gate).

const issuer = process.env.PLATFORM_ISSUER;
const clientId = process.env.OIDC_CLIENT_ID;
const clientSecret = process.env.OIDC_CLIENT_SECRET ?? '';

export const ssoEnabled = Boolean(issuer && clientId && process.env.NEXTAUTH_SECRET);

export const authOptions: AuthOptions = {
  providers: ssoEnabled
    ? [
        {
          id: 'seiton',
          name: 'Seiton Platform',
          type: 'oauth',
          wellKnown: `${issuer}/.well-known/openid-configuration`,
          clientId,
          clientSecret,
          authorization: { params: { scope: 'openid profile email' } },
          idToken: true,
          checks: ['pkce', 'state'],
          profile(profile: Profile & { preferred_username?: string }) {
            return {
              id: (profile.sub as string) ?? '',
              name: profile.name ?? profile.preferred_username ?? (profile.sub as string),
              email: profile.email ?? null,
            };
          },
        },
      ]
    : [],
  session: { strategy: 'jwt' },
  pages: { signIn: '/auth/signin' },
};

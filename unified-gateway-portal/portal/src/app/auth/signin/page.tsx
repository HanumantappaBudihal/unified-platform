'use client';
import { signIn } from 'next-auth/react';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/20">
          <span className="text-white text-2xl font-black">G</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Infrastructure Gateway</h1>
        <p className="text-sm text-gray-500 mb-8">Sign in to manage your platform</p>

        <button
          onClick={() => signIn('keycloak', { callbackUrl: '/' })}
          className="w-full py-3 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors shadow-sm"
        >
          Sign in with Keycloak
        </button>

        <p className="text-xs text-gray-400 mt-6">
          Authenticated via Keycloak SSO
        </p>
      </div>
    </div>
  );
}

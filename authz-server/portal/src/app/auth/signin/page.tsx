'use client';
import { signIn } from 'next-auth/react';

export default function SignIn() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
        <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
          <span className="text-white text-xl font-black">Z</span>
        </div>
        <h1 className="text-lg font-bold text-gray-900">AuthZ Server</h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">Sign in with your Seiton Platform account</p>
        <button
          onClick={() => signIn('seiton', { callbackUrl: '/' })}
          className="w-full px-4 py-2.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
        >
          Sign in with Seiton Platform
        </button>
      </div>
    </div>
  );
}

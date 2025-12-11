import { SignIn, SignUp, SignedIn, SignedOut } from '@clerk/clerk-react';
import { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { UserHeader } from './components/auth/UserHeader';
import App from './App';

function AuthPage() {
  const [showSignUp, setShowSignUp] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/logo.svg" alt="Intelekt" className="w-20 h-20" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            {showSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-gray-600 mt-2">
            {showSignUp ? 'Sign up to get started with Intelekt' : 'Sign in to continue to Intelekt'}
          </p>
        </div>

        {showSignUp ? (
          <SignUp 
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none bg-transparent',
              },
            }}
            signInUrl="#"
            afterSignUpUrl="/"
          />
        ) : (
          <SignIn 
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none bg-transparent',
              },
            }}
            signUpUrl="#"
            afterSignInUrl="/"
          />
        )}

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            {showSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <button
              onClick={() => setShowSignUp(!showSignUp)}
              className="text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              {showSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AppWithAuth() {
  return (
    <AuthProvider>
      <SignedOut>
        <AuthPage />
      </SignedOut>
      <SignedIn>
        <UserHeader />
        <App />
      </SignedIn>
    </AuthProvider>
  );
}

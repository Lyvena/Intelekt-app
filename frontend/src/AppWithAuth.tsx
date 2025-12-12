import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UserHeader } from './components/auth/UserHeader';
import { LoginForm, SignUpForm, ForgotPasswordForm, ResetPasswordForm } from './components/auth';
import App from './App';

type AuthView = 'login' | 'signup' | 'forgot-password' | 'reset-password';

function AuthPage() {
  const [view, setView] = useState<AuthView>('login');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const { refreshUser } = useAuth();

  // Check for reset token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const path = window.location.pathname;

    if (path === '/reset-password' && token) {
      setView('reset-password');
      setResetToken(token);
    } else if (path === '/verify-email' && token) {
      // Handle email verification
      handleEmailVerification(token);
    }
  }, []);

  const handleEmailVerification = async (token: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        alert('Email verified successfully! You can now sign in.');
        window.history.replaceState({}, '', '/');
        setView('login');
      } else {
        alert('Failed to verify email. The link may be expired.');
        window.history.replaceState({}, '', '/');
      }
    } catch (e) {
      alert('Failed to verify email. Please try again.');
      window.history.replaceState({}, '', '/');
    }
  };

  const handleAuthSuccess = () => {
    refreshUser();
    window.history.replaceState({}, '', '/');
    window.location.reload();
  };

  const handleResetSuccess = () => {
    window.history.replaceState({}, '', '/');
    setView('login');
    setResetToken(null);
  };

  const renderForm = () => {
    switch (view) {
      case 'signup':
        return (
          <SignUpForm
            onSuccess={handleAuthSuccess}
            onSwitchToLogin={() => setView('login')}
          />
        );
      case 'forgot-password':
        return (
          <ForgotPasswordForm
            onBack={() => setView('login')}
          />
        );
      case 'reset-password':
        return resetToken ? (
          <ResetPasswordForm
            token={resetToken}
            onSuccess={handleResetSuccess}
            onBack={() => {
              window.history.replaceState({}, '', '/');
              setView('login');
              setResetToken(null);
            }}
          />
        ) : (
          <LoginForm
            onSuccess={handleAuthSuccess}
            onSwitchToSignUp={() => setView('signup')}
            onForgotPassword={() => setView('forgot-password')}
          />
        );
      case 'login':
      default:
        return (
          <LoginForm
            onSuccess={handleAuthSuccess}
            onSwitchToSignUp={() => setView('signup')}
            onForgotPassword={() => setView('forgot-password')}
          />
        );
    }
  };

  const getTitle = () => {
    switch (view) {
      case 'signup':
        return 'Create Account';
      case 'forgot-password':
        return 'Reset Password';
      case 'reset-password':
        return 'Set New Password';
      default:
        return 'Welcome Back';
    }
  };

  const getSubtitle = () => {
    switch (view) {
      case 'signup':
        return 'Sign up to get started with Intelekt';
      case 'forgot-password':
        return 'We\'ll send you a reset link';
      case 'reset-password':
        return 'Create a new secure password';
      default:
        return 'Sign in to continue to Intelekt';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/logo.svg" alt="Intelekt" className="w-20 h-20" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            {getTitle()}
          </h2>
          <p className="text-gray-600 mt-2">
            {getSubtitle()}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {renderForm()}
        </div>
      </div>
    </div>
  );
}

function AuthenticatedApp() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <>
      <UserHeader />
      <App />
    </>
  );
}

export default function AppWithAuth() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

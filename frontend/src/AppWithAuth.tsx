import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserHeader } from './components/auth/UserHeader';
import { LandingPage } from './components/landing/LandingPage';
import App from './App';

type AuthView = 'login' | 'signup' | 'forgot-password' | 'reset-password';

function AuthPage() {
  const [view, setView] = useState<AuthView>('login');





  return (
    <LandingPage
      view={view}
      setView={(next) => setView(next)}
    />
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
    <ThemeProvider>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

import React, { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import Home from './pages/Home'
import { AuthFlow } from './components/auth/auth-flow';


const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

function SessionTimeout() {
  const { logout, authState } = useAuth();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!authState.isAuthenticated) return;

    // Start timer when user logs in
    timerRef.current = setTimeout(async () => {
      try {
        await logout();
      } catch (error) {
        console.error('Logout error:', error);
      }
    }, SESSION_TIMEOUT_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [authState.isAuthenticated]);

  return null;
}


const App: React.FC = () => {
  const { authState } = useAuth();
  
  return (
    <>
      <SessionTimeout />
      {authState.isAuthenticated ? <Home /> : <AuthFlow />}
    </>
  );
};

export default App;
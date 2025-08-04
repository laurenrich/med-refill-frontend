import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { PatientProvider } from './context/PatientContext';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <PatientProvider>
          <App />
        </PatientProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
  ); 
import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import App from './App';

const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

// ✅ Fix bfcache: khi quay lại trang bằng back/forward cache,
// nếu đang ở /admin mà không còn user => ép về /login
window.addEventListener("pageshow", (event) => {
  const isBFCache = event.persisted === true;
  if (!isBFCache) return;

  const path = window.location.pathname || "";
  if (!path.startsWith("/admin")) return;

  const raw = localStorage.getItem("user");
  if (!raw) {
    window.location.replace("/login");
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));

const appTree = googleClientId ? (
  <GoogleOAuthProvider clientId={googleClientId}>
    <App />
  </GoogleOAuthProvider>
) : (
  <App />
);

root.render(
  <React.StrictMode>
    {appTree}
  </React.StrictMode>
);

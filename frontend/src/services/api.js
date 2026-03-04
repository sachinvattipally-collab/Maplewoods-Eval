import axios from 'axios';

// [CORS-2] Base URL comes from an environment variable so it works in any deployment.
// Set VITE_API_BASE_URL in frontend/.env (e.g. VITE_API_BASE_URL=http://localhost:3001)
// Use Vite proxy (/api → localhost:3001) to avoid CORS issues with port changes
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const API = axios.create({ baseURL: `${BASE_URL}/api` });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// [FILE-2] Authenticated document download — fetches via API with auth header
// and creates a temporary Blob URL so the browser can open/download the file.
export async function downloadDocument(applicationId, fileName) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${BASE_URL}/api/applications/${applicationId}/documents`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to download document.');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export default API;

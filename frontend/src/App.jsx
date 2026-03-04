import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ApplicantDashboard from './pages/ApplicantDashboard';
import ApplicationForm from './pages/ApplicationForm';
import ReviewSubmit from './pages/ReviewSubmit';
import ApplicationDetail from './pages/ApplicationDetail';
import ReviewerDashboard from './pages/ReviewerDashboard';
import ReviewerApplicationDetail from './pages/ReviewerApplicationDetail';
import AdminReport from './pages/AdminReport';

function getSessionFromToken() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function ProtectedRoute({ children, requiredRole }) {
  const session = getSessionFromToken();
  if (!session) return <Navigate to="/login" replace />;
  if (requiredRole && session.role !== requiredRole) {
    if (session.role === 'REVIEWER') return <Navigate to="/reviewer" replace />;
    if (session.role === 'ADMIN') return <Navigate to="/admin/report" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/dashboard" element={<ProtectedRoute requiredRole="APPLICANT"><ApplicantDashboard /></ProtectedRoute>} />
        <Route path="/apply" element={<ProtectedRoute requiredRole="APPLICANT"><ApplicationForm /></ProtectedRoute>} />
        <Route path="/apply/review" element={<ProtectedRoute requiredRole="APPLICANT"><ReviewSubmit /></ProtectedRoute>} />
        <Route path="/applications/:id" element={<ProtectedRoute requiredRole="APPLICANT"><ApplicationDetail /></ProtectedRoute>} />

        <Route path="/reviewer" element={<ProtectedRoute requiredRole="REVIEWER"><ReviewerDashboard /></ProtectedRoute>} />
        <Route path="/reviewer/applications/:id" element={<ProtectedRoute requiredRole="REVIEWER"><ReviewerApplicationDetail /></ProtectedRoute>} />

        <Route path="/admin/report" element={<ProtectedRoute requiredRole="ADMIN"><AdminReport /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

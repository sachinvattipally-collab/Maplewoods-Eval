import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import API from '../services/api';

export default function ApplicantDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (location.state?.submitted) {
      setToast('Your application has been submitted successfully! You can track its status here.');
      window.history.replaceState({}, '');
      const t = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(t);
    }
  }, [location.state]);

  useEffect(() => {
    API.get('/applications')
      .then((res) => setApplications(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    submitted: applications.filter(a => a.status === 'SUBMITTED').length,
    review: applications.filter(a => a.status === 'UNDER_REVIEW').length,
    approved: applications.filter(a => a.status === 'APPROVED').length,
    rejected: applications.filter(a => a.status === 'REJECTED').length,
  };

  return (
    <div className="page">
      <Navbar />
      <div className="container">
        {toast && (
          <div className="alert alert-success toast-banner" role="status" aria-live="polite">
            🎉 {toast}
            <button className="toast-close" onClick={() => setToast(null)} aria-label="Dismiss">×</button>
          </div>
        )}

        <div className="page-header">
          <div>
            <h1>Welcome back, {user.full_name?.split(' ')[0]} 👋</h1>
            <p className="text-muted">Track and manage your grant applications below.</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/apply')}>
            + New Application
          </button>
        </div>

        {/* Stats */}
        {applications.length > 0 && (
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
            <div className="stat-card-dashboard">
              <span className="stat-icon">📄</span>
              <div className="stat-number-lg">{applications.length}</div>
              <div className="stat-label-lg">Total Submitted</div>
            </div>
            <div className="stat-card-dashboard warning">
              <span className="stat-icon">🔍</span>
              <div className="stat-number-lg">{counts.review}</div>
              <div className="stat-label-lg">Under Review</div>
            </div>
            <div className="stat-card-dashboard success">
              <span className="stat-icon">✅</span>
              <div className="stat-number-lg">{counts.approved}</div>
              <div className="stat-label-lg">Approved</div>
            </div>
            <div className="stat-card-dashboard danger">
              <span className="stat-icon">❌</span>
              <div className="stat-number-lg">{counts.rejected}</div>
              <div className="stat-label-lg">Rejected</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading">Loading your applications…</div>
        ) : applications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h2>No Applications Yet</h2>
            <p>You haven't submitted any grant applications yet. Get started today — it only takes a few minutes.</p>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/apply')}>
              Start Your First Application
            </button>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="section-title" style={{ margin: 0, border: 0, padding: 0, fontSize: 15 }}>
                📂 Your Applications
              </h2>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                {applications.length} total
              </span>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Project Title</th>
                  <th>Category</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Award</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <span className="app-id">#{app.id}</span>
                    </td>
                    <td style={{ fontWeight: 600, maxWidth: 240 }}>{app.project_title || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                      {app.project_category || '—'}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td><StatusBadge status={app.status} /></td>
                    <td>
                      {app.status === 'APPROVED' && app.award_amount
                        ? <span className="award-amount">${app.award_amount.toLocaleString()}</span>
                        : <span style={{ color: 'var(--text-light)', fontSize: 13 }}>—</span>}
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline" onClick={() => navigate(`/applications/${app.id}`)}>
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

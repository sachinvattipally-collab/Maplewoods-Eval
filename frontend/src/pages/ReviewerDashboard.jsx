import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import API from '../services/api';

export default function ReviewerDashboard() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEligibility, setFilterEligibility] = useState('all');

  useEffect(() => {
    Promise.all([
      API.get(`/applications/all?status=${filterStatus}&eligibility=${filterEligibility}`),
      API.get('/applications/stats'),
    ]).then(([appsRes, statsRes]) => {
      setApplications(appsRes.data);
      setStats(statsRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [filterStatus, filterEligibility]);

  return (
    <div className="page">
      <Navbar />
      <div className="container">
        <div className="page-header">
          <div>
            <h1>📋 Reviewer Dashboard</h1>
            <p className="text-muted">Review and process community development grant applications.</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card-dashboard">
            <span className="stat-icon">📬</span>
            <div className="stat-number-lg">{stats.submitted || 0}</div>
            <div className="stat-label-lg">Submitted</div>
          </div>
          <div className="stat-card-dashboard warning">
            <span className="stat-icon">🔍</span>
            <div className="stat-number-lg">{stats.under_review || 0}</div>
            <div className="stat-label-lg">Under Review</div>
          </div>
          <div className="stat-card-dashboard success">
            <span className="stat-icon">✅</span>
            <div className="stat-number-lg">{stats.approved || 0}</div>
            <div className="stat-label-lg">Approved</div>
            <div className="stat-sublabel">${(stats.total_awarded || 0).toLocaleString()} total</div>
          </div>
          <div className="stat-card-dashboard danger">
            <span className="stat-icon">❌</span>
            <div className="stat-number-lg">{stats.rejected || 0}</div>
            <div className="stat-label-lg">Rejected</div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <span className="filters-label">Filter:</span>
          <label>
            Eligibility
            <select value={filterEligibility} onChange={(e) => setFilterEligibility(e.target.value)}>
              <option value="all">All</option>
              <option value="eligible">Eligible</option>
              <option value="not_eligible">Not Eligible</option>
            </select>
          </label>
          <label>
            Status
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
            {applications.length} result{applications.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="loading">Loading applications…</div>
        ) : applications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h2>No Applications Found</h2>
            <p>No applications match your current filters. Try adjusting the criteria above.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Organization</th>
                  <th>Project Title</th>
                  <th>Submitted</th>
                  <th>Eligibility</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id}>
                    <td><span className="app-id">#{app.id}</span></td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{app.org_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                        {app.project_category}
                      </div>
                    </td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                      {app.project_title}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td>
                      <span className={`badge ${app.is_eligible ? 'badge-approved' : 'badge-rejected'}`}>
                        {app.is_eligible ? '✅' : '❌'} {app.eligibility_score}/6
                      </span>
                    </td>
                    <td><StatusBadge status={app.status} /></td>
                    <td>
                      <button className="btn btn-sm btn-primary" onClick={() => navigate(`/reviewer/applications/${app.id}`)}>
                        Review →
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

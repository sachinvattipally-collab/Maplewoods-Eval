import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import API from '../services/api';

export default function AdminReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    API.get('/admin/report')
      .then((res) => setReport(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load report.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><Navbar /><div className="loading">Loading report…</div></div>;

  return (
    <div className="page">
      <Navbar />
      <div className="container">
        <div className="page-header">
          <div>
            <h1>📊 Administrator Summary Report</h1>
            <p className="text-muted">Director Priya Sharma · Maplewood County Office of Community Development</p>
          </div>
          <div style={{
            fontSize: 12, color: 'var(--text-muted)', fontWeight: 600,
            padding: '8px 14px', background: 'white', border: '1px solid var(--border)',
            borderRadius: 8, boxShadow: 'var(--shadow-xs)'
          }}>
            🕐 {new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        {report && (
          <>
            {/* Stat cards */}
            <div className="stats-grid" style={{ marginBottom: 28 }}>
              <div className="stat-card-dashboard">
                <span className="stat-icon">👥</span>
                <div className="stat-number-lg">{report.totalApplicants}</div>
                <div className="stat-label-lg">Registered Applicants</div>
              </div>
              <div className="stat-card-dashboard">
                <span className="stat-icon">📄</span>
                <div className="stat-number-lg">{report.summary.total}</div>
                <div className="stat-label-lg">Total Applications</div>
              </div>
              <div className="stat-card-dashboard" style={{ borderTopColor: 'var(--info)' }}>
                <span className="stat-icon">📬</span>
                <div className="stat-number-lg">{report.summary.submitted}</div>
                <div className="stat-label-lg">Submitted</div>
              </div>
              <div className="stat-card-dashboard warning">
                <span className="stat-icon">🔍</span>
                <div className="stat-number-lg">{report.summary.under_review}</div>
                <div className="stat-label-lg">Under Review</div>
              </div>
              <div className="stat-card-dashboard success">
                <span className="stat-icon">✅</span>
                <div className="stat-number-lg">{report.summary.approved}</div>
                <div className="stat-label-lg">Approved</div>
              </div>
              <div className="stat-card-dashboard danger">
                <span className="stat-icon">❌</span>
                <div className="stat-number-lg">{report.summary.rejected}</div>
                <div className="stat-label-lg">Rejected</div>
              </div>
            </div>

            {/* Funds banner */}
            <div style={{
              background: 'linear-gradient(135deg, #001a3d 0%, var(--primary) 50%, #0055A5 100%)',
              borderRadius: 'var(--radius-lg)',
              padding: '32px 36px',
              color: 'white',
              marginBottom: 24,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,48,104,0.35)'
            }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 80% 50%, rgba(251,173,24,0.08), transparent 60%)', pointerEvents: 'none' }} />
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 24, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                💰 Funds Awarded Summary
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 24 }}>
                {[
                  ['Total Awarded', report.summary.total_awarded],
                  ['Average Award', Math.round(report.summary.avg_award)],
                  ['Highest Award', report.summary.max_award],
                  ['Lowest Award', report.summary.min_award],
                ].map(([label, val]) => (
                  <div key={label} style={{ textAlign: 'center', padding: '16px', background: 'rgba(255,255,255,0.07)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: 34, fontWeight: 800, color: '#FBAD18', letterSpacing: '-0.03em' }}>
                      ${Number(val || 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 6, fontWeight: 600 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* By Category */}
            <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                <h2 className="section-title" style={{ margin: 0, border: 0, padding: 0 }}>📂 Applications by Project Category</h2>
              </div>
              {report.byCategory.length === 0 ? (
                <p style={{ padding: 24, color: 'var(--text-muted)', fontSize: 14 }}>No applications yet.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Total</th>
                      <th>Approved</th>
                      <th>Approval Rate</th>
                      <th>Total Awarded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byCategory.map((row) => (
                      <tr key={row.category}>
                        <td style={{ fontWeight: 600 }}>{row.category}</td>
                        <td>{row.count}</td>
                        <td><span className="badge badge-approved">✓ {row.approved}</span></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 99 }}>
                              <div style={{
                                height: '100%', borderRadius: 99,
                                background: 'var(--success)',
                                width: `${row.count > 0 ? Math.round((row.approved / row.count) * 100) : 0}%`
                              }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', minWidth: 32 }}>
                              {row.count > 0 ? `${Math.round((row.approved / row.count) * 100)}%` : '—'}
                            </span>
                          </div>
                        </td>
                        <td>
                          {row.total_awarded > 0
                            ? <span style={{ color: 'var(--success)', fontWeight: 700 }}>${Number(row.total_awarded).toLocaleString()}</span>
                            : <span style={{ color: 'var(--text-light)' }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* By Eligibility */}
            <div className="card" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                <h2 className="section-title" style={{ margin: 0, border: 0, padding: 0 }}>🛡️ Applications by Eligibility</h2>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Eligibility Status</th>
                    <th>Total</th>
                    <th>Approved</th>
                    <th>Rejected</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byEligibility.map((row) => (
                    <tr key={row.eligibility}>
                      <td>
                        <span className={`badge ${row.eligibility === 'Eligible' ? 'badge-approved' : 'badge-rejected'}`}>
                          {row.eligibility === 'Eligible' ? '✅' : '❌'} {row.eligibility}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{row.count}</td>
                      <td><span className="badge badge-approved">{row.approved}</span></td>
                      <td><span className="badge badge-rejected">{row.rejected}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Recent Applications */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="section-title" style={{ margin: 0, border: 0, padding: 0 }}>🕐 Recent Applications</h2>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Last 10 submissions</span>
              </div>
              {report.recentApplications.length === 0 ? (
                <p style={{ padding: 24, color: 'var(--text-muted)', fontSize: 14 }}>No applications yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Applicant</th>
                        <th>Project</th>
                        <th>Score</th>
                        <th>Status</th>
                        <th>Requested</th>
                        <th>Awarded</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.recentApplications.map((app) => (
                        <tr key={app.id}>
                          <td><span className="app-id">#{app.id}</span></td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{app.applicant_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{app.org_name}</div>
                          </td>
                          <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                            {app.project_title}
                          </td>
                          <td>
                            <span className={`badge ${app.is_eligible ? 'badge-approved' : 'badge-rejected'}`}>
                              {app.eligibility_score}/6
                            </span>
                          </td>
                          <td><StatusBadge status={app.status} /></td>
                          <td style={{ fontWeight: 600, fontSize: 13 }}>${Number(app.amount_requested).toLocaleString()}</td>
                          <td>
                            {app.award_amount
                              ? <span style={{ color: 'var(--success)', fontWeight: 700 }}>${Number(app.award_amount).toLocaleString()}</span>
                              : <span style={{ color: 'var(--text-light)' }}>—</span>}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

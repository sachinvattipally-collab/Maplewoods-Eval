import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import API from '../services/api';

export default function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get(`/applications/${id}`)
      .then((res) => setApp(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="page">
      <Navbar />
      <div className="container loading-container">
        <div className="spinner-lg"></div>
        <p className="loading-text">Loading application…</p>
      </div>
    </div>
  );
  if (!app) return <div className="page"><Navbar /><div className="container">Application not found.</div></div>;

  return (
    <div className="page">
      <Navbar />
      <div className="container container-narrow">
        <button className="btn btn-outline btn-sm back-btn" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>

        <div className="page-header">
          <div>
            <h1>{app.project_title}</h1>
            <p className="text-muted">Application #{app.id} · Submitted {new Date(app.created_at).toLocaleDateString()}</p>
          </div>
          <StatusBadge status={app.status} />
        </div>

        {app.status === 'APPROVED' && app.award_amount && (
          <div className="award-banner">
            🎉 <strong>Congratulations! Your application has been approved.</strong>
            <div className="award-big">${app.award_amount.toLocaleString()}</div>
            <div>Award Amount</div>
            {app.award_breakdown?.length > 0 && (
              <div className="award-breakdown-section">
                <table className="table table-transparent">
                  <thead><tr><th>Factor</th><th>Score</th><th>Reason</th></tr></thead>
                  <tbody>
                    {app.award_breakdown.map((b) => (
                      <tr key={b.factor}><td>{b.factor}</td><td>{b.score}/{b.maxScore}</td><td>{b.reason}</td></tr>
                    ))}
                    <tr><td><strong>Total</strong></td><td><strong>{app.award_breakdown.reduce((s, b) => s + b.score, 0)}/15</strong></td><td>{app.award_percentage?.toFixed(1)}% of requested</td></tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {app.status === 'REJECTED' && (
          <div className="alert alert-error">
            <strong>❌ Application Rejected</strong>
            <p>{app.reviewer_comments || 'No comments provided.'}</p>
          </div>
        )}

        <div className="card card-mb">
          <h2 className="section-title">Eligibility Results</h2>
          <div className={`eligibility-summary ${app.is_eligible ? 'eligible' : 'partial'}`}>
            {app.is_eligible ? '✅ Eligible — All 6 criteria met' : `❌ Not Eligible — ${app.eligibility_score} of 6 criteria met`}
          </div>
          {app.eligibility_results?.map((rule) => (
            <div key={rule.ruleNumber} className={`eligibility-rule ${rule.pass === true ? 'pass' : rule.pass === false ? 'fail' : 'neutral'}`}>
              <span className="rule-icon">{rule.pass === true ? '✅' : rule.pass === false ? '❌' : '⬜'}</span>
              <span className="rule-text-inline"><strong>{rule.ruleName}:</strong> {rule.message}</span>
            </div>
          ))}
        </div>

        <div className="card card-mb">
          <h2 className="section-title">Organization Information</h2>
          {[['Organization Name', app.org_name], ['EIN', app.ein], ['Type', app.org_type], ['Year Founded', app.year_founded], ['Annual Budget', app.annual_budget !== null && app.annual_budget !== undefined ? `$${app.annual_budget.toLocaleString()}` : ''], ['Employees', app.num_employees], ['Contact', app.contact_name], ['Email', app.contact_email], ['Phone', app.contact_phone], ['Address', app.org_address]].map(([l, v]) => v ? (
            <div key={l} className="review-field"><span className="review-label">{l}</span><span className="review-value">{v}</span></div>
          ) : null)}
          {app.mission_statement && <div className="review-field"><span className="review-label">Mission Statement</span><span className="review-value">{app.mission_statement}</span></div>}
        </div>

        <div className="card">
          <h2 className="section-title">Project Details</h2>
          {[['Project Title', app.project_title], ['Category', app.project_category], ['Target Population', app.target_population], ['Beneficiaries', app.num_beneficiaries], ['Total Cost', app.total_project_cost ? `$${app.total_project_cost.toLocaleString()}` : ''], ['Amount Requested', app.amount_requested ? `$${app.amount_requested.toLocaleString()}` : ''], ['Start Date', app.project_start_date], ['End Date', app.project_end_date], ['Previous Grant', app.prev_grant ? 'Yes' : 'No']].map(([l, v]) => v !== undefined && v !== null ? (
            <div key={l} className="review-field"><span className="review-label">{l}</span><span className="review-value">{v}</span></div>
          ) : null)}
          {app.project_description && <div className="review-field"><span className="review-label">Description</span><span className="review-value">{app.project_description}</span></div>}
          {app.file_name && <div className="review-field"><span className="review-label">Document</span><span className="review-value">📎 {app.file_name}</span></div>}
        </div>
      </div>
    </div>
  );
}

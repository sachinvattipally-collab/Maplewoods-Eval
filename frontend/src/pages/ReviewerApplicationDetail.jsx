import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import API, { downloadDocument } from '../services/api';

export default function ReviewerApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [awardData, setAwardData] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [approveComment, setApproveComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [docLoading, setDocLoading] = useState(false);

  useEffect(() => {
    API.get(`/applications/${id}`)
      .then((res) => {
        setApp(res.data);
        if (res.data.status === 'SUBMITTED') {
          API.patch(`/applications/${id}/status`, { status: 'UNDER_REVIEW' }).catch(() => {});
        }
      })
      .catch(() => setError('Failed to load application.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleOpenApprove() {
    setError('');
    try {
      const res = await API.post(`/applications/${id}/award`);
      setAwardData(res.data);
      setShowApproveModal(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to calculate award. Please try again.');
    }
  }

  async function handleConfirmApprove() {
    setActionLoading(true);
    setError('');
    try {
      await API.patch(`/applications/${id}/status`, { status: 'APPROVED', comments: approveComment });
      navigate('/reviewer');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve. Please try again.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmReject() {
    if (!rejectComment.trim()) { setError('Please provide a rejection reason.'); return; }
    setActionLoading(true);
    setError('');
    try {
      await API.patch(`/applications/${id}/status`, { status: 'REJECTED', comments: rejectComment });
      navigate('/reviewer');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject. Please try again.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDocDownload() {
    setDocLoading(true);
    try {
      await downloadDocument(id, app.file_name);
    } catch {
      setError('Failed to download the document. Please try again.');
    } finally {
      setDocLoading(false);
    }
  }

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

  const canAct = app.status !== 'APPROVED' && app.status !== 'REJECTED';

  return (
    <div className="page">
      <Navbar />
      <div className="container container-reviewer">
        <button className="btn btn-outline btn-sm back-btn" onClick={() => navigate('/reviewer')}>← Back to Dashboard</button>

        <div className="page-header">
          <div>
            <h1>{app.project_title}</h1>
            <p className="text-muted">#{app.id} · {app.org_name} · Submitted {new Date(app.created_at).toLocaleDateString()}</p>
          </div>
          <StatusBadge status={app.status} />
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {canAct && (
          <div className="action-bar">
            <button className="btn btn-success btn-lg" onClick={handleOpenApprove}>✅ Approve Application</button>
            <button className="btn btn-danger btn-lg" onClick={() => { setShowRejectModal(true); setError(''); }}>❌ Reject Application</button>
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
              <div className="rule-text">
                <div className="rule-name">{rule.ruleName}</div>
                <div className="rule-message">{rule.message}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card card-mb">
          <h2 className="section-title">Organization Information</h2>
          {[
            ['Organization Name', app.org_name], ['EIN', app.ein], ['Type', app.org_type],
            ['Year Founded', app.year_founded],
            ['Annual Budget', app.annual_budget !== null && app.annual_budget !== undefined ? `$${app.annual_budget.toLocaleString()}` : ''],
            ['Employees', app.num_employees], ['Contact Name', app.contact_name],
            ['Contact Email', app.contact_email], ['Contact Phone', app.contact_phone],
            ['Address', app.org_address], ['Applicant Account', app.applicant_email],
          ].map(([l, v]) => v != null && v !== '' ? (
            <div key={l} className="review-field">
              <span className="review-label">{l}</span>
              <span className="review-value">{v}</span>
            </div>
          ) : null)}
          {app.mission_statement && (
            <div className="review-field">
              <span className="review-label">Mission Statement</span>
              <span className="review-value">{app.mission_statement}</span>
            </div>
          )}
        </div>

        <div className="card card-mb">
          <h2 className="section-title">Project Details</h2>
          {[
            ['Project Title', app.project_title], ['Category', app.project_category],
            ['Target Population', app.target_population],
            ['Beneficiaries', app.num_beneficiaries?.toLocaleString()],
            ['Total Project Cost', app.total_project_cost ? `$${app.total_project_cost.toLocaleString()}` : ''],
            ['Amount Requested', app.amount_requested ? `$${app.amount_requested.toLocaleString()}` : ''],
            ['Funding Ratio', app.total_project_cost ? `${((app.amount_requested / app.total_project_cost) * 100).toFixed(1)}%` : ''],
            ['Start Date', app.project_start_date], ['End Date', app.project_end_date],
            ['Previous Grant', app.prev_grant ? 'Yes' : 'No'],
          ].map(([l, v]) => v != null && v !== '' ? (
            <div key={l} className="review-field">
              <span className="review-label">{l}</span>
              <span className="review-value">{v}</span>
            </div>
          ) : null)}
          {app.project_description && (
            <div className="review-field">
              <span className="review-label">Description</span>
              <span className="review-value">{app.project_description}</span>
            </div>
          )}
          {app.file_name && (
            <div className="review-field">
              <span className="review-label">Supporting Document</span>
              <button className="btn btn-sm btn-outline" onClick={handleDocDownload} disabled={docLoading}>
                📎 {docLoading ? 'Downloading…' : app.file_name}
              </button>
            </div>
          )}
        </div>

        {app.status === 'APPROVED' && app.award_amount && (
          <div className="award-banner">
            <strong>✅ Approved — Award Amount: ${app.award_amount.toLocaleString()}</strong>
            {app.award_breakdown?.length > 0 && (
              <table className="table table-transparent award-breakdown-section">
                <thead><tr><th>Factor</th><th>Score</th><th>Reason</th></tr></thead>
                <tbody>
                  {app.award_breakdown.map((b) => (
                    <tr key={b.factor}><td>{b.factor}</td><td>{b.score}/{b.maxScore}</td><td>{b.reason}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {app.status === 'REJECTED' && (
          <div className="alert alert-error">
            <strong>❌ Rejected</strong>
            <p>{app.reviewer_comments}</p>
          </div>
        )}

        {showApproveModal && awardData && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="approve-title">
            <div className="modal">
              <h2 id="approve-title">Approve Application</h2>
              <h3>Award Calculation Breakdown</h3>
              <table className="table">
                <thead><tr><th>Factor</th><th>Score</th><th>Reason</th></tr></thead>
                <tbody>
                  {awardData.breakdown.map((b) => (
                    <tr key={b.factor}><td>{b.factor}</td><td>{b.score}/{b.maxScore}</td><td>{b.reason}</td></tr>
                  ))}
                  <tr className="total-row">
                    <td>TOTAL SCORE</td><td>{awardData.totalScore}/15</td><td>{awardData.awardPercentage}%</td>
                  </tr>
                </tbody>
              </table>
              <div className="award-summary-box">
                <div>Amount Requested: <strong>${awardData.amountRequested?.toLocaleString()}</strong></div>
                <div>Award Percentage: <strong>{awardData.awardPercentage}%</strong></div>
                <div className="final-award">AWARD AMOUNT: <strong>${awardData.finalAward?.toLocaleString()}</strong></div>
              </div>
              <div className="form-group modal-comment-group">
                <label htmlFor="approveComment">Optional Comments for Applicant</label>
                <textarea id="approveComment" rows={3} value={approveComment} onChange={(e) => setApproveComment(e.target.value)} placeholder="Optional notes for the applicant…" maxLength={2000} />
              </div>
              {error && <div className="alert alert-error">{error}</div>}
              <div className="modal-actions">
                <button className="btn btn-outline" onClick={() => setShowApproveModal(false)}>Cancel</button>
                <button className="btn btn-success" onClick={handleConfirmApprove} disabled={actionLoading}>
                  {actionLoading ? (<><span className="spinner"></span> Approving…</>) : `✅ Confirm Approval — $${awardData.finalAward?.toLocaleString()}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {showRejectModal && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="reject-title">
            <div className="modal">
              <h2 id="reject-title">Reject Application</h2>
              <p>Please provide a reason for rejection. This will be visible to the applicant.</p>
              <div className="form-group">
                <label htmlFor="rejectComment">Rejection Reason * (required)</label>
                <textarea
                  id="rejectComment"
                  rows={4}
                  value={rejectComment}
                  onChange={(e) => { setRejectComment(e.target.value); setError(''); }}
                  placeholder="Explain why this application is being rejected…"
                  className={error ? 'input-error' : ''}
                  maxLength={2000}
                />
                <span className="char-count">{rejectComment.length}/2000</span>
                {error && <span className="field-error">{error}</span>}
              </div>
              <div className="modal-actions">
                <button className="btn btn-outline" onClick={() => { setShowRejectModal(false); setError(''); }}>Cancel</button>
                <button className="btn btn-danger" onClick={handleConfirmReject} disabled={actionLoading}>
                  {actionLoading ? (<><span className="spinner"></span> Rejecting…</>) : '❌ Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

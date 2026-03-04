import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { checkEligibility } from '../services/eligibilityEngine';
import { getStoredFile, clearStoredFile } from '../services/fileStore';
import API from '../services/api';

export default function ReviewSubmit() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');

  const rawForm = sessionStorage.getItem('draftForm');
  const fileName = sessionStorage.getItem('draftFileName');
  if (!rawForm) { navigate('/apply'); return null; }
  const form = JSON.parse(rawForm);

  const eligibility = checkEligibility(form);

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const payload = {
        org_name: form.orgName, ein: form.ein, org_type: form.orgType,
        year_founded: form.yearFounded, annual_budget: form.annualBudget,
        num_employees: form.numEmployees, contact_name: form.contactName,
        contact_email: form.contactEmail, contact_phone: form.contactPhone,
        org_address: form.orgAddress, mission_statement: form.missionStatement,
        project_title: form.projectTitle, project_category: form.projectCategory,
        project_description: form.projectDescription, target_population: form.targetPopulation,
        num_beneficiaries: form.numBeneficiaries, total_project_cost: form.totalProjectCost,
        amount_requested: form.amountRequested, project_start_date: form.projectStartDate,
        project_end_date: form.projectEndDate, prev_grant: form.prevGrant,
      };

      setUploadProgress('Submitting application…');
      const res = await API.post('/applications', payload);
      const appId = res.data.applicationId;

      const file = getStoredFile();
      if (file) {
        setUploadProgress('Uploading document…');
        const fd = new FormData();
        fd.append('document', file);
        await API.post(`/applications/${appId}/documents`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      sessionStorage.removeItem('draftForm');
      sessionStorage.removeItem('draftFileName');
      clearStoredFile();
      navigate('/dashboard', { state: { submitted: true } });
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  }

  function Field({ label, value }) {
    if (!value && value !== 0 && value !== false) return null;
    return (
      <div className="review-field">
        <span className="review-label">{label}</span>
        <span className="review-value">{String(value)}</span>
      </div>
    );
  }

  return (
    <div className="page">
      <Navbar />
      <div className="container container-narrow">
        <h1>Review Your Application</h1>
        <p className="text-muted">Please review your information before submitting.</p>

        {!eligibility.overallEligible && (
          <div className="alert alert-warning">
            ⚠️ <strong>Eligibility Warning:</strong> Your application does not meet all {6 - eligibility.score} eligibility {6 - eligibility.score === 1 ? 'criterion' : 'criteria'}. You may still submit — the reviewer will make the final determination.
          </div>
        )}
        {eligibility.overallEligible && (
          <div className="alert alert-success">
            ✅ Your application meets all 6 eligibility criteria. Great job!
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        <div className="card card-mb">
          <h2 className="section-title">Section 1: Organization Information</h2>
          <Field label="Organization Name" value={form.orgName} />
          <Field label="EIN" value={form.ein} />
          <Field label="Organization Type" value={form.orgType} />
          <Field label="Year Founded" value={form.yearFounded} />
          <Field label="Annual Operating Budget" value={form.annualBudget ? `$${parseFloat(form.annualBudget).toLocaleString()}` : ''} />
          <Field label="Full-Time Employees" value={form.numEmployees} />
          <Field label="Contact Name" value={form.contactName} />
          <Field label="Contact Email" value={form.contactEmail} />
          <Field label="Contact Phone" value={form.contactPhone} />
          <Field label="Address" value={form.orgAddress} />
          <Field label="Mission Statement" value={form.missionStatement} />
        </div>

        <div className="card card-mb">
          <h2 className="section-title">Section 2: Project Details</h2>
          <Field label="Project Title" value={form.projectTitle} />
          <Field label="Project Category" value={form.projectCategory} />
          <Field label="Project Description" value={form.projectDescription} />
          <Field label="Target Population" value={form.targetPopulation} />
          <Field label="Estimated Beneficiaries" value={form.numBeneficiaries} />
          <Field label="Total Project Cost" value={form.totalProjectCost ? `$${parseFloat(form.totalProjectCost).toLocaleString()}` : ''} />
          <Field label="Amount Requested" value={form.amountRequested ? `$${parseFloat(form.amountRequested).toLocaleString()}` : ''} />
          <Field label="Project Start Date" value={form.projectStartDate} />
          <Field label="Project End Date" value={form.projectEndDate} />
          <Field label="Previously Received Grant" value={form.prevGrant ? 'Yes' : 'No'} />
          <Field label="Supporting Document" value={fileName} />
        </div>

        <div className="card card-mb-lg">
          <h2 className="section-title">Eligibility Summary</h2>
          <div className={`eligibility-summary ${eligibility.overallEligible ? 'eligible' : 'partial'}`} style={{ marginBottom: 12 }}>
            {eligibility.summary}
          </div>
          {eligibility.rules.map((rule) => (
            <div key={rule.ruleNumber} className={`eligibility-rule ${rule.pass === true ? 'pass' : rule.pass === false ? 'fail' : 'neutral'}`}>
              <span className="rule-icon">{rule.pass === true ? '✅' : rule.pass === false ? '❌' : '⬜'}</span>
              <span className="rule-text-inline">{rule.ruleName}: {rule.message}</span>
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button className="btn btn-outline" onClick={() => navigate('/apply')}>← Back to Edit</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <><span className="spinner"></span> {uploadProgress || 'Submitting…'}</>
            ) : '✓ Submit Application'}
          </button>
        </div>
      </div>
    </div>
  );
}

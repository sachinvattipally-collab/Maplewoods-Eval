import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import EligibilityPanel from '../components/EligibilityPanel';
import { storeFile, getStoredFile } from '../services/fileStore';

const ORG_TYPES = ['501(c)(3)', '501(c)(4)', 'Community-Based Organization', 'Faith-Based Organization', 'For-Profit Business', 'Government Agency', 'Individual'];
const CATEGORIES = ['Youth Programs', 'Senior Services', 'Public Health', 'Neighborhood Safety', 'Arts & Culture', 'Workforce Development', 'Other'];

const EMPTY_FORM = {
  orgName: '', ein: '', orgType: '', yearFounded: '', annualBudget: '',
  numEmployees: '', contactName: '', contactEmail: '', contactPhone: '',
  orgAddress: '', missionStatement: '',
  projectTitle: '', projectCategory: '', projectDescription: '',
  targetPopulation: '', numBeneficiaries: '', totalProjectCost: '',
  amountRequested: '', projectStartDate: '', projectEndDate: '',
  prevGrant: false,
};

// Per-field validation rules — each returns an error string or null.
// Validators that depend on sibling fields receive the full form as a second arg.
const FIELD_VALIDATORS = {
  orgName(v) {
    if (!v || v.length < 2) return 'Organization name must be at least 2 characters.';
    if (v.length > 100)     return 'Organization name must be under 100 characters.';
    return null;
  },

  ein(v) {
    return /^\d{2}-\d{7}$/.test(v) ? null : 'EIN must be in format XX-XXXXXXX.';
  },

  orgType(v) {
    return v ? null : 'Please select an organization type.';
  },

  yearFounded(v) {
    const yr = parseInt(v);
    const max = new Date().getFullYear();
    return (!yr || yr < 1800 || yr > max) ? `Year must be between 1800 and ${max}.` : null;
  },

  annualBudget(v) {
    const b = parseFloat(v);
    return (v === '' || isNaN(b) || b < 0 || b > 100_000_000)
      ? 'Enter a valid annual budget ($0–$100,000,000).'
      : null;
  },

  numEmployees(v) {
    const n = parseInt(v);
    return (v === '' || isNaN(n) || n < 0 || n > 9999)
      ? 'Enter number of employees (0–9,999).'
      : null;
  },

  contactName(v) {
    if (!v || v.length < 2) return 'Contact name must be at least 2 characters.';
    if (v.length > 50)      return 'Contact name must be under 50 characters.';
    return null;
  },

  contactEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Enter a valid email.';
  },

  contactPhone(v) {
    return /^\(\d{3}\) \d{3}-\d{4}$/.test(v) ? null : 'Phone must be in format (XXX) XXX-XXXX.';
  },

  orgAddress(v) {
    return (!v || v.length < 5) ? 'Address is required (minimum 5 characters).' : null;
  },

  missionStatement(v) {
    if (!v || v.length < 20) return 'Mission statement must be at least 20 characters.';
    if (v.length > 500)      return 'Mission statement must be under 500 characters.';
    return null;
  },

  projectTitle(v) {
    if (!v || v.length < 5) return 'Project title must be at least 5 characters.';
    if (v.length > 100)     return 'Project title must be under 100 characters.';
    return null;
  },

  projectCategory(v) {
    return v ? null : 'Select a project category.';
  },

  projectDescription(v) {
    if (!v || v.length < 50) return 'Description must be at least 50 characters.';
    if (v.length > 2000)     return 'Description must be under 2,000 characters.';
    return null;
  },

  targetPopulation(v) {
    return (!v || v.length < 5) ? 'Target population is required (minimum 5 characters).' : null;
  },

  numBeneficiaries(v) {
    const n = parseInt(v);
    return (v === '' || isNaN(n) || n < 1) ? 'Enter number of beneficiaries (minimum 1).' : null;
  },

  totalProjectCost(v) {
    const n = parseFloat(v);
    return (v === '' || isNaN(n) || n < 100 || n > 10_000_000)
      ? 'Total project cost must be between $100 and $10,000,000.'
      : null;
  },

  amountRequested(v) {
    const n = parseFloat(v);
    return (v === '' || isNaN(n) || n < 100 || n > 50_000)
      ? 'Amount requested must be between $100 and $50,000.'
      : null;
  },

  projectStartDate(v) {
    if (!v) return 'Start date is required.';
    const start = new Date(v);
    const earliest = new Date();
    earliest.setDate(earliest.getDate() + 30);
    return start < earliest ? 'Start date must be at least 30 days from today.' : null;
  },

  projectEndDate(v, form) {
    if (!v) return 'End date is required.';
    if (!form.projectStartDate) return null;
    const start = new Date(form.projectStartDate);
    const end = new Date(v);
    if (end <= start) return 'End date must be after start date.';
    const maxEnd = new Date(start);
    maxEnd.setMonth(maxEnd.getMonth() + 24);
    return end > maxEnd ? 'Project must end within 24 months of start.' : null;
  },
};

export default function ApplicationForm() {
  const navigate = useNavigate();
  const [section, setSection] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(getStoredFile());
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  function formatEIN(raw) {
    const digits = raw.replace(/\D/g, '').slice(0, 9);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }

  function formatPhone(raw) {
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    if (digits.length === 0) return '';
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    let formatted = type === 'checkbox' ? checked : value;
    if (name === 'ein') formatted = formatEIN(value);
    if (name === 'contactPhone') formatted = formatPhone(value);
    setForm((prev) => ({ ...prev, [name]: formatted }));
    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  }

  function handleBlur(e) {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const validator = FIELD_VALIDATORS[name];
    if (validator) {
      const err = validator(value, form);
      setErrors((prev) => {
        const copy = { ...prev };
        if (err) {
          copy[name] = err;
        } else {
          delete copy[name];
        }
        return copy;
      });
    }
  }

  function validateSection(fields) {
    const errs = {};
    for (const name of fields) {
      const validator = FIELD_VALIDATORS[name];
      if (validator) {
        const err = validator(form[name], form);
        if (err) errs[name] = err;
      }
    }
    return errs;
  }

  const section1Fields = ['orgName', 'ein', 'orgType', 'yearFounded', 'annualBudget', 'numEmployees', 'contactName', 'contactEmail', 'contactPhone', 'orgAddress', 'missionStatement'];
  const section2Fields = ['projectTitle', 'projectCategory', 'projectDescription', 'targetPopulation', 'numBeneficiaries', 'totalProjectCost', 'amountRequested', 'projectStartDate', 'projectEndDate'];

  function handleNext() {
    const errs = validateSection(section1Fields);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setTouched(Object.fromEntries(section1Fields.map((f) => [f, true])));
      return;
    }
    setErrors({});
    setSection(2);
    window.scrollTo(0, 0);
  }

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;

    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(f.type)) {
      setErrors((p) => ({ ...p, file: 'Only PDF, JPG, PNG files are allowed.' }));
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setErrors((p) => ({ ...p, file: 'File must be under 5 MB.' }));
      return;
    }

    setFile(f);
    storeFile(f);
    setErrors((p) => {
      const copy = { ...p };
      delete copy.file;
      return copy;
    });
  }

  function handleBack() {
    setErrors({});
    setSection(1);
    window.scrollTo(0, 0);
  }

  function handleReview() {
    const errs = validateSection(section2Fields);
    if (!file) errs.file = 'Please upload a supporting document (PDF, JPG, or PNG).';
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setTouched(Object.fromEntries(section2Fields.map((f) => [f, true])));
      return;
    }
    setErrors({});
    sessionStorage.setItem('draftForm', JSON.stringify(form));
    sessionStorage.setItem('draftFileName', file?.name || '');
    navigate('/apply/review');
  }

  const eligibilityData = {
    orgType: form.orgType, yearFounded: form.yearFounded,
    annualBudget: form.annualBudget, amountRequested: form.amountRequested,
    totalProjectCost: form.totalProjectCost, numBeneficiaries: form.numBeneficiaries,
  };

  function fieldProps(name, extra = {}) {
    return {
      name, value: form[name], onChange: handleChange, onBlur: handleBlur,
      className: errors[name] ? 'input-error' : '', ...extra,
    };
  }

  return (
    <div className="page">
      <Navbar />
      <div className="container">
        <div className="page-header">
          <div>
            <h1>Grant Application</h1>
            <div className="section-indicator">
              <span className={section === 1 ? 'step active' : 'step done'}>1. Organization Info</span>
              <span className="step-arrow">→</span>
              <span className={section === 2 ? 'step active' : 'step'}>2. Project Details</span>
            </div>
          </div>
        </div>

        <div className="form-layout">
          <div className="form-main">
            {section === 1 && (
              <div className="card">
                <h2 className="section-title">Section 1: Organization Information</h2>

                <div className="form-group">
                  <label>Organization Name *</label>
                  <input {...fieldProps('orgName')} placeholder="Legal name of your organization" />
                  {errors.orgName && <span className="field-error">{errors.orgName}</span>}
                  <span className="field-hint">The legal name of your organization</span>
                </div>

                <div className="form-group">
                  <label>EIN (Tax ID) *</label>
                  <input {...fieldProps('ein')} type="text" inputMode="numeric" placeholder="52-1234567" maxLength={10} />
                  {errors.ein && <span className="field-error">{errors.ein}</span>}
                  <span className="field-hint">Your IRS Employer Identification Number — auto-formatted as XX-XXXXXXX</span>
                </div>

                <div className="form-group">
                  <label>Organization Type *</label>
                  <select {...fieldProps('orgType')}>
                    <option value="">Select organization type…</option>
                    {ORG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {errors.orgType && <span className="field-error">{errors.orgType}</span>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Year Founded *</label>
                    <input {...fieldProps('yearFounded', { type: 'number', min: '1800', max: new Date().getFullYear() })} placeholder="e.g. 2010" />
                    {errors.yearFounded && <span className="field-error">{errors.yearFounded}</span>}
                  </div>
                  <div className="form-group">
                    <label>Number of Full-Time Employees *</label>
                    <input {...fieldProps('numEmployees', { type: 'number', min: '0', max: '9999' })} placeholder="e.g. 8" />
                    {errors.numEmployees && <span className="field-error">{errors.numEmployees}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label>Annual Operating Budget ($) *</label>
                  <input {...fieldProps('annualBudget', { type: 'number', min: '0' })} placeholder="e.g. 320000" />
                  {errors.annualBudget && <span className="field-error">{errors.annualBudget}</span>}
                  <span className="field-hint">Your organization's total annual budget (enter in dollars, no commas)</span>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Primary Contact Name *</label>
                    <input {...fieldProps('contactName')} placeholder="First and last name" />
                    {errors.contactName && <span className="field-error">{errors.contactName}</span>}
                  </div>
                  <div className="form-group">
                    <label>Primary Contact Phone *</label>
                    <input {...fieldProps('contactPhone')} type="tel" inputMode="numeric" placeholder="(410) 555-0100" maxLength={14} />
                    {errors.contactPhone && <span className="field-error">{errors.contactPhone}</span>}
                    <span className="field-hint">Auto-formatted as (XXX) XXX-XXXX</span>
                  </div>
                </div>

                <div className="form-group">
                  <label>Primary Contact Email *</label>
                  <input {...fieldProps('contactEmail', { type: 'email' })} placeholder="contact@yourorg.org" />
                  {errors.contactEmail && <span className="field-error">{errors.contactEmail}</span>}
                </div>

                <div className="form-group">
                  <label>Organization Address *</label>
                  <input {...fieldProps('orgAddress')} placeholder="Street, City, State, Zip" />
                  {errors.orgAddress && <span className="field-error">{errors.orgAddress}</span>}
                </div>

                <div className="form-group">
                  <label>Mission Statement * <span className="char-count">({form.missionStatement.length}/500)</span></label>
                  <textarea {...fieldProps('missionStatement', { rows: 4, maxLength: 500 })} placeholder="Briefly describe your organization's mission (20-500 characters)" />
                  {errors.missionStatement && <span className="field-error">{errors.missionStatement}</span>}
                </div>

                <div className="form-actions">
                  <button className="btn btn-primary" onClick={handleNext}>Next: Project Details →</button>
                </div>
              </div>
            )}

            {section === 2 && (
              <div className="card">
                <h2 className="section-title">Section 2: Project Details</h2>

                <div className="form-group">
                  <label>Project Title *</label>
                  <input {...fieldProps('projectTitle')} placeholder="A descriptive title for your project" />
                  {errors.projectTitle && <span className="field-error">{errors.projectTitle}</span>}
                </div>

                <div className="form-group">
                  <label>Project Category *</label>
                  <select {...fieldProps('projectCategory')}>
                    <option value="">Select a category…</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.projectCategory && <span className="field-error">{errors.projectCategory}</span>}
                </div>

                <div className="form-group">
                  <label>Project Description * <span className="char-count">({form.projectDescription.length}/2000)</span></label>
                  <textarea {...fieldProps('projectDescription', { rows: 5, maxLength: 2000 })} placeholder="Describe the project goals, activities, and expected outcomes (50-2000 characters)" />
                  {errors.projectDescription && <span className="field-error">{errors.projectDescription}</span>}
                </div>

                <div className="form-group">
                  <label>Target Population Served *</label>
                  <input {...fieldProps('targetPopulation')} placeholder='e.g. "At-risk youth ages 14-18 in East Maplewood"' />
                  {errors.targetPopulation && <span className="field-error">{errors.targetPopulation}</span>}
                </div>

                <div className="form-group">
                  <label>Estimated Number of Beneficiaries *</label>
                  <input {...fieldProps('numBeneficiaries', { type: 'number', min: '1' })} placeholder="e.g. 500" />
                  {errors.numBeneficiaries && <span className="field-error">{errors.numBeneficiaries}</span>}
                  <span className="field-hint">How many people will directly benefit? (minimum 50 for eligibility)</span>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Total Project Cost ($) *</label>
                    <input {...fieldProps('totalProjectCost', { type: 'number', min: '100' })} placeholder="e.g. 95000" />
                    {errors.totalProjectCost && <span className="field-error">{errors.totalProjectCost}</span>}
                  </div>
                  <div className="form-group">
                    <label>Amount Requested ($) *</label>
                    <input {...fieldProps('amountRequested', { type: 'number', min: '100', max: '50000' })} placeholder="e.g. 40000" />
                    {errors.amountRequested && <span className="field-error">{errors.amountRequested}</span>}
                    <span className="field-hint">Maximum $50,000. Must be ≤ 50% of total project cost for eligibility.</span>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Project Start Date *</label>
                    <input {...fieldProps('projectStartDate', { type: 'date' })} />
                    {errors.projectStartDate && <span className="field-error">{errors.projectStartDate}</span>}
                    <span className="field-hint">Must be at least 30 days from today.</span>
                  </div>
                  <div className="form-group">
                    <label>Project End Date *</label>
                    <input {...fieldProps('projectEndDate', { type: 'date' })} />
                    {errors.projectEndDate && <span className="field-error">{errors.projectEndDate}</span>}
                    <span className="field-hint">Must be after start date, within 24 months.</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input name="prevGrant" type="checkbox" checked={form.prevGrant} onChange={handleChange} />
                    Our organization has previously received a Maplewood County grant
                  </label>
                </div>

                <div className="form-group">
                  <label>Supporting Document * <span className="text-muted">(PDF, JPG, PNG — max 5 MB)</span></label>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className={errors.file ? 'input-error' : ''} />
                  {file && <span className="file-selected">✅ {file.name}</span>}
                  {errors.file && <span className="field-error">{errors.file}</span>}
                  <span className="field-hint">Upload your project proposal, budget breakdown, or supporting documentation.</span>
                </div>

                <div className="form-actions">
                  <button className="btn btn-outline" onClick={handleBack}>← Back</button>
                  <button className="btn btn-primary" onClick={handleReview}>Review & Submit →</button>
                </div>
              </div>
            )}
          </div>

          <div className="form-sidebar">
            <EligibilityPanel formData={eligibilityData} />
          </div>
        </div>
      </div>
    </div>
  );
}

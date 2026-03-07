import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../services/api';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', organization_name: '', password: '', confirm_password: '',
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-formats digits into (XXX) XXX-XXXX as the user types
  function formatPhone(raw) {
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    if (digits.length === 0) return '';
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  function validate(field, value) {
    const errs = { ...errors };
    if (field === 'full_name' && value.length < 2) errs.full_name = 'Full name must be at least 2 characters.';
    else if (field === 'full_name') delete errs.full_name;
    if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errs.email = 'Enter a valid email address.';
    else if (field === 'email') delete errs.email;
    if (field === 'phone') {
      if (value && !/^\(\d{3}\) \d{3}-\d{4}$/.test(value))
        errs.phone = 'Phone must be a complete 10-digit number — (XXX) XXX-XXXX.';
      else delete errs.phone;
    }
    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (field === 'password' && !strongPassword.test(value))
      errs.password = 'Password must be 8+ characters and include uppercase, lowercase, and a number.';
    else if (field === 'password') delete errs.password;
    if (field === 'confirm_password' && value !== form.password) errs.confirm_password = 'Passwords do not match.';
    else if (field === 'confirm_password') delete errs.confirm_password;
    setErrors(errs);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    const formatted = name === 'phone' ? formatPhone(value) : value;
    setForm({ ...form, [name]: formatted });
    if (errors[name]) validate(name, formatted);
  }

  function handleBlur(e) {
    validate(e.target.name, e.target.value);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError('');
    setLoading(true);
    try {
      const res = await API.post('/auth/register', form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (err) {
      setApiError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo-wrap">🏛</div>
          <h1>Create Your Account</h1>
          <p>Join the Maplewood County Grant Program</p>
        </div>
        {apiError && <div className="alert alert-error">{apiError}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="full_name">Full Name *</label>
            <input id="full_name" name="full_name" type="text" required value={form.full_name}
              onChange={handleChange} onBlur={handleBlur} className={errors.full_name ? 'input-error' : ''} />
            {errors.full_name && <span className="field-error">{errors.full_name}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input id="email" name="email" type="email" required value={form.email}
              onChange={handleChange} onBlur={handleBlur} className={errors.email ? 'input-error' : ''} />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={(e) => {
                // Allow: digits, backspace, delete, tab, arrows, home/end
                const allowed = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End'];
                if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
              }}
              placeholder="(XXX) XXX-XXXX"
              maxLength={14}
              className={errors.phone ? 'input-error' : ''}
            />
            {errors.phone
              ? <span className="field-error">{errors.phone}</span>
              : <span className="field-hint" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Format: (XXX) XXX-XXXX · 10 digits</span>
            }
          </div>
          <div className="form-group">
            <label htmlFor="organization_name">Organization Name</label>
            <input id="organization_name" name="organization_name" type="text" value={form.organization_name}
              onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input id="password" name="password" type="password" required value={form.password}
              onChange={handleChange} onBlur={handleBlur} className={errors.password ? 'input-error' : ''} />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="confirm_password">Confirm Password *</label>
            <input id="confirm_password" name="confirm_password" type="password" required value={form.confirm_password}
              onChange={handleChange} onBlur={handleBlur} className={errors.confirm_password ? 'input-error' : ''} />
            {errors.confirm_password && <span className="field-error">{errors.confirm_password}</span>}
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
        <p className="auth-link">Already have an account? <Link to="/login">Log in</Link></p>
      </div>
    </div>
  );
}

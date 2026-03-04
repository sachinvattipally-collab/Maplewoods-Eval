import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await API.post('/auth/login', form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      if (res.data.user.role === 'REVIEWER') navigate('/reviewer');
      else if (res.data.user.role === 'ADMIN') navigate('/admin/report');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo-wrap">🏛</div>
          <h1>Welcome Back</h1>
          <p>Maplewood County Community Development Grant Program</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input id="email" name="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoFocus />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input id="password" name="password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Logging in…' : 'Log In'}
          </button>
        </form>
        <p className="auth-link">Don't have an account? <Link to="/register">Register</Link></p>
        <div className="reviewer-hint"><strong>Reviewer?</strong> Log in with your @maplewood.gov email.</div>
      </div>
    </div>
  );
}

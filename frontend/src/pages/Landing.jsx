import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="navbar-brand">
          <span className="navbar-logo">🏛</span>
          <div>
            <div className="navbar-title">Maplewood County</div>
            <div className="navbar-subtitle">Office of Community Development</div>
          </div>
        </div>
      </nav>

      <div className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-badge">2026 Grant Cycle Now Open</div>
          <h1 className="landing-heading">
            Community Development <span>Grant Program</span>
          </h1>
          <p className="landing-description">
            Maplewood County awards up to <strong style={{ color: '#FBAD18' }}>$50,000</strong> to eligible nonprofit
            organizations for community improvement projects. Check eligibility in real time and track your application.
          </p>
          <div className="landing-stats">
            <div className="stat-card">
              <div className="stat-number">$2M</div>
              <div className="stat-label">Annual Funding</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">$50K</div>
              <div className="stat-label">Max Per Grant</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">6</div>
              <div className="stat-label">Eligibility Criteria</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">100%</div>
              <div className="stat-label">Transparent Scoring</div>
            </div>
          </div>
          <div className="landing-buttons">
            <button className="btn btn-gold btn-lg" onClick={() => navigate('/register')}>
              ✦ Apply Now — Register
            </button>
            <button className="btn btn-navbar btn-lg" onClick={() => navigate('/login')}>
              Log In →
            </button>
          </div>
        </div>
      </div>

      <div className="landing-how">
        <div className="landing-how-label">Simple Process</div>
        <h2>How It <span>Works</span></h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Register</h3>
            <p>Create your organization's account in under 2 minutes with no credit card required.</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Apply</h3>
            <p>Fill out the two-section application with real-time eligibility feedback as you type.</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Track</h3>
            <p>Monitor your application status as our review team evaluates your submission.</p>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <h3>Receive</h3>
            <p>Approved applications receive a transparent, formula-based award up to $50,000.</p>
          </div>
        </div>
      </div>

      <footer className="landing-footer">
        <p>© 2026 Maplewood County Office of Community Development · All rights reserved.</p>
      </footer>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">🏛</span>
        <div>
          <div className="navbar-title">Maplewood County</div>
          <div className="navbar-subtitle">Community Development Grants</div>
        </div>
      </div>
      <div className="navbar-actions">
        {user && (
          <>
            <span className="navbar-user">
              {user.full_name}
              <span className={`role-badge role-${user.role.toLowerCase()}`} style={{ marginLeft: 8 }}>
                {user.role}
              </span>
            </span>
            {user.role === 'APPLICANT' && (
              <button className="btn btn-navbar btn-sm" onClick={() => navigate('/dashboard')}>
                My Applications
              </button>
            )}
            {user.role === 'REVIEWER' && (
              <button className="btn btn-navbar btn-sm" onClick={() => navigate('/reviewer')}>
                📋 Dashboard
              </button>
            )}
            {user.role === 'ADMIN' && (
              <button className="btn btn-navbar btn-sm" onClick={() => navigate('/admin/report')}>
                📊 Reports
              </button>
            )}
            <button className="btn btn-navbar btn-sm" onClick={handleLogout}>
              Sign Out
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

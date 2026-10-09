import React, { useState, useEffect } from 'react';
import { BusOwnerDashboard } from './components/BusOwnerDashboard.jsx';
import { AuthorityDashboard } from './components/AuthorityDashboard.jsx';

const API_BASE = 'http://localhost:4000/api';

export default function App() {
  // Current authenticated user: { id, email, name, role, ... } or null
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('transitlk_portal_session');
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed.user || null;
        }
      }
    } catch {
      // ignore
    }
    return null;
  });

  // Login form states
  const [loginRole, setLoginRole] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const role = params.get('role');
      if (role === 'bus_owner' || role === 'owner') return 'bus_owner';
      if (role === 'authority' || role === 'officer') return 'authority';
      if (role === 'admin') return 'admin';
      const hash = window.location.hash.replace('#', '');
      if (hash === 'bus-owner' || hash === 'owner') return 'bus_owner';
      if (hash === 'authority' || hash === 'officer') return 'authority';
    }
    return 'admin';
  });

  const [loginIdentifier, setLoginIdentifier] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginPending, setLoginPending] = useState('');

  // Switch login role tab
  const handleSelectRoleTab = (role) => {
    setLoginRole(role);
    setLoginError('');
    setLoginPending('');
    if (role === 'bus_owner') {
      setLoginIdentifier('owner@transitlk.com');
      setLoginPassword('password123');
    } else if (role === 'authority') {
      setLoginIdentifier('officer@transport.lk');
      setLoginPassword('password123');
    } else {
      setLoginIdentifier('admin');
      setLoginPassword('admin123');
    }
  };

  // Verify URL token on load (e.g. redirected from mobile app login)
  useEffect(() => {
    const verifyTokenParam = async () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');

      if (token) {
        try {
          const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then((r) => r.json());

          if (res && res.success && res.user) {
            localStorage.setItem(
              'transitlk_portal_session',
              JSON.stringify({ token, user: res.user })
            );
            setCurrentUser(res.user);
            // Clean token from address bar
            const roleParam = res.user.role ? `?role=${res.user.role}` : '';
            window.history.replaceState({}, document.title, window.location.pathname + roleParam);
          }
        } catch (err) {
          console.error('Failed to authenticate token:', err);
        }
      }
    };

    verifyTokenParam();
  }, []);

  // Admin Data states
  const [stats, setStats] = useState({
    totalPending: 0,
    pendingOfficers: 0,
    pendingOwners: 0,
    approvedOfficers: 0,
    approvedOwners: 0,
    totalPassengers: 0,
    totalUsers: 0,
  });
  const [pendingList, setPendingList] = useState([]);
  const [officersList, setOfficersList] = useState([]);
  const [ownersList, setOwnersList] = useState([]);
  const [allUsersList, setAllUsersList] = useState([]);
  const [pendingBusesList, setPendingBusesList] = useState([]);
  const [allBusesList, setAllBusesList] = useState([]);
  const [busViewMode, setBusViewMode] = useState('pending'); // 'pending' | 'all'
  const [busSearchQuery, setBusSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'bus_approvals' | 'officers' | 'owners' | 'all'

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  const getAuthHeaders = () => {
    try {
      const saved = localStorage.getItem('transitlk_portal_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.token) {
          return { Authorization: `Bearer ${parsed.token}` };
        }
      }
    } catch {}
    return {};
  };

  // Fetch all admin data (ONLY if authenticated as admin)
  const fetchAdminData = async () => {
    if (!currentUser || currentUser.role !== 'admin') return;
    setLoading(true);
    const authHeaders = getAuthHeaders();
    try {
      const statsRes = await fetch(`${API_BASE}/admin/stats`, { headers: authHeaders }).then((r) => r.json()).catch(() => null);
      if (statsRes && statsRes.stats) {
        setStats(statsRes.stats);
      }

      const pendingRes = await fetch(`${API_BASE}/admin/pending`, { headers: authHeaders }).then((r) => r.json()).catch(() => null);
      if (pendingRes && pendingRes.users) {
        setPendingList(pendingRes.users);
      }

      const officersRes = await fetch(`${API_BASE}/admin/users?role=authority`, { headers: authHeaders }).then((r) => r.json()).catch(() => null);
      if (officersRes && officersRes.users) {
        setOfficersList(officersRes.users);
      }

      const ownersRes = await fetch(`${API_BASE}/admin/users?role=bus_owner`, { headers: authHeaders }).then((r) => r.json()).catch(() => null);
      if (ownersRes && ownersRes.users) {
        setOwnersList(ownersRes.users);
      }

      const allRes = await fetch(`${API_BASE}/admin/users`, { headers: authHeaders }).then((r) => r.json()).catch(() => null);
      if (allRes && allRes.users) {
        setAllUsersList(allRes.users);
      }

      // Fetch pending bus schedule submissions awaiting approval
      const pendingBusesRes = await fetch(`${API_BASE}/admin/pending-buses`, { headers: authHeaders }).then((r) => r.json()).catch(() => null);
      if (pendingBusesRes && pendingBusesRes.buses) {
        setPendingBusesList(pendingBusesRes.buses);
      }

      // Fetch all fleet buses
      const allBusesRes = await fetch(`${API_BASE}/admin/buses`, { headers: authHeaders }).then((r) => r.json()).catch(() => null);
      if (allBusesRes && allBusesRes.buses) {
        setAllBusesList(allBusesRes.buses);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchAdminData();
      const interval = setInterval(fetchAdminData, 8000);
      return () => clearInterval(interval);
    }
  }, [currentUser?.role]);

  // Handle Login submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    setLoginPending('');

    try {
      if (loginRole === 'bus_owner') {
        const res = await fetch(`${API_BASE}/auth/owner-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ownerId: loginIdentifier, password: loginPassword }),
        }).then((r) => r.json());

        setLoginLoading(false);
        if (res.success && res.user) {
          const userObj = { ...res.user, role: 'bus_owner' };
          localStorage.setItem(
            'transitlk_portal_session',
            JSON.stringify({ token: res.token, user: userObj })
          );
          setCurrentUser(userObj);
          showToast(`Welcome back, ${res.user.name}!`);
        } else if (res.status === 'pending') {
          setLoginPending(res.message || 'Your bus fleet registration is pending administrator approval.');
        } else {
          setLoginError(res.message || 'Invalid bus owner credentials.');
        }
      } else if (loginRole === 'authority') {
        const res = await fetch(`${API_BASE}/auth/officer-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ officerId: loginIdentifier, password: loginPassword }),
        }).then((r) => r.json());

        setLoginLoading(false);
        if (res.success && res.user) {
          const userObj = { ...res.user, role: 'authority' };
          localStorage.setItem(
            'transitlk_portal_session',
            JSON.stringify({ token: res.token, user: userObj })
          );
          setCurrentUser(userObj);
          showToast(`Welcome on duty, Officer ${res.user.name}!`);
        } else if (res.status === 'pending') {
          setLoginPending(res.message || 'Your authority officer account is pending administrator approval.');
        } else {
          setLoginError(res.message || 'Invalid official credentials.');
        }
      } else {
        // Admin login
        const res = await fetch(`${API_BASE}/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: loginIdentifier, password: loginPassword }),
        }).then((r) => r.json());

        setLoginLoading(false);
        if (res.success && res.user) {
          const userObj = { ...res.user, role: 'admin' };
          localStorage.setItem(
            'transitlk_portal_session',
            JSON.stringify({ token: res.token || 'admin-session', user: userObj })
          );
          setCurrentUser(userObj);
          showToast('Logged in as Administrator successfully!');
        } else {
          setLoginError(res.message || 'Invalid administrator credentials');
        }
      }
    } catch (err) {
      setLoginLoading(false);
      setLoginError('Could not connect to backend server on http://localhost:4000');
    }
  };

  // Sign out handler
  const handleLogout = () => {
    localStorage.removeItem('transitlk_portal_session');
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  // Admin Approve a user
  const handleApprove = async (userId, userName, role) => {
    try {
      const res = await fetch(`${API_BASE}/admin/approve/${userId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      }).then((r) => r.json());

      if (res.success) {
        showToast(`Approved ${userName} (${role === 'authority' ? 'Authority Officer' : 'Bus Fleet Owner'}) successfully!`);
        fetchAdminData();
      } else {
        alert(res.message || 'Failed to approve user');
      }
    } catch {
      alert('Network error while approving user');
    }
  };

  // Admin Reject a user
  const handleReject = async (userId, userName) => {
    const reason = window.prompt(`Please provide a reason for rejecting ${userName}:`, 'Official credentials could not be verified');
    if (!reason) return;

    try {
      const res = await fetch(`${API_BASE}/admin/reject/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ reason }),
      }).then((r) => r.json());

      if (res.success) {
        showToast(`Application for ${userName} has been marked as rejected.`);
        fetchAdminData();
      } else {
        alert(res.message || 'Failed to reject user');
      }
    } catch {
      alert('Network error while rejecting user');
    }
  };

  // Admin Seed test pending users
  const handleSeedPending = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/seed-demo-pending`, {
        method: 'POST',
        headers: getAuthHeaders(),
      }).then((r) => r.json());

      if (res.success) {
        showToast('Seeded 2 sample pending applicants into MongoDB! Check the queue.');
        setActiveTab('pending');
        fetchAdminData();
      } else {
        alert(res.message || 'Could not seed pending users');
      }
    } catch {
      alert('Could not seed pending users');
    }
  };

  // Admin Approve Bus & Schedule Submission
  const handleApproveBus = async (busId, busRegNumber) => {
    try {
      const res = await fetch(`${API_BASE}/admin/buses/${busId}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
      }).then((r) => r.json());

      if (res.success) {
        showToast(`Bus ${busRegNumber} schedule approved! Published to active routes.`);
        fetchAdminData();
      } else {
        alert(res.message || 'Failed to approve bus schedule');
      }
    } catch {
      alert('Network error while approving bus schedule');
    }
  };

  // Admin Reject Bus Submission
  const handleRejectBus = async (busId, busRegNumber) => {
    const reason = window.prompt(
      `Please provide a reason for rejecting bus ${busRegNumber}:`,
      'Route timetable conflict or unverified operator schedule'
    );
    if (!reason) return;

    try {
      const res = await fetch(`${API_BASE}/admin/buses/${busId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ reason }),
      }).then((r) => r.json());

      if (res.success) {
        showToast(`Bus ${busRegNumber} schedule rejected with feedback sent to owner.`);
        fetchAdminData();
      } else {
        alert(res.message || 'Failed to reject bus submission');
      }
    } catch {
      alert('Network error while rejecting bus submission');
    }
  };

  // Admin Seed test pending bus schedule submission
  const handleSeedPendingBus = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/seed-demo-pending-bus`, {
        method: 'POST',
        headers: getAuthHeaders(),
      }).then((r) => r.json());

      if (res.success) {
        showToast(`Seeded sample bus submission ${res.bus?.busRegNumber || ''}! Check the queue.`);
        setActiveTab('bus_approvals');
        setBusViewMode('pending');
        fetchAdminData();
      } else {
        alert(res.message || 'Could not seed pending bus');
      }
    } catch {
      alert('Network error while seeding pending bus');
    }
  };

  // ========================================================
  // RENDER LOGIN SCREEN IF NOT AUTHENTICATED
  // ========================================================
  if (!currentUser) {
    return (
      <div className="admin-login-overlay">
        <div className="login-card">
          <div className="login-brand-logo">
            {loginRole === 'bus_owner' ? '🚌' : loginRole === 'authority' ? '🛡️' : '👑'}
          </div>
          <h2>
            {loginRole === 'bus_owner'
              ? 'Bus Owner Operations Portal'
              : loginRole === 'authority'
              ? 'Authority Officer Portal'
              : 'TransitLK Admin Portal'}
          </h2>
          <p>
            {loginRole === 'bus_owner'
              ? 'Sign in to access your registered fleet details, live routes, and daily revenue metrics.'
              : loginRole === 'authority'
              ? 'Sign in with your official ID for network corridor surveillance, inspections, and ticket validation.'
              : 'Sign in to review and approve registrations for Bus Owners and Authority Officers.'}
          </p>

          {/* Role Selector Tabs */}
          <div className="login-role-tabs">
            <button
              id="login-tab-bus-owner"
              type="button"
              className={`login-role-tab-btn ${loginRole === 'bus_owner' ? 'login-role-tab-active' : ''}`}
              onClick={() => handleSelectRoleTab('bus_owner')}
            >
              <span>🚌</span> Bus Owner
            </button>
            <button
              id="login-tab-authority"
              type="button"
              className={`login-role-tab-btn ${loginRole === 'authority' ? 'login-role-tab-active' : ''}`}
              onClick={() => handleSelectRoleTab('authority')}
            >
              <span>🛡️</span> Officer
            </button>
            <button
              id="login-tab-admin"
              type="button"
              className={`login-role-tab-btn ${loginRole === 'admin' ? 'login-role-tab-active' : ''}`}
              onClick={() => handleSelectRoleTab('admin')}
            >
              <span>👑</span> Admin
            </button>
          </div>

          {/* Error & Pending Banners */}
          {loginError && <div className="login-error-banner">⚠️ {loginError}</div>}
          {loginPending && (
            <div className="login-pending-banner">
              ⏳ <strong>Pending Approval:</strong> {loginPending}
            </div>
          )}

          <form className="login-form" onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label htmlFor="login-input-identifier">
                {loginRole === 'bus_owner'
                  ? 'Registered Fleet Email / Owner ID'
                  : loginRole === 'authority'
                  ? 'Official Email / Officer Badge ID'
                  : 'Administrator Username or Email'}
              </label>
              <input
                id="login-input-identifier"
                type="text"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder={
                  loginRole === 'bus_owner'
                    ? 'owner@transitlk.com'
                    : loginRole === 'authority'
                    ? 'officer@transport.lk'
                    : 'admin'
                }
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-input-password">Password</label>
              <input
                id="login-input-password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button id="login-btn-submit" type="submit" className="btn-primary-login" disabled={loginLoading}>
              {loginLoading
                ? 'Authenticating...'
                : loginRole === 'bus_owner'
                ? 'Sign In to Bus Owner Dashboard'
                : loginRole === 'authority'
                ? 'Sign In to Officer Portal'
                : 'Sign In to Admin Dashboard'}
            </button>
          </form>

          <div className="quick-credentials-hint">
            <strong>Evaluation Credentials:</strong>
            <br />
            {loginRole === 'bus_owner' ? (
              <span>
                Owner: <code>owner@transitlk.com</code> (pw: <code>password123</code>) or{' '}
                <code>paboda@transitlk.com</code> (pw: <code>paboda123</code>)
              </span>
            ) : loginRole === 'authority' ? (
              <span>
                Officer: <code>officer@transport.lk</code> (pw: <code>password123</code>) or{' '}
                <code>gamage@transport.gov.lk</code> (pw: <code>gamage123</code>)
              </span>
            ) : (
              <span>
                Username: <code>admin</code> | Password: <code>admin123</code>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // RENDER STRICT ROLE-ISOLATED DASHBOARDS
  // ========================================================

  // Filter items for Admin "All Users" tab
  const filteredAllUsers = allUsersList.filter((u) => {
    const matchesSearch =
      !searchQuery ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.officerId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.companyName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || (u.status || 'approved') === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="admin-app">
      {/* Role-Specific Header */}
      <header className="admin-header">
        <div className="brand-section">
          <div className="brand-logo-box">
            {currentUser.role === 'bus_owner' ? (
              <span style={{ fontSize: '1.4rem' }}>🚌</span>
            ) : currentUser.role === 'authority' ? (
              <span style={{ fontSize: '1.4rem' }}>🛡️</span>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 6v6"/>
                <path d="M15 6v6"/>
                <path d="M2 12h19.6"/>
                <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.6-.4-1-1-1H3c-.6 0-1 .4-1 1 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"/>
                <circle cx="7" cy="18" r="2"/>
                <circle cx="17" cy="18" r="2"/>
              </svg>
            )}
          </div>
          <div className="brand-text-col">
            <div className="brand-title">
              TransitLK
              <span className="portal-tag">
                {currentUser.role === 'bus_owner'
                  ? 'Bus Fleet Owner Portal'
                  : currentUser.role === 'authority'
                  ? 'Authority Officer Portal'
                  : 'Administrator Portal'}
              </span>
            </div>
            <div className="brand-sub">
              {currentUser.role === 'bus_owner'
                ? 'Fleet Operations, Route Scheduling & Real-time Revenue'
                : currentUser.role === 'authority'
                ? 'National Transport Commission Corridor Surveillance & Validator'
                : 'National Transport Commission & Fleet Web Operations'}
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="header-actions">
          <div className="live-badge">
            <span className="live-dot"></span>
            MongoDB Atlas Live
          </div>

          <div className="admin-profile-chip">
            <div className="admin-avatar">
              {currentUser.role === 'bus_owner' ? '🚌' : currentUser.role === 'authority' ? '👮' : '👑'}
            </div>
            <div className="admin-meta">
              <span className="admin-name">{currentUser.name || 'Verified User'}</span>
              <span className="admin-role">
                {currentUser.role === 'bus_owner'
                  ? currentUser.companyName || 'Verified Bus Fleet Owner'
                  : currentUser.role === 'authority'
                  ? currentUser.officerId ? `ID: ${currentUser.officerId}` : 'Authority Officer'
                  : 'System Administrator'}
              </span>
            </div>
          </div>

          <button id="btn-logout-portal" className="btn-logout" onClick={handleLogout} title="Sign Out of Portal">
            Sign Out
          </button>
        </div>
      </header>

      {/* ========================================================
          ISOLATED DASHBOARD BODY BASED STRICTLY ON USER ROLE
          ======================================================== */}

      {/* 1. BUS OWNER ONLY VIEW */}
      {currentUser.role === 'bus_owner' && (
        <BusOwnerDashboard currentUser={currentUser} onLogout={handleLogout} />
      )}

      {/* 2. AUTHORITY OFFICER ONLY VIEW */}
      {currentUser.role === 'authority' && (
        <AuthorityDashboard currentUser={currentUser} onLogout={handleLogout} />
      )}

      {/* 3. SYSTEM ADMINISTRATOR ONLY VIEW */}
      {currentUser.role === 'admin' && (
        <main className="dashboard-main">
          {/* Hero Title Bar */}
          <section className="hero-header">
            <div className="hero-title-group">
              <h1>Account Approvals & System Management</h1>
              <p>
                Review and approve registration requests for National Transport Authority Officers and Bus Fleet Operators.
              </p>
            </div>

            <div className="hero-action-buttons">
              <button className="btn-refresh" onClick={fetchAdminData} title="Refresh Live Data">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                  <path d="M16 21h5v-5"/>
                </svg>
                {loading ? 'Refreshing...' : 'Live Sync'}
              </button>
            </div>
          </section>

          {/* Metrics Grid */}
          <section className="metrics-grid">
            {/* Card 1: Pending Approvals */}
            <div className={`metric-card ${stats.totalPending > 0 ? 'alert-card' : ''}`}>
              <div className="metric-top">
                <div className="metric-icon-wrap">⏳</div>
                <span className="metric-badge badge-amber">
                  {stats.totalPending > 0 ? 'Action Required' : 'Up to Date'}
                </span>
              </div>
              <div className="metric-value">{stats.totalPending}</div>
              <div className="metric-label">Pending Approval Requests</div>
            </div>

            {/* Card 2: Authority Officers */}
            <div className="metric-card officers-card">
              <div className="metric-top">
                <div className="metric-icon-wrap">👮</div>
                <span className="metric-badge badge-blue">
                  {stats.pendingOfficers > 0 ? `${stats.pendingOfficers} Pending` : 'Verified'}
                </span>
              </div>
              <div className="metric-value">{stats.approvedOfficers}</div>
              <div className="metric-label">Approved Authority Officers</div>
            </div>

            {/* Card 3: Bus Fleet Owners */}
            <div className="metric-card owners-card">
              <div className="metric-top">
                <div className="metric-icon-wrap">🚌</div>
                <span className="metric-badge badge-teal">
                  {stats.pendingOwners > 0 ? `${stats.pendingOwners} Pending` : 'Verified'}
                </span>
              </div>
              <div className="metric-value">{stats.approvedOwners}</div>
              <div className="metric-label">Approved Bus Fleet Owners</div>
            </div>

            {/* Card 4: Total Passengers */}
            <div className="metric-card passengers-card">
              <div className="metric-top">
                <div className="metric-icon-wrap">👥</div>
                <span className="metric-badge badge-slate">Active</span>
              </div>
              <div className="metric-value">{stats.totalPassengers}</div>
              <div className="metric-label">Registered Passenger Users</div>
            </div>

            {/* Card 5: Bus Fleet & Timetables Approvals */}
            <div
              className={`metric-card ${pendingBusesList.length > 0 ? 'alert-card' : 'owners-card'}`}
              onClick={() => setActiveTab('bus_approvals')}
              style={{ cursor: 'pointer' }}
              title="Click to view Bus Schedule Approvals"
            >
              <div className="metric-top">
                <div className="metric-icon-wrap">📋</div>
                <span className={`metric-badge ${pendingBusesList.length > 0 ? 'badge-amber' : 'badge-teal'}`}>
                  {pendingBusesList.length > 0 ? `${pendingBusesList.length} Action Required` : 'Up to Date'}
                </span>
              </div>
              <div className="metric-value">{pendingBusesList.length}</div>
              <div className="metric-label">Pending Bus Submissions</div>
            </div>
          </section>

          {/* Evaluation Assistant Widget */}
          <section className="demo-assistant-box">
            <div className="demo-assistant-info">
              <span className="demo-bulb">💡</span>
              <div>
                <h4>Evaluation & Demonstration Helper</h4>
                <p>
                  Generate sample pending user accounts or commercial bus schedule submissions to test the live approval workflow.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn-seed" onClick={handleSeedPending} title="Seed 2 pending user accounts">
                <span>+</span> Seed 2 Demo Applicants
              </button>
              <button
                className="btn-seed"
                onClick={handleSeedPendingBus}
                style={{ background: '#007A74', color: 'white' }}
                title="Seed a sample bus schedule awaiting approval"
              >
                <span>+</span> Seed Pending Bus Submission
              </button>
            </div>
          </section>

          {/* Navigation Tabs */}
          <nav className="tab-navigation">
            <button
              className={`tab-btn ${activeTab === 'pending' ? 'tab-btn-active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              <span>⏳ Account Approvals</span>
              {stats.totalPending > 0 && <span className="tab-count-badge badge-amber">{stats.totalPending}</span>}
            </button>

            <button
              className={`tab-btn ${activeTab === 'bus_approvals' ? 'tab-btn-active' : ''}`}
              onClick={() => setActiveTab('bus_approvals')}
            >
              <span>📋 Bus Schedule Approvals</span>
              {pendingBusesList.length > 0 && (
                <span className="tab-count-badge badge-amber">{pendingBusesList.length}</span>
              )}
            </button>

            <button
              className={`tab-btn ${activeTab === 'officers' ? 'tab-btn-active' : ''}`}
              onClick={() => setActiveTab('officers')}
            >
              <span>👮 Authority Officers</span>
              <span className="tab-count-badge">{stats.approvedOfficers}</span>
            </button>

            <button
              className={`tab-btn ${activeTab === 'owners' ? 'tab-btn-active' : ''}`}
              onClick={() => setActiveTab('owners')}
            >
              <span>🚌 Bus Fleet Owners</span>
              <span className="tab-count-badge">{stats.approvedOwners}</span>
            </button>

            <button
              className={`tab-btn ${activeTab === 'all' ? 'tab-btn-active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <span>👥 All Platform Users</span>
              <span className="tab-count-badge">{allUsersList.length}</span>
            </button>
          </nav>

          {/* Tab 1: Pending Approvals Queue */}
          {activeTab === 'pending' && (
            <section className="tab-content-panel">
              <div className="panel-header">
                <h3>Pending Approval Queue ({pendingList.length})</h3>
                <span className="panel-sub">
                  Review submitted government badges or bus operator fleets before granting platform credentials.
                </span>
              </div>

              {pendingList.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🎉</div>
                  <h3>Queue is All Clear!</h3>
                  <p>There are no pending account registrations awaiting verification at this time.</p>
                  <button className="btn-secondary" onClick={handleSeedPending}>
                    Generate Test Applicants
                  </button>
                </div>
              ) : (
                <div className="pending-cards-grid">
                  {pendingList.map((user) => (
                    <div key={user._id} className="pending-card">
                      <div className="pending-card-left">
                        <div className={`role-avatar-circle ${user.role}`}>
                          {user.role === 'authority' ? '👮' : '🚌'}
                        </div>
                        <div className="pending-details-col">
                          <div className="pending-badge-row">
                            <span className={`role-pill ${user.role}`}>
                              {user.role === 'authority' ? 'Authority Officer' : 'Bus Fleet Owner'}
                            </span>
                            <span className="time-pill">
                              {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                            </span>
                          </div>

                          <h3 className="applicant-name">{user.name}</h3>
                          <div className="applicant-email">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect width="20" height="16" x="2" y="4" rx="2"/>
                              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                            </svg>
                            {user.email}
                          </div>

                          {user.role === 'authority' && (
                            <div className="officer-credentials-box">
                              <div className="cred-item">
                                <span className="cred-label">Badge ID:</span>
                                <span className="cred-value">{user.officerId || 'NTC-WP-4921'}</span>
                              </div>
                              <div className="cred-item">
                                <span className="cred-label">Department:</span>
                                <span className="cred-value">{user.department || 'National Transport Commission'}</span>
                              </div>
                              {user.phone && (
                                <div className="cred-item">
                                  <span className="cred-label">Phone:</span>
                                  <span className="cred-value">{user.phone}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {user.role === 'bus_owner' && (
                            <div className="owner-credentials-box">
                              <div className="cred-item">
                                <span className="cred-label">Fleet / Company:</span>
                                <span className="cred-value">{user.companyName || 'Private Fleet Operator'}</span>
                              </div>
                              {user.busRegNumbers && (
                                <div className="cred-item">
                                  <span className="cred-label">Bus Reg Numbers:</span>
                                  <span className="cred-value reg-nums">{user.busRegNumbers}</span>
                                </div>
                              )}
                              {user.phone && (
                                <div className="cred-item">
                                  <span className="cred-label">Contact:</span>
                                  <span className="cred-value">{user.phone}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pending-card-actions">
                        <button
                          className="btn-approve"
                          onClick={() => handleApprove(user._id, user.name, user.role)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Approve Account
                        </button>
                        <button
                          className="btn-reject"
                          onClick={() => handleReject(user._id, user.name)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Tab: Bus Fleet & Timetables Approvals */}
          {activeTab === 'bus_approvals' && (
            <section className="tab-content-panel">
              <div className="panel-header">
                <div>
                  <h3>Bus Schedule Approval Queue ({pendingBusesList.length} Pending)</h3>
                  <span className="panel-sub">
                    Review and approve bus numbers, timetables, starting and ending points, and journey durations submitted by operators before publishing to passenger searches.
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    className={`btn-secondary ${busViewMode === 'pending' ? 'btn-primary' : ''}`}
                    onClick={() => setBusViewMode('pending')}
                    style={{
                      padding: '7px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: busViewMode === 'pending' ? '#007A74' : '#FFFFFF',
                      color: busViewMode === 'pending' ? '#FFFFFF' : '#0F253B',
                      borderColor: '#CBD5E1',
                    }}
                  >
                    Pending Review ({pendingBusesList.length})
                  </button>
                  <button
                    className={`btn-secondary ${busViewMode === 'all' ? 'btn-primary' : ''}`}
                    onClick={() => setBusViewMode('all')}
                    style={{
                      padding: '7px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: busViewMode === 'all' ? '#007A74' : '#FFFFFF',
                      color: busViewMode === 'all' ? '#FFFFFF' : '#0F253B',
                      borderColor: '#CBD5E1',
                    }}
                  >
                    All Fleet Buses ({allBusesList.length})
                  </button>
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="filters-toolbar" style={{ marginTop: '12px' }}>
                <div className="search-input-wrap">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Filter by bus plate, route number, town, or operator..."
                    value={busSearchQuery}
                    onChange={(e) => setBusSearchQuery(e.target.value)}
                  />
                </div>

                <button
                  className="btn-secondary"
                  onClick={handleSeedPendingBus}
                  style={{ fontSize: '12px', fontWeight: 700, padding: '7px 12px' }}
                >
                  <span>+</span> Seed Test Bus Submission
                </button>
              </div>

              {/* PENDING VIEW */}
              {busViewMode === 'pending' && (
                <>
                  {pendingBusesList.filter((b) => {
                    if (!busSearchQuery) return true;
                    const q = busSearchQuery.toLowerCase();
                    return (
                      b.busRegNumber?.toLowerCase().includes(q) ||
                      b.routeNumber?.toLowerCase().includes(q) ||
                      b.routeName?.toLowerCase().includes(q) ||
                      b.ownerName?.toLowerCase().includes(q) ||
                      b.companyName?.toLowerCase().includes(q) ||
                      b.startPoint?.toLowerCase().includes(q) ||
                      b.endPoint?.toLowerCase().includes(q)
                    );
                  }).length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">🎉</div>
                      <h3>All Bus Submissions Approved!</h3>
                      <p>
                        There are currently no pending bus registration requests or timetable edits awaiting administrator review.
                      </p>
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '12px' }}>
                        <button className="btn-secondary" onClick={handleSeedPendingBus}>
                          + Seed Demo Bus Submission
                        </button>
                        <button className="btn-secondary" onClick={() => setBusViewMode('all')}>
                          View All Fleet Buses ({allBusesList.length})
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pending-cards-grid">
                      {pendingBusesList
                        .filter((b) => {
                          if (!busSearchQuery) return true;
                          const q = busSearchQuery.toLowerCase();
                          return (
                            b.busRegNumber?.toLowerCase().includes(q) ||
                            b.routeNumber?.toLowerCase().includes(q) ||
                            b.routeName?.toLowerCase().includes(q) ||
                            b.ownerName?.toLowerCase().includes(q) ||
                            b.companyName?.toLowerCase().includes(q) ||
                            b.startPoint?.toLowerCase().includes(q) ||
                            b.endPoint?.toLowerCase().includes(q)
                          );
                        })
                        .map((bus) => (
                          <div key={bus._id} className="pending-card" style={{ borderColor: '#FDE68A' }}>
                            <div className="pending-card-left">
                              <div className="role-avatar-circle bus_owner" style={{ fontSize: '1.6rem' }}>
                                🚌
                              </div>
                              <div className="pending-details-col" style={{ flex: 1 }}>
                                <div className="pending-badge-row">
                                  <span className="role-pill bus_owner" style={{ fontWeight: 800 }}>
                                    Route {bus.routeNumber}
                                  </span>
                                  <span
                                    className="status-pill pending"
                                    style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: 800 }}
                                  >
                                    ⏳ Pending Approval
                                  </span>
                                  {bus.submissionType === 'update' ? (
                                    <span
                                      className="time-pill"
                                      style={{ background: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}
                                    >
                                      Timetable Update
                                    </span>
                                  ) : (
                                    <span
                                      className="time-pill"
                                      style={{ background: '#D1FAE5', color: '#065F46', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}
                                    >
                                      New Registration
                                    </span>
                                  )}
                                  <span className="time-pill">
                                    Submitted: {new Date(bus.submittedAt || bus.createdAt || Date.now()).toLocaleDateString()}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                                  <h3 className="applicant-name" style={{ fontSize: '1.25rem', color: '#12304A', fontWeight: 800 }}>
                                    {bus.busRegNumber}
                                  </h3>
                                  <span style={{ fontSize: '12px', background: '#F1F5F9', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, color: '#475569' }}>
                                    {bus.busType || 'Semi-Luxury'} • {bus.totalSeats || 50} Seats
                                  </span>
                                </div>

                                {/* Route Start and End Points */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#0F253B', marginTop: '6px' }}>
                                  <span style={{ color: '#008783' }}>📍 {bus.startPoint || 'Origin Terminal'}</span>
                                  <span style={{ color: '#94A3B8' }}>➔</span>
                                  <span style={{ color: '#008783' }}>🏁 {bus.endPoint || 'Destination Terminal'}</span>
                                  <span style={{ color: '#64748B', fontWeight: 500, fontSize: '12px' }}>
                                    ({bus.routeName || `Route ${bus.routeNumber}`})
                                  </span>
                                </div>

                                {/* Schedule Timings & Journey Duration Grid */}
                                <div
                                  className="owner-credentials-box"
                                  style={{
                                    marginTop: '8px',
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                                    gap: '8px',
                                    background: '#F8FAFC',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                  }}
                                >
                                  <div className="cred-item">
                                    <span className="cred-label" style={{ fontSize: '11px', color: '#64748B' }}>Departure:</span>
                                    <span className="cred-value" style={{ fontWeight: 800, color: '#008783', fontSize: '13px' }}>
                                      🕒 {bus.departureTime || '07:00 AM'}
                                    </span>
                                  </div>
                                  <div className="cred-item">
                                    <span className="cred-label" style={{ fontSize: '11px', color: '#64748B' }}>Arrival:</span>
                                    <span className="cred-value" style={{ fontWeight: 800, color: '#008783', fontSize: '13px' }}>
                                      🕒 {bus.arrivalTime || '08:30 AM'}
                                    </span>
                                  </div>
                                  <div className="cred-item">
                                    <span className="cred-label" style={{ fontSize: '11px', color: '#64748B' }}>Duration:</span>
                                    <span className="cred-value" style={{ fontWeight: 800, color: '#1E3A8A', fontSize: '13px' }}>
                                      ⏱️ {bus.journeyDuration || '1 hr 30 mins'}
                                    </span>
                                  </div>
                                  <div className="cred-item">
                                    <span className="cred-label" style={{ fontSize: '11px', color: '#64748B' }}>Base Fare:</span>
                                    <span className="cred-value" style={{ fontWeight: 800, fontSize: '13px' }}>
                                      Rs. {bus.baseFare || 220}
                                    </span>
                                  </div>
                                </div>

                                {/* Operator Information */}
                                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                                  <span>👤 Operator: <strong>{bus.ownerName || 'Verified Bus Fleet Owner'}</strong></span>
                                  {bus.companyName && <span>🏢 Company: <strong>{bus.companyName}</strong></span>}
                                  {bus.phone && <span>📞 {bus.phone}</span>}
                                </div>
                              </div>
                            </div>

                            <div className="pending-card-actions">
                              <button
                                className="btn-approve"
                                onClick={() => handleApproveBus(bus._id, bus.busRegNumber)}
                                title="Approve this bus and publish timetable to public search"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                                Approve Bus & Schedule
                              </button>
                              <button
                                className="btn-reject"
                                onClick={() => handleRejectBus(bus._id, bus.busRegNumber)}
                                title="Reject with feedback"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <line x1="18" y1="6" x2="6" y2="18"/>
                                  <line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </>
              )}

              {/* ALL FLEET BUSES VIEW */}
              {busViewMode === 'all' && (
                <div className="verified-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Bus Plate</th>
                        <th>Route</th>
                        <th>Origin ➔ Destination</th>
                        <th>Schedule Timings</th>
                        <th>Duration</th>
                        <th>Type / Seats</th>
                        <th>Operator / Fleet</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allBusesList
                        .filter((b) => {
                          if (!busSearchQuery) return true;
                          const q = busSearchQuery.toLowerCase();
                          return (
                            b.busRegNumber?.toLowerCase().includes(q) ||
                            b.routeNumber?.toLowerCase().includes(q) ||
                            b.routeName?.toLowerCase().includes(q) ||
                            b.ownerName?.toLowerCase().includes(q) ||
                            b.companyName?.toLowerCase().includes(q) ||
                            b.startPoint?.toLowerCase().includes(q) ||
                            b.endPoint?.toLowerCase().includes(q)
                          );
                        })
                        .map((b) => (
                          <tr key={b._id}>
                            <td>
                              <strong style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                                {b.busRegNumber}
                              </strong>
                            </td>
                            <td>
                              <span className="role-pill bus_owner" style={{ fontWeight: 800 }}>
                                {b.routeNumber}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontSize: '12px', fontWeight: 600 }}>
                                {b.startPoint || 'Origin'} ➔ {b.endPoint || 'Destination'}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748B' }}>{b.routeName}</div>
                            </td>
                            <td>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#007A74' }}>
                                {b.departureTime || '—'} ➔ {b.arrivalTime || '—'}
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#1E3A8A' }}>
                                {b.journeyDuration || '—'}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: '12px' }}>{b.busType || 'Normal'}</span>
                              <div style={{ fontSize: '11px', color: '#64748B' }}>{b.totalSeats || 50} seats</div>
                            </td>
                            <td>
                              <div style={{ fontSize: '12px', fontWeight: 600 }}>{b.ownerName || '—'}</div>
                              <div style={{ fontSize: '11px', color: '#64748B' }}>{b.companyName || '—'}</div>
                            </td>
                            <td>
                              <span className={`status-pill ${b.status || 'approved'}`}>
                                {b.status === 'pending'
                                  ? '⏳ Pending'
                                  : b.status === 'rejected'
                                  ? '✕ Rejected'
                                  : '✓ Approved'}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                {b.status !== 'approved' && (
                                  <button
                                    className="btn-approve"
                                    style={{ padding: '4px 8px', fontSize: '11px' }}
                                    onClick={() => handleApproveBus(b._id, b.busRegNumber)}
                                    title="Approve Bus"
                                  >
                                    ✓ Approve
                                  </button>
                                )}
                                {b.status !== 'rejected' && (
                                  <button
                                    className="btn-reject"
                                    style={{ padding: '4px 8px', fontSize: '11px' }}
                                    onClick={() => handleRejectBus(b._id, b.busRegNumber)}
                                    title="Reject Bus"
                                  >
                                    ✕ Reject
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* Tab 2: Verified Officers */}
          {activeTab === 'officers' && (
            <section className="tab-content-panel">
              <div className="panel-header">
                <h3>Verified Authority Officers ({officersList.length})</h3>
                <span className="panel-sub">
                  Active transport commission officers authorized to conduct inspections and ticket validation.
                </span>
              </div>

              <div className="verified-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Officer Name</th>
                      <th>Badge / ID</th>
                      <th>Official Email</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {officersList.map((off) => (
                      <tr key={off._id}>
                        <td>
                          <div className="table-user-cell">
                            <span className="table-avatar blue-avatar">👮</span>
                            <span className="table-user-name">{off.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className="table-badge-id">{off.officerId || 'NTC-VERIFIED'}</span>
                        </td>
                        <td>{off.email}</td>
                        <td>{off.department || 'National Transport Commission'}</td>
                        <td>
                          <span className={`status-pill ${off.status || 'approved'}`}>
                            {off.status || 'approved'}
                          </span>
                        </td>
                        <td>{new Date(off.createdAt || Date.now()).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Tab 3: Verified Bus Owners */}
          {activeTab === 'owners' && (
            <section className="tab-content-panel">
              <div className="panel-header">
                <h3>Approved Bus Fleet Owners ({ownersList.length})</h3>
                <span className="panel-sub">
                  Verified transport operators with active commercial fleet permits on TransitLK.
                </span>
              </div>

              <div className="verified-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Owner / Managing Director</th>
                      <th>Company / Fleet Name</th>
                      <th>Contact Email</th>
                      <th>Registered Buses</th>
                      <th>Phone</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownersList.map((own) => (
                      <tr key={own._id}>
                        <td>
                          <div className="table-user-cell">
                            <span className="table-avatar teal-avatar">🚌</span>
                            <span className="table-user-name">{own.name}</span>
                          </div>
                        </td>
                        <td>
                          <strong>{own.companyName || 'Private Operator'}</strong>
                        </td>
                        <td>{own.email}</td>
                        <td>
                          <span className="bus-plate-tag">{own.busRegNumbers || 'ND-3204, ND-4521'}</span>
                        </td>
                        <td>{own.phone || '0771234567'}</td>
                        <td>
                          <span className={`status-pill ${own.status || 'approved'}`}>
                            {own.status || 'approved'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Tab 4: All Platform Users */}
          {activeTab === 'all' && (
            <div className="tab-content-panel">
              <div className="panel-header">
                <h3>All Platform Users ({allUsersList.length})</h3>
                <span className="panel-sub">
                  Directory of all registered accounts including passengers, operators, and commission officials.
                </span>
              </div>

              {/* Filters Toolbar */}
              <div className="filters-toolbar">
                <div className="search-input-wrap">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by name, email, badge, or fleet..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="filter-selects">
                  <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                    <option value="all">All Roles</option>
                    <option value="passenger">Passengers</option>
                    <option value="bus_owner">Bus Fleet Owners</option>
                    <option value="authority">Authority Officers</option>
                    <option value="admin">Administrators</option>
                  </select>

                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="all">All Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="verified-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Identifier / Details</th>
                      <th>Status</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAllUsers.map((u) => (
                      <tr key={u._id}>
                        <td>
                          <div className="table-user-cell">
                            <span className="table-avatar">
                              {u.role === 'admin'
                                ? '👑'
                                : u.role === 'authority'
                                ? '👮'
                                : u.role === 'bus_owner'
                                ? '🚌'
                                : '👤'}
                            </span>
                            <span className="table-user-name">{u.name}</span>
                          </div>
                        </td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`role-pill ${u.role}`}>{u.role}</span>
                        </td>
                        <td>
                          {u.officerId && <span>Badge: {u.officerId}</span>}
                          {u.companyName && <span>{u.companyName}</span>}
                          {!u.officerId && !u.companyName && <span className="text-muted">—</span>}
                        </td>
                        <td>
                          <span className={`status-pill ${u.status || 'approved'}`}>
                            {u.status || 'approved'}
                          </span>
                        </td>
                        <td>{new Date(u.createdAt || Date.now()).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      )}

      {/* Floating Action Toast */}
      {toastMessage && (
        <div className="toast-banner">
          <span>✓</span>
          {toastMessage}
        </div>
      )}
    </div>
  );
}

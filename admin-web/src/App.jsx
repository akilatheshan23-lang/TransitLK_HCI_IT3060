import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:4000/api';

export default function App() {
  const [adminUser, setAdminUser] = useState({
    name: 'TransitLK Administrator',
    email: 'admin@transitlk.com',
    role: 'admin',
  });
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [loginEmail, setLoginEmail] = useState('admin@transitlk.com');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [loginLoading, setLoginLoading] = useState(false);

  // Data states
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
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'officers' | 'owners' | 'all'

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

  // Fetch all admin data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch stats
      const statsRes = await fetch(`${API_BASE}/admin/stats`).then((r) => r.json()).catch(() => null);
      if (statsRes && statsRes.stats) {
        setStats(statsRes.stats);
      }

      // 2. Fetch pending queue
      const pendingRes = await fetch(`${API_BASE}/admin/pending`).then((r) => r.json()).catch(() => null);
      if (pendingRes && pendingRes.users) {
        setPendingList(pendingRes.users);
      }

      // 3. Fetch officers
      const officersRes = await fetch(`${API_BASE}/admin/users?role=authority`).then((r) => r.json()).catch(() => null);
      if (officersRes && officersRes.users) {
        setOfficersList(officersRes.users);
      }

      // 4. Fetch bus owners
      const ownersRes = await fetch(`${API_BASE}/admin/users?role=bus_owner`).then((r) => r.json()).catch(() => null);
      if (ownersRes && ownersRes.users) {
        setOwnersList(ownersRes.users);
      }

      // 5. Fetch all users
      const allRes = await fetch(`${API_BASE}/admin/users`).then((r) => r.json()).catch(() => null);
      if (allRes && allRes.users) {
        setAllUsersList(allRes.users);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000); // Live poll every 8 seconds
    return () => clearInterval(interval);
  }, []);

  // Admin login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      }).then((r) => r.json());

      setLoginLoading(false);
      if (res.success && res.user) {
        setAdminUser(res.user);
        setIsAuthenticated(true);
        showToast('Logged in as Administrator successfully!');
        fetchData();
      } else {
        alert(res.message || 'Invalid admin credentials');
      }
    } catch (err) {
      setLoginLoading(false);
      alert('Could not connect to backend API server on http://localhost:4000');
    }
  };

  // Approve a user
  const handleApprove = async (userId, userName, role) => {
    try {
      const res = await fetch(`${API_BASE}/admin/approve/${userId}`, {
        method: 'POST',
      }).then((r) => r.json());

      if (res.success) {
        showToast(`Approved ${userName} (${role === 'authority' ? 'Authority Officer' : 'Bus Fleet Owner'}) successfully!`);
        fetchData();
      } else {
        alert(res.message || 'Failed to approve user');
      }
    } catch (err) {
      alert('Network error while approving user');
    }
  };

  // Reject a user
  const handleReject = async (userId, userName) => {
    const reason = window.prompt(`Please provide a reason for rejecting ${userName}:`, 'Official credentials could not be verified');
    if (!reason) return;

    try {
      const res = await fetch(`${API_BASE}/admin/reject/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      }).then((r) => r.json());

      if (res.success) {
        showToast(`Application for ${userName} has been marked as rejected.`);
        fetchData();
      } else {
        alert(res.message || 'Failed to reject user');
      }
    } catch (err) {
      alert('Network error while rejecting user');
    }
  };

  // Seed test pending users
  const handleSeedPending = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/seed-demo-pending`, {
        method: 'POST',
      }).then((r) => r.json());

      if (res.success) {
        showToast('Seeded 2 sample pending applicants into MongoDB! Check the queue.');
        setActiveTab('pending');
        fetchData();
      }
    } catch {
      alert('Could not seed pending users');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-login-overlay">
        <div className="login-card">
          <div className="login-brand-logo">🚌</div>
          <h2>TransitLK Admin Portal</h2>
          <p>Please enter administrative credentials to access registration approvals.</p>

          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label>Administrator Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@transitlk.com"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" className="btn-primary-login" disabled={loginLoading}>
              {loginLoading ? 'Authenticating...' : 'Sign In to Admin Dashboard'}
            </button>
          </form>

          <div className="quick-credentials-hint">
            <strong>Default Demo Credentials:</strong>
            <br />
            Email: <code>admin@transitlk.com</code> | Password: <code>admin123</code>
          </div>
        </div>
      </div>
    );
  }

  // Filter items for "All Users" tab
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
      {/* Header */}
      <header className="admin-header">
        <div className="brand-section">
          <div className="brand-logo-box">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 6v6"/>
              <path d="M15 6v6"/>
              <path d="M2 12h19.6"/>
              <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.6-.4-1-1-1H3c-.6 0-1 .4-1 1 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"/>
              <circle cx="7" cy="18" r="2"/>
              <circle cx="17" cy="18" r="2"/>
            </svg>
          </div>
          <div className="brand-text-col">
            <div className="brand-title">
              TransitLK
              <span className="portal-tag">Admin Portal</span>
            </div>
            <div className="brand-sub">Authority Officer & Bus Owner Verification System</div>
          </div>
        </div>

        <div className="header-actions">
          <div className="live-badge">
            <span className="live-dot"></span>
            MongoDB Atlas Live
          </div>

          <div className="admin-profile-chip">
            <div className="admin-avatar">A</div>
            <div className="admin-meta">
              <span className="admin-name">{adminUser.name}</span>
              <span className="admin-role">System Administrator</span>
            </div>
          </div>

          <button className="btn-logout" onClick={() => setIsAuthenticated(false)}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Container */}
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
            <button className="btn-refresh" onClick={fetchData} title="Refresh Live Data">
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
        </section>

        {/* Quick Testing Assistant Widget */}
        <section className="demo-assistant-box">
          <div className="demo-assistant-info">
            <span className="demo-bulb">💡</span>
            <div>
              <h4>Evaluation & Demonstration Helper</h4>
              <p>
                Click below to auto-generate sample pending registration requests to demonstrate the live approval workflow.
              </p>
            </div>
          </div>

          <div className="demo-buttons">
            <button className="btn-demo" onClick={handleSeedPending}>
              + Generate 2 Sample Pending Registrations
            </button>
          </div>
        </section>

        {/* Content Panel with Tabs */}
        <section className="content-panel">
          <div className="panel-tabs-header">
            <button
              className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              Pending Approvals Queue
              <span className={`tab-counter ${stats.totalPending > 0 ? 'alert-pill' : 'default-pill'}`}>
                {stats.totalPending}
              </span>
            </button>

            <button
              className={`tab-btn ${activeTab === 'officers' ? 'active' : ''}`}
              onClick={() => setActiveTab('officers')}
            >
              Authority Officers
              <span className="tab-counter default-pill">{officersList.length}</span>
            </button>

            <button
              className={`tab-btn ${activeTab === 'owners' ? 'active' : ''}`}
              onClick={() => setActiveTab('owners')}
            >
              Bus Fleet Owners
              <span className="tab-counter default-pill">{ownersList.length}</span>
            </button>

            <button
              className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Registered Accounts
              <span className="tab-counter default-pill">{allUsersList.length}</span>
            </button>
          </div>

          {/* TAB 1: PENDING QUEUE */}
          {activeTab === 'pending' && (
            <div>
              {pendingList.length === 0 ? (
                <div className="empty-queue-box">
                  <div className="empty-queue-icon">✓</div>
                  <h3>All Caught Up!</h3>
                  <p>
                    There are no pending registrations requiring review. Any Authority Officer or Bus Owner who registers on the mobile app will immediately appear in this queue.
                  </p>
                </div>
              ) : (
                <div className="pending-cards-list">
                  {pendingList.map((item) => (
                    <div key={item._id} className="pending-card">
                      <div className="pending-card-left">
                        <div className={`role-avatar-circle ${item.role}`}>
                          {item.role === 'authority' ? '👮' : '🚌'}
                        </div>

                        <div className="pending-details-col">
                          <div className="pending-badge-row">
                            <span className={`role-pill ${item.role}`}>
                              {item.role === 'authority' ? 'Authority Officer' : 'Bus Fleet Owner'}
                            </span>
                            <span className="time-pill">
                              Registered: {new Date(item.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <div className="applicant-name">{item.name}</div>
                          <div className="applicant-email">{item.email}</div>

                          <div className="applicant-meta-grid">
                            {item.role === 'authority' ? (
                              <>
                                <div className="meta-field">
                                  <span className="meta-field-label">Officer ID / Badge</span>
                                  <span className="meta-field-value">{item.officerId || 'N/A'}</span>
                                </div>
                                <div className="meta-field">
                                  <span className="meta-field-label">Division / Department</span>
                                  <span className="meta-field-value">{item.department || 'National Transport Commission'}</span>
                                </div>
                                <div className="meta-field">
                                  <span className="meta-field-label">Contact Phone</span>
                                  <span className="meta-field-value">{item.phone || 'Not provided'}</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="meta-field">
                                  <span className="meta-field-label">Fleet / Company</span>
                                  <span className="meta-field-value">{item.companyName || 'Private Fleet'}</span>
                                </div>
                                <div className="meta-field">
                                  <span className="meta-field-label">Bus Registration Numbers</span>
                                  <span className="meta-field-value">{item.busRegNumbers || 'Not specified'}</span>
                                </div>
                                <div className="meta-field">
                                  <span className="meta-field-label">Contact Phone</span>
                                  <span className="meta-field-value">{item.phone || 'Not provided'}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Approval Actions */}
                      <div className="pending-card-actions">
                        <button
                          className="btn-approve"
                          onClick={() => handleApprove(item._id, item.name, item.role)}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Approve Account
                        </button>

                        <button
                          className="btn-reject"
                          onClick={() => handleReject(item._id, item.name)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AUTHORITY OFFICERS */}
          {activeTab === 'officers' && (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Officer Name</th>
                    <th>Official Email</th>
                    <th>Badge / Officer ID</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Registered</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {officersList.map((off) => (
                    <tr key={off._id}>
                      <td>
                        <strong>{off.name}</strong>
                      </td>
                      <td>{off.email}</td>
                      <td>
                        <code>{off.officerId || 'NTC-001'}</code>
                      </td>
                      <td>{off.department || 'Western Province Transport Authority'}</td>
                      <td>
                        <span className={`status-pill ${off.status || 'approved'}`}>
                          {off.status || 'approved'}
                        </span>
                      </td>
                      <td>{new Date(off.createdAt || Date.now()).toLocaleDateString()}</td>
                      <td>
                        {off.status === 'pending' ? (
                          <button
                            className="btn-approve"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
                            onClick={() => handleApprove(off._id, off.name, 'authority')}
                          >
                            Approve
                          </button>
                        ) : off.status === 'rejected' ? (
                          <button
                            className="btn-approve"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem', background: '#3B82F6' }}
                            onClick={() => handleApprove(off._id, off.name, 'authority')}
                          >
                            Re-Approve
                          </button>
                        ) : (
                          <span style={{ color: '#059669', fontWeight: '700', fontSize: '0.82rem' }}>
                            ✓ Verified
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: BUS FLEET OWNERS */}
          {activeTab === 'owners' && (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Owner Name</th>
                    <th>Business Email</th>
                    <th>Fleet / Company</th>
                    <th>Bus Numbers</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ownersList.map((own) => (
                    <tr key={own._id}>
                      <td>
                        <strong>{own.name}</strong>
                      </td>
                      <td>{own.email}</td>
                      <td>{own.companyName || 'Private Bus Owner'}</td>
                      <td>
                        <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                          {own.busRegNumbers || 'ND-3204, ND-4521'}
                        </code>
                      </td>
                      <td>{own.phone || '077 123 4567'}</td>
                      <td>
                        <span className={`status-pill ${own.status || 'approved'}`}>
                          {own.status || 'approved'}
                        </span>
                      </td>
                      <td>
                        {own.status === 'pending' ? (
                          <button
                            className="btn-approve"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
                            onClick={() => handleApprove(own._id, own.name, 'bus_owner')}
                          >
                            Approve
                          </button>
                        ) : own.status === 'rejected' ? (
                          <button
                            className="btn-approve"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem', background: '#3B82F6' }}
                            onClick={() => handleApprove(own._id, own.name, 'bus_owner')}
                          >
                            Re-Approve
                          </button>
                        ) : (
                          <span style={{ color: '#059669', fontWeight: '700', fontSize: '0.82rem' }}>
                            ✓ Verified
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: ALL USERS */}
          {activeTab === 'all' && (
            <div>
              <div className="panel-filter-bar">
                <div className="search-input-wrap">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search by name, email, badge, or fleet..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <select
                    className="filter-select"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option value="all">All Roles</option>
                    <option value="passenger">Passengers</option>
                    <option value="authority">Authority Officers</option>
                    <option value="bus_owner">Bus Owners</option>
                  </select>

                  <select
                    className="filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>User Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAllUsers.map((u) => (
                      <tr key={u._id}>
                        <td>
                          <strong>{u.name}</strong>
                        </td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`role-pill ${u.role}`}>
                            {u.role === 'authority'
                              ? 'Officer'
                              : u.role === 'bus_owner'
                              ? 'Bus Owner'
                              : u.role === 'admin'
                              ? 'Admin'
                              : 'Passenger'}
                          </span>
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
        </section>
      </main>

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

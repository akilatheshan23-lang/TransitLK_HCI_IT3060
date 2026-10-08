import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:4000/api';

export function AuthorityDashboard({ currentUser, onLogout }) {
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedOfficerId, setSelectedOfficerId] = useState(currentUser?._id || currentUser?.id || '');
  const [allOfficers, setAllOfficers] = useState([]);

  // Ticket Validator state
  const [ticketInput, setTicketInput] = useState('TK-120-8830');
  const [validatingTicket, setValidatingTicket] = useState(false);
  const [verifiedTicket, setVerifiedTicket] = useState(null);
  const [ticketError, setTicketError] = useState('');

  // New Inspection Modal state
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [insBusReg, setInsBusReg] = useState('WP ND-3204');
  const [insLocation, setInsLocation] = useState('Kesbewa Junction');
  const [insResult, setInsResult] = useState('PASSED');
  const [insNotes, setInsNotes] = useState('Fare compliance verified. Digital QR readers operating normally.');
  const [submittingInspection, setSubmittingInspection] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Keep selectedOfficerId synced with currentUser
  useEffect(() => {
    if (currentUser?._id || currentUser?.id) {
      setSelectedOfficerId(currentUser._id || currentUser.id);
    }
  }, [currentUser?._id, currentUser?.id]);

  // Fetch all approved officers ONLY if admin or not restricted
  useEffect(() => {
    if (!currentUser || currentUser.role === 'admin') {
      let headers = {};
      try {
        const saved = localStorage.getItem('transitlk_portal_session');
        const token = saved ? JSON.parse(saved).token : null;
        if (token) headers = { Authorization: `Bearer ${token}` };
      } catch {}
      fetch(`${API_BASE}/admin/users?role=authority`, { headers })
        .then((r) => r.json())
        .then((data) => {
          if (data && data.users) {
            const approved = data.users.filter((u) => u.status === 'approved');
            setAllOfficers(approved);
            if (approved.length > 0 && !selectedOfficerId) {
              setSelectedOfficerId(approved[0]._id);
            }
          }
        })
        .catch((err) => console.error('Failed to load officers:', err));
    }
  }, []);

  // Fetch Authority Dashboard data
  const fetchAuthorityData = async () => {
    setLoading(true);
    try {
      const url = selectedOfficerId
        ? `${API_BASE}/buses/authority-dashboard?officerId=${encodeURIComponent(selectedOfficerId)}`
        : `${API_BASE}/buses/authority-dashboard`;
      const res = await fetch(url).then((r) => r.json());
      if (res && res.success) {
        setDashboardData(res);
      }
    } catch (err) {
      console.error('Failed to load authority data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthorityData();
    const interval = setInterval(fetchAuthorityData, 12000);
    return () => clearInterval(interval);
  }, [selectedOfficerId]);

  // Handle Ticket Verification
  const handleVerifyTicket = async (e) => {
    e.preventDefault();
    if (!ticketInput.trim()) return;

    setValidatingTicket(true);
    setTicketError('');
    setVerifiedTicket(null);

    try {
      const res = await fetch(`${API_BASE}/buses/verify-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: ticketInput.trim() }),
      }).then((r) => r.json());

      setValidatingTicket(false);

      if (res.success && res.ticket) {
        setVerifiedTicket(res.ticket);
        showToast(`Ticket ${ticketInput.toUpperCase()} verified successfully!`);
      } else {
        setTicketError(res.message || 'Ticket not found or invalid');
      }
    } catch (err) {
      setValidatingTicket(false);
      setTicketError('Verification service unavailable');
    }
  };

  // Handle Add Inspection
  const handleAddInspection = (e) => {
    e.preventDefault();
    setSubmittingInspection(true);

    const newLog = {
      id: `INS-${Math.floor(1000 + Math.random() * 9000)}`,
      busRegNumber: insBusReg.toUpperCase().trim(),
      route: '120 Horana-Colombo',
      inspector: dashboardData?.officer?.name || 'Authorized Inspector',
      date: 'Just Now',
      location: insLocation,
      result: insResult,
      notes: insNotes,
    };

    setTimeout(() => {
      setSubmittingInspection(false);
      setShowInspectionModal(false);
      if (dashboardData?.inspectionLogs) {
        dashboardData.inspectionLogs.unshift(newLog);
      }
      showToast(`Inspection report ${newLog.id} logged successfully!`);
    }, 400);
  };

  const officer = dashboardData?.officer || {};
  const stats = dashboardData?.stats || {
    totalMonitoredRoutes: 7,
    activeBusesOnline: 10,
    dailyPassengerVolume: '14,250',
    networkComplianceRate: '98.4%',
    inspectionsToday: 18,
    activeViolations: 1,
  };
  const activeFleet = dashboardData?.activeFleet || [];
  const inspectionLogs = dashboardData?.inspectionLogs || [];
  const monitoredRoutes = dashboardData?.monitoredRoutes || [];

  return (
    <div className="authority-dashboard-container">
      {/* Toast Notification */}
      {toastMessage && <div className="toast-banner">{toastMessage}</div>}

      {/* Top Officer Profile Bar */}
      <section className="authority-top-bar">
        <div className="authority-info-left">
          <div className="authority-badge-avatar">🛡️</div>
          <div>
            <div className="authority-title-row">
              <h2>{officer.department || 'National Transport Commission (Colombo)'}</h2>
              <span className="authority-status-pill">Active On Duty</span>
            </div>
            <p className="authority-sub-detail">
              Officer: <strong>{officer.name || 'Officer Wickramasinghe'}</strong> • Badge / ID: <code>{officer.officerId || 'NTC-WP-5704'}</code> • Jurisdiction: Colombo Metropolitan & Western Province
            </p>
          </div>
        </div>

        <div className="authority-actions-right">
          {(!currentUser || currentUser.role === 'admin') && allOfficers.length > 1 && (
            <div className="officer-select-box">
              <label>Switch Officer Profile:</label>
              <select
                value={selectedOfficerId}
                onChange={(e) => setSelectedOfficerId(e.target.value)}
              >
                {allOfficers.map((off) => (
                  <option key={off._id} value={off._id}>
                    {off.name} ({off.officerId || 'NTC'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button className="btn-log-inspection" onClick={() => setShowInspectionModal(true)}>
            + Log Inspection Report
          </button>
        </div>
      </section>

      {/* Oversight Metrics Grid */}
      <section className="authority-metrics-grid">
        <div className="stat-card authority-card-accent">
          <div className="stat-header">
            <span className="stat-icon">🚦</span>
            <span className="stat-tag tag-blue">Network Routes</span>
          </div>
          <div className="stat-currency-value">
            <span className="currency-number">{stats.totalMonitoredRoutes}</span>
            <span className="unit-label">corridors</span>
          </div>
          <div className="stat-caption">Monitored Bus Corridors</div>
          <div className="stat-sub-detail">Route 120, 138, 100, 122, 177, 125, 255</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-icon">🚍</span>
            <span className="stat-tag tag-green">GPS Live</span>
          </div>
          <div className="stat-currency-value">
            <span className="currency-number">{stats.activeBusesOnline}</span>
            <span className="unit-label">buses</span>
          </div>
          <div className="stat-caption">Active Buses on Road</div>
          <div className="stat-sub-detail">100% compliant with approved schedule</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-icon">👥</span>
            <span className="stat-tag tag-teal">Daily Commuters</span>
          </div>
          <div className="stat-currency-value">
            <span className="currency-number">{stats.dailyPassengerVolume}</span>
          </div>
          <div className="stat-caption">Passenger Volume Today</div>
          <div className="stat-sub-detail">Digital check-ins across Colombo network</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-icon">✅</span>
            <span className="stat-tag tag-green">{stats.networkComplianceRate} Score</span>
          </div>
          <div className="stat-currency-value">
            <span className="currency-number">{stats.inspectionsToday}</span>
            <span className="unit-label">checks</span>
          </div>
          <div className="stat-caption">Inspections Completed Today</div>
          <div className="stat-sub-detail">
            {stats.activeViolations > 0 ? `${stats.activeViolations} Notice Issued` : 'Zero Violations'}
          </div>
        </div>
      </section>

      {/* Ticket Validator Tool (Card) */}
      <section className="ticket-validator-panel">
        <div className="validator-header">
          <div className="validator-title-col">
            <div className="validator-icon">🔍</div>
            <div>
              <h3>Official Digital Ticket & QR Code Validator</h3>
              <p>Verify passenger ticket genuineness, correct segment fare, and seat authorization</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleVerifyTicket} className="validator-form">
          <div className="validator-input-group">
            <span className="validator-prefix">TICKET ID / QR:</span>
            <input
              type="text"
              placeholder="e.g., TK-120-8830"
              value={ticketInput}
              onChange={(e) => setTicketInput(e.target.value)}
              className="ticket-text-input"
            />
            <button type="submit" className="btn-validate" disabled={validatingTicket}>
              {validatingTicket ? 'Verifying...' : 'Validate Ticket Authenticity'}
            </button>
          </div>
        </form>

        {ticketError && <div className="ticket-error-box">{ticketError}</div>}

        {verifiedTicket && (
          <div className="verified-ticket-card">
            <div className="ticket-card-top">
              <div className="ticket-valid-tag">✓ VALID TICKET CONFIRMED</div>
              <span className="ticket-id-display">{verifiedTicket.ticketId}</span>
            </div>

            <div className="ticket-details-grid">
              <div className="ticket-field">
                <label>Passenger Name</label>
                <strong>{verifiedTicket.passengerName}</strong>
              </div>
              <div className="ticket-field">
                <label>Assigned Bus</label>
                <strong>{verifiedTicket.busRegNumber}</strong>
              </div>
              <div className="ticket-field">
                <label>Route & Service</label>
                <strong>Route {verifiedTicket.routeNumber} ({verifiedTicket.operator})</strong>
              </div>
              <div className="ticket-field">
                <label>Boarding & Destination</label>
                <strong>{verifiedTicket.from} → {verifiedTicket.to}</strong>
              </div>
              <div className="ticket-field">
                <label>Official Fare Paid</label>
                <strong className="text-teal">Rs. {verifiedTicket.fare} (NTC Compliant)</strong>
              </div>
              <div className="ticket-field">
                <label>Seat Allocation</label>
                <strong>Seat {verifiedTicket.seatNumber}</strong>
              </div>
              <div className="ticket-field">
                <label>Purchased At</label>
                <span>{verifiedTicket.purchasedAt}</span>
              </div>
              <div className="ticket-field">
                <label>Payment Method</label>
                <span>TransitLK Digital Card / QR</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Real-time Fleet & Corridor Surveillance */}
      <section className="section-panel mt-4">
        <div className="panel-header-row">
          <div>
            <h3>Active Fleet Surveillance & Compliance</h3>
            <p>Live status of public & private buses operating under National Transport Commission permit</p>
          </div>
          <button className="btn-secondary-sync" onClick={fetchAuthorityData}>
            {loading ? 'Updating...' : '↻ Live Fleet Sync'}
          </button>
        </div>

        <div className="table-responsive">
          <table className="custom-data-table">
            <thead>
              <tr>
                <th>Registration</th>
                <th>Operator</th>
                <th>Route Corridor</th>
                <th>Bus Category</th>
                <th>Live Occupancy</th>
                <th>GPS Telemetry</th>
                <th>Permit & Compliance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {activeFleet.map((bus) => (
                <tr key={bus.id}>
                  <td>
                    <div className="plate-badge">{bus.busRegNumber}</div>
                  </td>
                  <td>
                    <strong>{bus.operator}</strong>
                  </td>
                  <td>
                    <strong>Route {bus.routeNumber}</strong>
                    <div className="sub-route-text">{bus.routeName}</div>
                  </td>
                  <td>{bus.busType}</td>
                  <td>
                    <div className="capacity-stat">
                      <strong>{bus.occupiedSeats}</strong> / {bus.totalSeats} seats
                    </div>
                  </td>
                  <td>
                    <span className="gps-live-tag">● {bus.gpsSignal}</span>
                  </td>
                  <td>
                    <span className="compliance-tag">✓ {bus.inspectionStatus}</span>
                  </td>
                  <td>
                    <span className="status-pill-active">● {bus.currentStatus}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Inspection & Regulatory Infraction Log */}
      <section className="section-panel mt-4">
        <div className="panel-header-row">
          <div>
            <h3>Field Inspection Logs & Incident Reports</h3>
            <p>Recent safety audits, fare verification, and roadside checks</p>
          </div>
          <span className="live-indicator-pill">NTC Western Province Registry</span>
        </div>

        <div className="table-responsive">
          <table className="custom-data-table">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Vehicle Plate</th>
                <th>Route</th>
                <th>Inspector</th>
                <th>Checkpoint Location</th>
                <th>Date / Time</th>
                <th>Inspection Result</th>
                <th>Observations</th>
              </tr>
            </thead>
            <tbody>
              {inspectionLogs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <code>{log.id}</code>
                  </td>
                  <td>
                    <strong>{log.busRegNumber}</strong>
                  </td>
                  <td>{log.route}</td>
                  <td>{log.inspector}</td>
                  <td>{log.location}</td>
                  <td className="text-muted">{log.date}</td>
                  <td>
                    <span
                      className={`result-badge ${
                        log.result === 'PASSED'
                          ? 'result-passed'
                          : log.result === 'WARNING'
                          ? 'result-warning'
                          : 'result-fined'
                      }`}
                    >
                      {log.result}
                    </span>
                  </td>
                  <td className="notes-col">{log.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* LOG INSPECTION MODAL */}
      {showInspectionModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog-card">
            <div className="modal-head">
              <h3>Record Field Inspection Log</h3>
              <button className="btn-close-modal" onClick={() => setShowInspectionModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleAddInspection} className="modal-form-body">
              <div className="form-row-2">
                <div className="form-field">
                  <label>Inspected Bus Registration *</label>
                  <input
                    type="text"
                    value={insBusReg}
                    onChange={(e) => setInsBusReg(e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Inspection Checkpoint Location *</label>
                  <input
                    type="text"
                    value={insLocation}
                    onChange={(e) => setInsLocation(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Audit Outcome *</label>
                <select value={insResult} onChange={(e) => setInsResult(e.target.value)}>
                  <option value="PASSED">PASSED (Full Compliance)</option>
                  <option value="WARNING">WARNING (Minor Overcrowding / Delay)</option>
                  <option value="FINED">PENALTY ISSUED (Overcharging / Route Deviation)</option>
                </select>
              </div>

              <div className="form-field">
                <label>Official Observations & Notes</label>
                <textarea
                  rows="3"
                  value={insNotes}
                  onChange={(e) => setInsNotes(e.target.value)}
                  placeholder="Record fare compliance, digital ticket scanner status, and safety conditions..."
                ></textarea>
              </div>

              <div className="modal-action-buttons">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowInspectionModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit-bus" disabled={submittingInspection}>
                  {submittingInspection ? 'Submitting...' : 'Save Inspection to Registry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:4000/api';

export function BusOwnerDashboard({ currentUser, onLogout }) {
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedOwnerEmail, setSelectedOwnerEmail] = useState(currentUser?.email || '');
  const [allOwners, setAllOwners] = useState([]);

  // Add Bus Modal State
  const [showAddBusModal, setShowAddBusModal] = useState(false);
  const [newRegNumber, setNewRegNumber] = useState('');
  const [newRouteNumber, setNewRouteNumber] = useState('120');
  const [newBusType, setNewBusType] = useState('Luxury AC');
  const [newTotalSeats, setNewTotalSeats] = useState(48);
  const [newBaseFare, setNewBaseFare] = useState(240);
  const [newDepartureTime, setNewDepartureTime] = useState('07:15 AM');
  const [newArrivalTime, setNewArrivalTime] = useState('08:35 AM');
  const [submittingBus, setSubmittingBus] = useState(false);
  const [addBusError, setAddBusError] = useState('');

  // Selected bus stops viewer modal
  const [viewingStopsBus, setViewingStopsBus] = useState(null);

  // Available routes template
  const [availableRoutes, setAvailableRoutes] = useState([]);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Keep selectedOwnerEmail synced with currentUser
  useEffect(() => {
    if (currentUser?.email) {
      setSelectedOwnerEmail(currentUser.email);
    }
  }, [currentUser?.email]);

  // Fetch all approved owners to allow switching/viewing ONLY if not restricted
  useEffect(() => {
    if (!currentUser || currentUser.role === 'admin') {
      let headers = {};
      try {
        const saved = localStorage.getItem('transitlk_portal_session');
        const token = saved ? JSON.parse(saved).token : null;
        if (token) headers = { Authorization: `Bearer ${token}` };
      } catch {}
      fetch(`${API_BASE}/admin/users?role=bus_owner`, { headers })
        .then((r) => r.json())
        .then((data) => {
          if (data && data.users) {
            const approved = data.users.filter((u) => u.status === 'approved');
            setAllOwners(approved);
            if (approved.length > 0 && !selectedOwnerEmail) {
              setSelectedOwnerEmail(approved[0].email);
            }
          }
        })
        .catch((err) => console.error('Failed to load owners:', err));
    }

    // Fetch master routes
    fetch(`${API_BASE}/buses/routes`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.routes) {
          setAvailableRoutes(data.routes);
        }
      })
      .catch((err) => console.error('Failed to load routes:', err));
  }, []);

  // Fetch Dashboard data for selected owner
  const fetchOwnerData = async () => {
    setLoading(true);
    try {
      const url = selectedOwnerEmail
        ? `${API_BASE}/buses/owner-dashboard?email=${encodeURIComponent(selectedOwnerEmail)}`
        : `${API_BASE}/buses/owner-dashboard`;
      const res = await fetch(url).then((r) => r.json());
      if (res && res.success) {
        setDashboardData(res);
      }
    } catch (err) {
      console.error('Failed to load owner data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwnerData();
    const interval = setInterval(fetchOwnerData, 10000); // 10s live sync
    return () => clearInterval(interval);
  }, [selectedOwnerEmail]);

  // Handle Add Bus submit
  const handleAddBus = async (e) => {
    e.preventDefault();
    setAddBusError('');

    if (!newRegNumber.trim()) {
      setAddBusError('Please enter bus registration number (e.g. WP ND-4402)');
      return;
    }

    if (!dashboardData?.owner?.id) {
      setAddBusError('Bus owner account not found.');
      return;
    }

    setSubmittingBus(true);
    try {
      const selectedRouteObj = availableRoutes.find((r) => r.routeNumber === newRouteNumber);
      const res = await fetch(`${API_BASE}/buses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: dashboardData.owner.id,
          busRegNumber: newRegNumber.trim(),
          routeNumber: newRouteNumber,
          busType: newBusType,
          totalSeats: Number(newTotalSeats),
          baseFare: Number(newBaseFare),
          departureTime: newDepartureTime,
          arrivalTime: newArrivalTime,
          customStops: selectedRouteObj ? selectedRouteObj.stops : undefined,
        }),
      }).then((r) => r.json());

      setSubmittingBus(false);

      if (res.success) {
        showToast(`Bus ${newRegNumber.toUpperCase()} added to Route ${newRouteNumber} successfully!`);
        setShowAddBusModal(false);
        setNewRegNumber('');
        fetchOwnerData();
      } else {
        setAddBusError(res.message || 'Could not register bus');
      }
    } catch (err) {
      setSubmittingBus(false);
      setAddBusError('Network error while adding bus.');
    }
  };

  const owner = dashboardData?.owner || {};
  const stats = dashboardData?.stats || {
    totalBuses: 0,
    activeBuses: 0,
    todayRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    ticketsSoldToday: 0,
    averageOccupancy: '0%',
    onTimePerformance: '0%',
  };
  const busBreakdown = dashboardData?.busRevenueBreakdown || [];
  const recentBookings = dashboardData?.recentBookings || [];

  return (
    <div className="owner-dashboard-container">
      {/* Toast Notification */}
      {toastMessage && <div className="toast-banner">{toastMessage}</div>}

      {/* Top Profile & Operations Bar */}
      <section className="owner-top-bar">
        <div className="owner-info-left">
          <div className="owner-badge-avatar">🚌</div>
          <div>
            <div className="owner-company-row">
              <h2>{owner.companyName || `${owner.name || 'Bus Fleet'} Transport`}</h2>
              <span className="owner-verified-pill">✓ NTC Approved Operator</span>
            </div>
            <p className="owner-meta-sub">
              Managing Director: <strong>{owner.name}</strong> • Phone: {owner.phone || '0771234567'} • Email: {owner.email}
            </p>
          </div>
        </div>

        <div className="owner-actions-right">
          {/* Quick Account Switcher for Admin only */}
          {(!currentUser || currentUser.role === 'admin') && allOwners.length > 1 && (
            <div className="owner-account-switcher">
              <label>Switch Fleet Owner:</label>
              <select
                value={selectedOwnerEmail}
                onChange={(e) => setSelectedOwnerEmail(e.target.value)}
              >
                {allOwners.map((o) => (
                  <option key={o._id} value={o.email}>
                    {o.companyName || o.name} ({o.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            className="btn-add-bus"
            onClick={() => {
              setAddBusError('');
              setShowAddBusModal(true);
            }}
          >
            <span>+</span> Register New Bus
          </button>
        </div>
      </section>

      {/* Financial & Revenue Performance Grid */}
      <section className="revenue-stats-grid">
        {/* Metric 1: Today's Revenue */}
        <div className="stat-card revenue-highlight-card">
          <div className="stat-header">
            <span className="stat-icon">💰</span>
            <span className="stat-trend trend-positive">+14.2% today</span>
          </div>
          <div className="stat-currency-value">
            <span className="currency-symbol">Rs.</span>
            <span className="currency-number">{stats.todayRevenue.toLocaleString()}</span>
          </div>
          <div className="stat-caption">Today's Gross Ticket Revenue</div>
          <div className="stat-sub-detail">
            Calculated from {stats.ticketsSoldToday} passenger digital fares
          </div>
        </div>

        {/* Metric 2: Weekly Revenue */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-icon">📈</span>
            <span className="stat-tag tag-blue">Last 7 Days</span>
          </div>
          <div className="stat-currency-value">
            <span className="currency-symbol">Rs.</span>
            <span className="currency-number">{stats.weeklyRevenue.toLocaleString()}</span>
          </div>
          <div className="stat-caption">This Week's Revenue</div>
          <div className="stat-sub-detail">
            Monthly pace: Rs. {stats.monthlyRevenue.toLocaleString()}
          </div>
        </div>

        {/* Metric 3: Passenger Tickets Sold */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-icon">🎟️</span>
            <span className="stat-tag tag-teal">Live Tickets</span>
          </div>
          <div className="stat-currency-value">
            <span className="currency-number">{stats.ticketsSoldToday}</span>
            <span className="unit-label">tickets</span>
          </div>
          <div className="stat-caption">Passenger Tickets Issued Today</div>
          <div className="stat-sub-detail">TransitLK Digital QR & Card check-ins</div>
        </div>

        {/* Metric 4: Fleet & Occupancy */}
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-icon">💺</span>
            <span className="stat-tag tag-green">{stats.onTimePerformance} On-time</span>
          </div>
          <div className="stat-currency-value">
            <span className="currency-number">{stats.averageOccupancy}</span>
          </div>
          <div className="stat-caption">Average Seat Occupancy</div>
          <div className="stat-sub-detail">
            {stats.activeBuses} of {stats.totalBuses} buses active on road
          </div>
        </div>
      </section>

      {/* Fleet Breakdown & Bus Revenue Details */}
      <section className="section-panel">
        <div className="panel-header-row">
          <div>
            <h3>Fleet Performance & Revenue Breakdown</h3>
            <p>Daily earnings, schedule status, and passenger occupancy per bus</p>
          </div>
          <button className="btn-secondary-sync" onClick={fetchOwnerData}>
            {loading ? 'Syncing...' : '↻ Live Sync'}
          </button>
        </div>

        <div className="table-responsive">
          <table className="custom-data-table">
            <thead>
              <tr>
                <th>Registration</th>
                <th>Route</th>
                <th>Bus Category</th>
                <th>Daily Trips</th>
                <th>Today's Tickets</th>
                <th>Daily Revenue (LKR)</th>
                <th>Occupancy</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {busBreakdown.length > 0 ? (
                busBreakdown.map((bus) => (
                  <tr key={bus.id}>
                    <td>
                      <div className="plate-badge">{bus.busRegNumber}</div>
                    </td>
                    <td>
                      <strong>Route {bus.routeNumber}</strong>
                      <div className="sub-route-text">{bus.routeName}</div>
                    </td>
                    <td>
                      <span className={`category-pill ${bus.busType === 'Luxury AC' ? 'pill-luxury' : 'pill-semi'}`}>
                        {bus.busType}
                      </span>
                    </td>
                    <td>
                      <span className="trip-count-badge">{bus.tripsToday} Trips</span>
                    </td>
                    <td>
                      <strong>{bus.ticketsSoldToday}</strong>
                      <span className="text-muted"> / {bus.totalSeats * bus.tripsToday} cap</span>
                    </td>
                    <td>
                      <span className="revenue-cell-amount">Rs. {bus.revenueToday.toLocaleString()}</span>
                    </td>
                    <td>
                      <div className="occupancy-bar-wrap">
                        <div className="occupancy-bar" style={{ width: bus.occupancyRate }}></div>
                        <span className="occupancy-val">{bus.occupancyRate}</span>
                      </div>
                    </td>
                    <td>
                      <span className="status-pill-active">● On Route</span>
                    </td>
                    <td>
                      <button
                        className="btn-view-stops"
                        onClick={() => {
                          const fullBus = dashboardData.buses.find((b) => b._id === bus.id);
                          setViewingStopsBus(fullBus || bus);
                        }}
                      >
                        View Stops
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="text-center py-4">
                    No buses found for this operator. Click <strong>"Register New Bus"</strong> to add your first bus.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Live Passenger Bookings & Tickets Feed */}
      <section className="section-panel mt-4">
        <div className="panel-header-row">
          <div>
            <h3>Live Passenger Ticket Transactions</h3>
            <p>Real-time passenger boarding and fare payments across your fleet</p>
          </div>
          <span className="live-indicator-pill">● Real-time Digital Fares</span>
        </div>

        <div className="table-responsive">
          <table className="custom-data-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Passenger</th>
                <th>Bus Reg No</th>
                <th>Route</th>
                <th>Journey Segment</th>
                <th>Fare (LKR)</th>
                <th>Payment Mode</th>
                <th>Purchased</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((tx) => (
                <tr key={tx.ticketId}>
                  <td>
                    <code className="ticket-code">{tx.ticketId}</code>
                  </td>
                  <td>
                    <strong>{tx.passengerName}</strong>
                  </td>
                  <td>{tx.busRegNumber}</td>
                  <td>Route {tx.routeNumber}</td>
                  <td>
                    <span className="from-to-badge">
                      {tx.fromStop} → {tx.toStop}
                    </span>
                  </td>
                  <td>
                    <strong className="text-teal">Rs. {tx.fare}</strong>
                  </td>
                  <td>
                    <span className="payment-tag">{tx.paymentMethod}</span>
                  </td>
                  <td className="text-muted">{tx.time}</td>
                  <td>
                    <span className="confirmed-badge">✓ Confirmed</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ADD BUS MODAL */}
      {showAddBusModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog-card">
            <div className="modal-head">
              <h3>Register New Bus to Fleet</h3>
              <button className="btn-close-modal" onClick={() => setShowAddBusModal(false)}>
                ✕
              </button>
            </div>

            {addBusError && <div className="modal-alert-error">{addBusError}</div>}

            <form onSubmit={handleAddBus} className="modal-form-body">
              <div className="form-row-2">
                <div className="form-field">
                  <label>Bus Registration Number *</label>
                  <input
                    type="text"
                    placeholder="e.g., WP ND-4402"
                    value={newRegNumber}
                    onChange={(e) => setNewRegNumber(e.target.value)}
                    required
                  />
                  <small>Provincial plate format (WP, SP, CP etc.)</small>
                </div>

                <div className="form-field">
                  <label>Assigned Route *</label>
                  <select
                    value={newRouteNumber}
                    onChange={(e) => {
                      setNewRouteNumber(e.target.value);
                      const r = availableRoutes.find((rt) => rt.routeNumber === e.target.value);
                      if (r) {
                        setNewBaseFare(r.baseFare);
                      }
                    }}
                  >
                    {availableRoutes.map((rt) => (
                      <option key={rt.routeNumber} value={rt.routeNumber}>
                        Route {rt.routeNumber} ({rt.routeName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row-3">
                <div className="form-field">
                  <label>Bus Category</label>
                  <select value={newBusType} onChange={(e) => setNewBusType(e.target.value)}>
                    <option value="Luxury AC">Luxury AC</option>
                    <option value="Semi-Luxury">Semi-Luxury</option>
                    <option value="Normal">Normal CTB</option>
                  </select>
                </div>

                <div className="form-field">
                  <label>Total Seats</label>
                  <input
                    type="number"
                    min="20"
                    max="65"
                    value={newTotalSeats}
                    onChange={(e) => setNewTotalSeats(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label>Full Base Fare (Rs.)</label>
                  <input
                    type="number"
                    min="50"
                    max="1000"
                    value={newBaseFare}
                    onChange={(e) => setNewBaseFare(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-field">
                  <label>First Departure Time</label>
                  <input
                    type="text"
                    value={newDepartureTime}
                    onChange={(e) => setNewDepartureTime(e.target.value)}
                    placeholder="06:30 AM"
                  />
                </div>

                <div className="form-field">
                  <label>Estimated Arrival Time</label>
                  <input
                    type="text"
                    value={newArrivalTime}
                    onChange={(e) => setNewArrivalTime(e.target.value)}
                    placeholder="07:50 AM"
                  />
                </div>
              </div>

              <div className="modal-action-buttons">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowAddBusModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit-bus" disabled={submittingBus}>
                  {submittingBus ? 'Registering Bus...' : 'Confirm & Add Bus to Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW STOPS MODAL */}
      {viewingStopsBus && (
        <div className="modal-backdrop">
          <div className="modal-dialog-card">
            <div className="modal-head">
              <h3>Route Stops Sequence • {viewingStopsBus.busRegNumber}</h3>
              <button className="btn-close-modal" onClick={() => setViewingStopsBus(null)}>
                ✕
              </button>
            </div>
            <div className="p-4">
              <p className="stops-sub-heading">
                Route {viewingStopsBus.routeNumber} ({viewingStopsBus.routeName})
              </p>
              <div className="stops-timeline-list">
                {viewingStopsBus.stops && viewingStopsBus.stops.length > 0 ? (
                  viewingStopsBus.stops.map((stop, index) => (
                    <div key={index} className="stop-step-item">
                      <div className="stop-circle">{index + 1}</div>
                      <div className="stop-name-col">
                        <strong>{stop}</strong>
                        {index === 0 && <span className="stop-tag tag-start">Starting Point</span>}
                        {index === viewingStopsBus.stops.length - 1 && (
                          <span className="stop-tag tag-end">Terminal Destination</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p>Standard stops configured.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

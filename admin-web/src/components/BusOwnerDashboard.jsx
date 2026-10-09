import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:4000/api';


function ownerFetch(url, options={}) {
 let token='';try{token=JSON.parse(localStorage.getItem('transitlk_portal_session')||'{}').token||'';}catch{}
 return fetch(url,{...options,headers:{...options.headers,...(token?{Authorization:'Bearer '+token}:{})}});
}

export function BusOwnerDashboard({ currentUser, onLogout }) {
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedOwnerEmail, setSelectedOwnerEmail] = useState(currentUser?.email || '');
  const [allOwners, setAllOwners] = useState([]);

  // Add Bus Modal State
  const [showAddBusModal, setShowAddBusModal] = useState(false);
  const [newRegNumber, setNewRegNumber] = useState('');
  const [newRouteNumber, setNewRouteNumber] = useState('120');
  const [newRouteName, setNewRouteName] = useState('Horana - Colombo (Pettah)');
  const [newStartPoint, setNewStartPoint] = useState('Horana');
  const [newEndPoint, setNewEndPoint] = useState('Colombo (Pettah)');
  const [newBusType, setNewBusType] = useState('Luxury AC');
  const [newTotalSeats, setNewTotalSeats] = useState(48);
  const [newBaseFare, setNewBaseFare] = useState(240);
  const [newDepartureTime, setNewDepartureTime] = useState('06:30 AM');
  const [newArrivalTime, setNewArrivalTime] = useState('07:50 AM');
  const [newJourneyDuration, setNewJourneyDuration] = useState('1 hr 20 mins');
  const [submittingBus, setSubmittingBus] = useState(false);
  const [addBusError, setAddBusError] = useState('');

  // Edit Bus Modal State
  const [showEditBusModal, setShowEditBusModal] = useState(false);
  const [editingBus, setEditingBus] = useState(null);
  const [editRegNumber, setEditRegNumber] = useState('');
  const [editRouteNumber, setEditRouteNumber] = useState('');
  const [editRouteName, setEditRouteName] = useState('');
  const [editStartPoint, setEditStartPoint] = useState('');
  const [editEndPoint, setEditEndPoint] = useState('');
  const [editBusType, setEditBusType] = useState('Luxury AC');
  const [editTotalSeats, setEditTotalSeats] = useState(48);
  const [editBaseFare, setEditBaseFare] = useState(240);
  const [editDepartureTime, setEditDepartureTime] = useState('');
  const [editArrivalTime, setEditArrivalTime] = useState('');
  const [editJourneyDuration, setEditJourneyDuration] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editBusError, setEditBusError] = useState('');

  // Delete Bus Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingBus, setDeletingBus] = useState(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  // Selected bus stops viewer modal
  const [viewingStopsBus, setViewingStopsBus] = useState(null);

  // Available routes template
  const [availableRoutes, setAvailableRoutes] = useState([]);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
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
      ownerFetch(`${API_BASE}/admin/users?role=bus_owner`, { headers })
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
    ownerFetch(`${API_BASE}/buses/routes`)
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
      const res = await ownerFetch(url).then((r) => r.json());
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

  // Handle Add Bus submit (creates bus with status: 'pending')
  const handleAddBus = async (e) => {
    e.preventDefault();
    setAddBusError('');

    if (!newRegNumber.trim()) {
      setAddBusError('Please enter bus registration number (e.g. WP ND-4402)');
      return;
    }

    if (!dashboardData?.owner?.id && !dashboardData?.owner?._id) {
      setAddBusError('Bus owner account not found.');
      return;
    }

    const ownerIdentifier = dashboardData.owner.id || dashboardData.owner._id;

    setSubmittingBus(true);
    try {
      const selectedRouteObj = availableRoutes.find((r) => r.routeNumber === newRouteNumber);
      const res = await ownerFetch(`${API_BASE}/buses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: ownerIdentifier,
          ownerEmail: dashboardData.owner.email,
          busRegNumber: newRegNumber.trim().toUpperCase(),
          routeNumber: newRouteNumber,
          routeName: newRouteName || (selectedRouteObj ? selectedRouteObj.routeName : `Route ${newRouteNumber}`),
          startPoint: newStartPoint.trim() || 'Start Terminal',
          endPoint: newEndPoint.trim() || 'End Terminal',
          departureTime: newDepartureTime.trim(),
          arrivalTime: newArrivalTime.trim(),
          journeyDuration: newJourneyDuration.trim() || '1 hr 15 mins',
          busType: newBusType,
          totalSeats: Number(newTotalSeats),
          baseFare: Number(newBaseFare),
          customStops: selectedRouteObj ? selectedRouteObj.stops : undefined,
        }),
      }).then((r) => r.json());

      setSubmittingBus(false);

      if (res.success) {
        showToast(`Bus ${newRegNumber.toUpperCase()} schedule submitted! Status: Pending Administrator Approval.`);
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

  // Open Edit Modal with bus values
  const handleOpenEditModal = (bus) => {
    setEditingBus(bus);
    setEditRegNumber(bus.busRegNumber || '');
    setEditRouteNumber(bus.routeNumber || '120');
    setEditRouteName(bus.routeName || '');
    setEditStartPoint(bus.startPoint || 'Horana');
    setEditEndPoint(bus.endPoint || 'Colombo (Pettah)');
    setEditDepartureTime(bus.departureTime || '07:00 AM');
    setEditArrivalTime(bus.arrivalTime || '08:30 AM');
    setEditJourneyDuration(bus.journeyDuration || '1 hr 20 mins');
    setEditBusType(bus.busType || 'Semi-Luxury');
    setEditTotalSeats(bus.totalSeats || 48);
    setEditBaseFare(bus.baseFare || 240);
    setEditBusError('');
    setShowEditBusModal(true);
  };

  // Handle Edit Bus submit (updates bus and resets status: 'pending')
  const handleEditBus = async (e) => {
    e.preventDefault();
    setEditBusError('');

    if (!editRegNumber.trim()) {
      setEditBusError('Please enter bus registration number');
      return;
    }

    const busId = editingBus.id || editingBus._id;
    if (!busId) {
      setEditBusError('Bus ID not found');
      return;
    }

    setSubmittingEdit(true);
    try {
      const selectedRouteObj = availableRoutes.find((r) => r.routeNumber === editRouteNumber);
      const res = await ownerFetch(`${API_BASE}/buses/${busId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          busRegNumber: editRegNumber.trim().toUpperCase(),
          routeNumber: editRouteNumber,
          routeName: editRouteName || (selectedRouteObj ? selectedRouteObj.routeName : `Route ${editRouteNumber}`),
          startPoint: editStartPoint.trim(),
          endPoint: editEndPoint.trim(),
          departureTime: editDepartureTime.trim(),
          arrivalTime: editArrivalTime.trim(),
          journeyDuration: editJourneyDuration.trim(),
          busType: editBusType,
          totalSeats: Number(editTotalSeats),
          baseFare: Number(editBaseFare),
        }),
      }).then((r) => r.json());

      setSubmittingEdit(false);

      if (res.success) {
        showToast(`Bus ${editRegNumber.toUpperCase()} details updated and resubmitted for Admin approval.`);
        setShowEditBusModal(false);
        setEditingBus(null);
        fetchOwnerData();
      } else {
        setEditBusError(res.message || 'Failed to update bus details');
      }
    } catch (err) {
      setSubmittingEdit(false);
      setEditBusError('Network error while updating bus.');
    }
  };

  // Open Delete Confirmation Modal
  const handleOpenDeleteModal = (bus) => {
    setDeletingBus(bus);
    setShowDeleteModal(true);
  };

  // Handle Delete Bus
  const handleDeleteBus = async () => {
    if (!deletingBus) return;
    const busId = deletingBus.id || deletingBus._id;
    setSubmittingDelete(true);
    try {
      const res = await ownerFetch(`${API_BASE}/buses/${busId}`, {
        method: 'DELETE',
      }).then((r) => r.json());

      setSubmittingDelete(false);
      if (res.success) {
        showToast(`Bus ${deletingBus.busRegNumber} removed from your fleet.`);
        setShowDeleteModal(false);
        setDeletingBus(null);
        fetchOwnerData();
      } else {
        showToast(res.message || 'Could not delete bus');
      }
    } catch (err) {
      setSubmittingDelete(false);
      showToast('Network error while deleting bus.');
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
            <span>+</span> Register New Bus & Schedule
          </button>
        </div>
      </section>

      {/* Approval Process Notice Banner */}
      <section className="approval-notice-banner" style={{
        background: '#EFF6FF',
        border: '1px solid #BFDBFE',
        borderRadius: '12px',
        padding: '12px 18px',
        margin: '12px 0 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <span style={{ fontSize: '20px' }}>ℹ️</span>
        <div style={{ fontSize: '13px', color: '#1E3A8A', lineHeight: 1.5 }}>
          <strong>National Transport Commission Regulation:</strong> Whenever you add a new bus or modify timings, starting/ending points, or journey durations, the submission is placed in <strong>Pending Approval</strong> status. It will go live once verified by the NTC Administrator via the Admin Dashboard.
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
            <h3>Fleet Schedule Management & Operations</h3>
            <p>Manage buses, schedule timings, starting/ending points, journey duration, and view admin approval status</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary-sync" onClick={fetchOwnerData}>
              {loading ? 'Syncing...' : '↻ Live Sync'}
            </button>
            <button
              className="btn-add-bus"
              style={{ padding: '0.4rem 0.9rem', fontSize: '13px' }}
              onClick={() => {
                setAddBusError('');
                setShowAddBusModal(true);
              }}
            >
              + Add Bus Details
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="custom-data-table">
            <thead>
              <tr>
                <th>Registration</th>
                <th>Route & Corridor</th>
                <th>Start → End Points</th>
                <th>Schedule Timings</th>
                <th>Duration</th>
                <th>Bus Category</th>
                <th>Approval Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {busBreakdown.length > 0 ? (
                busBreakdown.map((bus) => {
                  const isApproved = bus.status === 'approved' || bus.status === 'active';
                  const isPending = bus.status === 'pending';
                  const isRejected = bus.status === 'rejected';

                  return (
                    <tr key={bus.id || bus._id}>
                      <td>
                        <div className="plate-badge">{bus.busRegNumber}</div>
                        {bus.submissionType === 'update' && (
                          <span style={{ fontSize: '10px', color: '#D97706', display: 'block', fontWeight: '700' }}>
                            (Edited)
                          </span>
                        )}
                      </td>
                      <td>
                        <strong>Route {bus.routeNumber}</strong>
                        <div className="sub-route-text">{bus.routeName}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: '600', color: '#1E293B', fontSize: '13px' }}>
                          {bus.startPoint || 'Horana'} → {bus.endPoint || 'Colombo'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>
                          ⏰ {bus.departureTime || '07:00 AM'} → {bus.arrivalTime || '08:30 AM'}
                        </div>
                      </td>
                      <td>
                        <span style={{
                          background: '#F1F5F9',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '700',
                          color: '#475569'
                        }}>
                          ⏱️ {bus.journeyDuration || '1 hr 15 mins'}
                        </span>
                      </td>
                      <td>
                        <span className={`category-pill ${bus.busType === 'Luxury AC' ? 'pill-luxury' : 'pill-semi'}`}>
                          {bus.busType}
                        </span>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          {bus.totalSeats} seats • Rs. {bus.baseFare}
                        </div>
                      </td>
                      <td>
                        {isApproved && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#D1FAE5',
                            color: '#065F46',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '700',
                          }}>
                            ✓ Approved & Active
                          </span>
                        )}
                        {isPending && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#FEF3C7',
                            color: '#92400E',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '700',
                          }}>
                            ⏳ Pending Admin Approval
                          </span>
                        )}
                        {isRejected && (
                          <div>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#FEE2E2',
                              color: '#991B1B',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '700',
                            }}>
                              ✕ Rejected
                            </span>
                            {bus.rejectionReason && (
                              <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '4px' }}>
                                Reason: {bus.rejectionReason}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            style={{
                              background: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              padding: '4px 9px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '700',
                              color: '#0F172A',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                            onClick={() => handleOpenEditModal(bus)}
                            title="Edit schedule and timings"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            style={{
                              background: '#FFFFFF',
                              border: '1px solid #FECACA',
                              padding: '4px 9px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '700',
                              color: '#DC2626',
                              cursor: 'pointer',
                            }}
                            onClick={() => handleOpenDeleteModal(bus)}
                            title="Delete bus from fleet"
                          >
                            🗑️ Delete
                          </button>
                          <button
                            className="btn-view-stops"
                            onClick={() => {
                              const fullBus = dashboardData.buses?.find((b) => (b._id === bus.id || b._id === bus._id));
                              setViewingStopsBus(fullBus || bus);
                            }}
                          >
                            Stops
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-4">
                    No buses found for this operator. Click <strong>"Register New Bus & Schedule"</strong> to add your first bus.
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

      {/* ========================================================
          1. ADD BUS & SCHEDULE MODAL
          ======================================================== */}
      {showAddBusModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog-card" style={{ maxWidth: '640px' }}>
            <div className="modal-head">
              <div>
                <h3>Add New Bus & Schedule</h3>
                <p style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Register bus plate, route corridor, schedule timings, and duration
                </p>
              </div>
              <button className="btn-close-modal" onClick={() => setShowAddBusModal(false)}>
                ✕
              </button>
            </div>

            {addBusError && <div className="modal-alert-error">{addBusError}</div>}

            <form onSubmit={handleAddBus} className="modal-form-body">
              <div className="form-row-2">
                <div className="form-field">
                  <label>Bus Number (Registration Plate) *</label>
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
                        setNewRouteName(r.routeName);
                        setNewBaseFare(r.baseFare);
                        if (r.stops && r.stops.length > 1) {
                          setNewStartPoint(r.stops[0]);
                          setNewEndPoint(r.stops[r.stops.length - 1]);
                        }
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

              {/* Starting & Ending Points */}
              <div className="form-row-2">
                <div className="form-field">
                  <label>Starting Point (Origin) *</label>
                  <input
                    type="text"
                    placeholder="e.g., Horana Terminal"
                    value={newStartPoint}
                    onChange={(e) => setNewStartPoint(e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Ending Point (Destination) *</label>
                  <input
                    type="text"
                    placeholder="e.g., Colombo (Pettah)"
                    value={newEndPoint}
                    onChange={(e) => setNewEndPoint(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Schedule Timings & Journey Duration */}
              <div className="form-row-3">
                <div className="form-field">
                  <label>Departure Time *</label>
                  <input
                    type="text"
                    placeholder="e.g., 06:30 AM"
                    value={newDepartureTime}
                    onChange={(e) => setNewDepartureTime(e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Arrival Time *</label>
                  <input
                    type="text"
                    placeholder="e.g., 07:50 AM"
                    value={newArrivalTime}
                    onChange={(e) => setNewArrivalTime(e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Journey Duration *</label>
                  <input
                    type="text"
                    placeholder="e.g., 1 hr 20 mins"
                    value={newJourneyDuration}
                    onChange={(e) => setNewJourneyDuration(e.target.value)}
                    required
                  />
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

              {/* Notice */}
              <div style={{
                background: '#FEF3C7',
                border: '1px solid #FDE68A',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '12px',
                color: '#92400E',
                lineHeight: 1.4,
              }}>
                ⏳ <strong>Approval Notice:</strong> This bus will be created with status <strong>Pending Approval</strong>. The National Transport Commission Admin will review and approve the schedule before it goes live.
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
                  {submittingBus ? 'Submitting Schedule...' : 'Submit Bus for Admin Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          2. EDIT BUS & SCHEDULE MODAL
          ======================================================== */}
      {showEditBusModal && editingBus && (
        <div className="modal-backdrop">
          <div className="modal-dialog-card" style={{ maxWidth: '640px' }}>
            <div className="modal-head">
              <div>
                <h3>Edit Bus & Schedule • {editingBus.busRegNumber}</h3>
                <p style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Update bus timetable, stops, and duration. Re-approval required upon save.
                </p>
              </div>
              <button className="btn-close-modal" onClick={() => setShowEditBusModal(false)}>
                ✕
              </button>
            </div>

            {editBusError && <div className="modal-alert-error">{editBusError}</div>}

            <form onSubmit={handleEditBus} className="modal-form-body">
              <div className="form-row-2">
                <div className="form-field">
                  <label>Bus Number (Plate) *</label>
                  <input
                    type="text"
                    value={editRegNumber}
                    onChange={(e) => setEditRegNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Route Number *</label>
                  <select
                    value={editRouteNumber}
                    onChange={(e) => {
                      setEditRouteNumber(e.target.value);
                      const r = availableRoutes.find((rt) => rt.routeNumber === e.target.value);
                      if (r) {
                        setEditRouteName(r.routeName);
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

              {/* Starting & Ending Points */}
              <div className="form-row-2">
                <div className="form-field">
                  <label>Starting Point *</label>
                  <input
                    type="text"
                    value={editStartPoint}
                    onChange={(e) => setEditStartPoint(e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Ending Point *</label>
                  <input
                    type="text"
                    value={editEndPoint}
                    onChange={(e) => setEditEndPoint(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Schedule Timings & Journey Duration */}
              <div className="form-row-3">
                <div className="form-field">
                  <label>Departure Time *</label>
                  <input
                    type="text"
                    value={editDepartureTime}
                    onChange={(e) => setEditDepartureTime(e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Arrival Time *</label>
                  <input
                    type="text"
                    value={editArrivalTime}
                    onChange={(e) => setEditArrivalTime(e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Journey Duration *</label>
                  <input
                    type="text"
                    value={editJourneyDuration}
                    onChange={(e) => setEditJourneyDuration(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row-3">
                <div className="form-field">
                  <label>Bus Category</label>
                  <select value={editBusType} onChange={(e) => setEditBusType(e.target.value)}>
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
                    value={editTotalSeats}
                    onChange={(e) => setEditTotalSeats(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label>Base Fare (Rs.)</label>
                  <input
                    type="number"
                    min="50"
                    max="1000"
                    value={editBaseFare}
                    onChange={(e) => setEditBaseFare(e.target.value)}
                  />
                </div>
              </div>

              <div style={{
                background: '#FEF3C7',
                border: '1px solid #FDE68A',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '12px',
                color: '#92400E',
              }}>
                ⚠️ <strong>Re-Approval Trigger:</strong> Editing this schedule will reset its status to <strong>Pending Approval</strong>. The admin must verify the changes before the updated timetable takes effect.
              </div>

              <div className="modal-action-buttons">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowEditBusModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit-bus" disabled={submittingEdit}>
                  {submittingEdit ? 'Saving Changes...' : 'Save & Resubmit for Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          3. DELETE BUS CONFIRMATION MODAL
          ======================================================== */}
      {showDeleteModal && deletingBus && (
        <div className="modal-backdrop">
          <div className="modal-dialog-card" style={{ maxWidth: '440px' }}>
            <div className="modal-head">
              <h3>Delete Bus from Fleet</h3>
              <button className="btn-close-modal" onClick={() => setShowDeleteModal(false)}>
                ✕
              </button>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete bus <strong>{deletingBus.busRegNumber}</strong> (Route {deletingBus.routeNumber}) from your operations?
              </p>
              <p style={{ fontSize: '12px', color: '#DC2626', marginTop: '10px' }}>
                This action cannot be undone. All active scheduling will be halted.
              </p>
            </div>
            <div className="modal-action-buttons" style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0' }}>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{
                  background: '#DC2626',
                  color: 'white',
                  border: 'none',
                  padding: '9px 18px',
                  borderRadius: '10px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
                onClick={handleDeleteBus}
                disabled={submittingDelete}
              >
                {submittingDelete ? 'Deleting...' : 'Yes, Delete Bus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          4. VIEW STOPS MODAL
          ======================================================== */}
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
                Route {viewingStopsBus.routeNumber} ({viewingStopsBus.routeName}) • {viewingStopsBus.startPoint || 'Start'} → {viewingStopsBus.endPoint || 'Destination'}
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

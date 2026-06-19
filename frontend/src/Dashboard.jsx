import './Dashboard.css';
import axios from 'axios';
import { useState, useEffect } from 'react';
import API_BASE from './config';

export default function Dashboard() {
  const clinician =
  JSON.parse(localStorage.getItem("clinician")) || {};
  const [stats, setStats] = useState({
    patients: 0,
    alarms: 0
  });
  const [patients, setPatients] = useState([]);
  const [monitoringData, setMonitoringData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [patientsLoaded, setPatientsLoaded] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [showPatientList, setShowPatientList] = useState(false);
  const [newPatient, setNewPatient] = useState({
    full_name: '',
    age: '',
    gender: '',
    bed_number: '',
    contact_number: ''
  });
  const [formMessage, setFormMessage] = useState('');

  useEffect(() => {
loadMonitoringData();
  loadAlerts();

  const interval = setInterval(() => {
    loadMonitoringData();
    loadAlerts();
  }, 5000);

  return () => clearInterval(interval);
}, []);


  const loadPatients = async () => {
    setLoadingPatients(true);
    try {
      const response = await axios.get(`${API_BASE}/patient`);
      setPatients(response.data);
      setPatientsLoaded(true);
      setStats((current) => ({
        ...current,
        patients: response.data.length
      }));
    } catch (error) {
      console.error('Failed to load patients:', error);
      setPatients([]);
      setPatientsLoaded(true);
    } finally {
      setLoadingPatients(false);
    }
  };

  const loadMonitoringData = async () => {
  try {
    const response = await axios.get(
      `${API_BASE}/patient/monitoring/all`
    );

    setMonitoringData(response.data);

    setStats((current) => ({
      ...current,
      patients: response.data.length
    }));

  } catch (err) {
    console.error(err);
  }
};

const loadAlerts = async () => {
  try {
    const response = await axios.get(
      `${API_BASE}/alert`
    );

    setAlerts(response.data);

    setStats((current) => ({
      ...current,
      alarms: response.data.length
    }));
  } catch (err) {
    console.error(err);
  }
};

  const handlePatientInput = (name, value) => {
    setNewPatient((prev) => ({ ...prev, [name]: value }));
  };

  const submitNewPatient = async (event) => {
    event.preventDefault();
    setFormMessage('');

    if (!newPatient.full_name || !newPatient.age || !newPatient.gender || !newPatient.bed_number || !newPatient.contact_number) {
      setFormMessage('All fields (Full Name, Age, Gender, Bed Number, and Contact Number) are required.');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE}/patient`, {
        full_name: newPatient.full_name,
        age: Number(newPatient.age),
        gender: newPatient.gender,
        bed_number: newPatient.bed_number,
        contact_number: newPatient.contact_number
      });

      setFormMessage(`Patient ${response.data.full_name} admitted successfully.`);
      setNewPatient({
        full_name: '',
        age: '',
        gender: '',
        bed_number: '',
        contact_number: ''
      });
      setShowPatientForm(false);
      setShowPatientList(true);
      await loadPatients();
    } catch (error) {
      console.error('Failed to admit patient:', error);
      // Prefer backend message when available for easier debugging
      const backendMsg = error.response && error.response.data ? error.response.data : null;
      setFormMessage(backendMsg || 'Failed to admit patient. Please check your input and try again.');
    }
  };

  useEffect(() => {
    if (!patientsLoaded) {
      setStats((current) => ({ ...current, patients: 0 }));
    }
  }, [patientsLoaded]);

  const handleLogout = () => {
    localStorage.removeItem('clinician');
    window.location.hash = '#/';
  };

  const handleClearPatient = async (patientId, name) => {
    if (!window.confirm(`Are you sure you want to clear/discharge ${name}?`)) {
      return;
    }

    try {
      await axios.delete(`${API_BASE}/patient/${patientId}`);
      await loadMonitoringData();
      if (showPatientList) {
        await loadPatients();
      }
      loadAlerts();
    } catch (error) {
      console.error("Failed to clear patient:", error);
      const msg = error.response && error.response.data ? error.response.data : error.message;
      alert(`Failed to clear patient: ${msg}`);
    }
  };

  const handleClearAllAlerts = async () => {
    try {
      await axios.put(`${API_BASE}/alert/resolve-all`);
      await loadAlerts();
    } catch (error) {
      console.error("Failed to clear alarms:", error);
      alert("Failed to clear alarms");
    }
  };

  const isAdmin = clinician.role === 'Admin';
  const isDoctor = clinician.role === 'Nurse' || clinician.role === 'Admin' || clinician.role === 'Doctor';

  return (
    <div className="dashboard">
      <div className="dashboard-topbar">
        <div className="topbar-left">
          <span className="logo-icon">↗</span>
          <h1>Vital Monitoring</h1>
        </div>
        <div className="topbar-center">
          <select className="theme-select">
            <option>Slate Dark</option>
            <option>Light</option>
            <option>Dark</option>
          </select>
          <div className="status-indicator">
            <span className="dot"></span>
            Cloud: Local
          </div>
        </div>
        <div className="topbar-right">
          <div className="user-info">
            <div className="avatar">IA</div>
            <div>
              <div className="user-location">Indian Air Force Base Station</div>
              <div className="user-role">Duty Clinician</div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Terminal Out</button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-text">
              <div className="stat-label">Monitored Ward</div>
              <div className="stat-value">{stats.patients} Patients</div>
            </div>
          </div>
          <div className="stat-card warning">
            <div className="stat-icon">⚠️</div>
            <div className="stat-text">
              <div className="stat-label">Alarms Triggered</div>
              <div className="stat-value alert">{stats.alarms} Active</div>
            </div>
          </div>
        </div>
 
         <div className="monitoring-section">
           {isDoctor && (
   <div className="monitoring-grid">
 
     {monitoringData.map((patient) => {
        const isCritical = 
          (patient.heart_rate !== null && patient.heart_rate !== undefined && patient.heart_rate > 120) || 
          (patient.spo2 !== null && patient.spo2 !== undefined && patient.spo2 < 90) || 
          (patient.temperature !== null && patient.temperature !== undefined && patient.temperature > 38.5);
       const ivLevel = patient.iv_bottle_level ?? patient.iv_level ?? patient.iv ?? patient.ivBottle ?? "--";
       return (
         <div
           key={patient.patient_id}
           className={`doctor-patient-card ${isCritical ? "critical-card" : ""}`}
         >
           <div className="card-header">
             <span className="bed-badge">Bed {patient.bed_number || "N/A"}</span>
             <span className={`status-badge ${patient.device_code ? "active" : "inactive"}`}>
               <span className="dot" style={{ display: patient.device_code ? "inline-block" : "none" }}></span>
               {patient.device_code ? "Online" : "Offline"}
             </span>
           </div>

           <div className="patient-identity">
             <h3 className="patient-name">{patient.full_name}</h3>
             <span className="patient-code">{patient.patient_code}</span>
           </div>

           <div className="device-info-bar">
             <span className="chip-icon">🖲️</span>
             <span>Device: <code>{patient.device_code || "Not paired"}</code></span>
           </div>

           <div className="vitals-readout-grid">
             <div className={`vital-indicator ${patient.heart_rate > 120 ? "warning-text" : ""}`}>
               <div className="vital-label-row">
                 <span className="vital-icon">❤️</span>
                 <span>HR</span>
               </div>
               <div className="vital-value-row">
                 <span className="value">{patient.heart_rate ?? "--"}</span>
                 <span className="unit">bpm</span>
               </div>
             </div>

             <div className={`vital-indicator ${patient.spo2 < 90 ? "warning-text" : ""}`}>
               <div className="vital-label-row">
                 <span className="vital-icon">🩸</span>
                 <span>SpO2</span>
               </div>
               <div className="vital-value-row">
                 <span className="value">{patient.spo2 ?? "--"}</span>
                 <span className="unit">%</span>
               </div>
             </div>

             <div className={`vital-indicator ${patient.temperature > 38.5 ? "warning-text" : ""}`}>
               <div className="vital-label-row">
                 <span className="vital-icon">🌡️</span>
                 <span>Temp</span>
               </div>
               <div className="vital-value-row">
                 <span className="value">{patient.temperature ?? "--"}</span>
                 <span className="unit">°C</span>
               </div>
             </div>
              <div className="vital-indicator iv-bottle-card">
                <div className="vital-label-row">
                  <span className="vital-icon">💧</span>
                  <span>IV Level</span>
                </div>
                <div className="vital-value-row">
                  <span className="value">{ivLevel}</span>
                  <span className="unit">{ivLevel === "--" ? "" : "mL"}</span>
                </div>
              </div>
           </div>

           {isCritical && (
             <div className="critical-banner">
               ⚠️ CRITICAL LIMITS EXCEEDED
             </div>
           )}

            <div className="card-actions-row" style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                className="btn-live-monitor"
                style={{ flex: 1, marginTop: 0 }}
                onClick={() =>
                  (window.location.hash =
                    `#/patient/${patient.patient_id}`)
                }
              >
                Telemetry →
              </button>
              {isAdmin && (
                <button
                  className="btn-clear-patient"
                  onClick={() => handleClearPatient(patient.patient_id, patient.full_name)}
                >
                  Clear
                </button>
              )}
            </div>
         </div>
       );
     })}
 
   </div>
 )}

{isDoctor && (
  <div className="alert-panel">
    <div className="alert-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
      <h2>Active Alerts</h2>
      <button 
        className="btn-clear-alerts"
        onClick={handleClearAllAlerts}
        style={{
          background: 'transparent',
          border: '1px solid #ef4444',
          color: '#ef4444',
          padding: '6px 12px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '12px',
          transition: 'all 0.2s'
        }}
      >
        Clear Alarms
      </button>
    </div>

    {alerts.slice(0,10).map((alert) => (

      <div
        key={alert.alert_id}
        className="alert-item"
      >
        Patient: {alert.patient_code}- {alert.full_name}
        <br />
        {alert.message}
      </div>

    ))}

  </div>
)}

          {isAdmin && (
            <div className="section-header">
              <h2>Patient Management</h2>
            </div>
)}
          {isAdmin && (
          <div className="monitoring-controls">
            {isAdmin && (
            <button
              className="btn-admit"
              onClick={() => {
                setShowPatientForm((prev) => !prev);
                setShowPatientList(false);
                setFormMessage('');
    }}
  >
    + Admit New Patient
  </button>
)}
            <button
              className="btn-secondary"
              onClick={async () => {
                const show = !showPatientList;
                setShowPatientList(show);
                setShowPatientForm(false);
                setFormMessage('');
                if (show) await loadPatients();
              }}
            >
              {showPatientList ? 'Hide Existing Patients' : 'View Existing Patients'}
            </button>
          </div>
          )}

          {showPatientForm && (
            <div className="patient-form-card">
              <h3>New Patient Admission</h3>
              <form className="patient-form" onSubmit={submitNewPatient}>
                <div className="form-row">
                  <label>
                    Full Name
                    <input
                      type="text"
                      value={newPatient.full_name}
                      onChange={(e) => handlePatientInput('full_name', e.target.value)}
                      required
                    />
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    Age
                    <input
                      type="number"
                      min="0"
                      value={newPatient.age}
                      onChange={(e) => handlePatientInput('age', e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Gender
                    <select
                      value={newPatient.gender}
                      onChange={(e) => handlePatientInput('gender', e.target.value)}
                      required
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    Bed Number
                    <input
                      type="text"
                      value={newPatient.bed_number}
                      onChange={(e) => handlePatientInput('bed_number', e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Contact Number
                    <input
                      type="text"
                      value={newPatient.contact_number}
                      onChange={(e) => handlePatientInput('contact_number', e.target.value)}
                      required
                    />
                  </label>
                </div>
                {formMessage && <div className="form-message">{formMessage}</div>}
                <div className="form-actions">
                  <button type="submit" className="btn-admit form-submit">Submit Patient</button>
                  <button type="button" className="btn-secondary form-cancel" onClick={() => setShowPatientForm(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="monitoring-grid">
            {!showPatientList && !showPatientForm && (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <p>Register a new patient or view existing database records.</p>
                <p className="empty-hint">Use the buttons above to admit or view existing patients.</p>
              </div>
            )}

            {showPatientList && !patientsLoaded && (
              <div className="empty-state">
                <div className="empty-icon">⏳</div>
                <p>Loading patient records...</p>
              </div>
            )}

            {showPatientList && patientsLoaded && !loadingPatients && patients.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <p>No patient records found in the database.</p>
              </div>
            )}

            {isAdmin &&
            showPatientList &&
            !loadingPatients &&
            patients.length > 0 && (
              <div className="patient-table-wrapper">
                <table className="patient-table">
                  <thead>
                    <tr>
                      <th>Patient Code</th>
                      <th>Name</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                <tbody>
  {patients.map((patient) => (
    <tr key={patient.patient_id}>
      <td>{patient.patient_code}</td>
      <td>{patient.full_name}</td>

      <td>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() =>
              (window.location.hash =
                `#/patient/${patient.patient_id}`)
            }
            style={{ background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
          >
            View Details
          </button>
          <button
            onClick={() => handleClearPatient(patient.patient_id, patient.full_name)}
            style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', fontWeight: 600 }}
          >
            Clear
          </button>
        </div>
      </td>
    </tr>
  ))}
</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div> 
  );
}

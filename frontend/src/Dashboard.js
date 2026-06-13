import './Dashboard.css';
import axios from 'axios';
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const clinician =
  JSON.parse(localStorage.getItem("clinician")) || {};
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({
    patients: 0,
    alarms: 0,
    fluidDeficit: '0 ml'
  });
  const [patients, setPatients] = useState([]);
  const [vitals, setVitals] = useState([]);
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
  const user = JSON.parse(localStorage.getItem("clinician")) || {};
  setUserData(user);

  if (user.role === "Doctor") {
    loadMonitoringData();
    loadAlerts();

    const interval = setInterval(() => {
      loadMonitoringData();
      loadAlerts();
    }, 5000);

    return () => clearInterval(interval);
  }
}, []);

  useEffect(() => {
  loadVitals();

  const interval = setInterval(() => {
    loadVitals();
  }, 5000);

  return () => clearInterval(interval);
  }, []);

  const loadPatients = async () => {
    setLoadingPatients(true);
    try {
      const response = await axios.get('http://localhost:5000/patient');
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
      "http://localhost:5000/patient/monitoring/all"
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
      "http://localhost:5000/alert"
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

  const loadVitals = async () => {
  try {
    const response = await axios.get("http://localhost:5000/vital");
    setVitals(response.data);
  } catch (error) {
    console.error("Failed to load vitals:", error);
  }
  };

  const handlePatientInput = (name, value) => {
    setNewPatient((prev) => ({ ...prev, [name]: value }));
  };

  const submitNewPatient = async (event) => {
    event.preventDefault();
    setFormMessage('');

    if (!newPatient.full_name || !newPatient.age) {
      setFormMessage('Full name and age are required.');
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/patient', {
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

  const isAdmin = userData?.role === "Admin";
  const isDoctor = userData?.role === "Doctor";

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
          <div className="stat-card">
            <div className="stat-icon">💧</div>
            <div className="stat-text">
              <div className="stat-label">Fluid Deficit</div>
              <div className="stat-value">{stats.fluidDeficit}</div>
            </div>
          </div>
        </div>

        <div className="monitoring-section">
          {isDoctor && (
  <div className="monitoring-grid">

    {monitoringData.map((patient) => (

      <div
        key={patient.patient_id}
        className={`doctor-patient-card
${
  patient.heart_rate > 120 ||
  patient.spo2 < 90 ||
  patient.temperature > 38.5
    ? "critical-card"
    : ""
}`}
      >

        <h3>{patient.patient_code}</h3>

        <p>
          <strong>Name:</strong>
          {" "}
          {patient.full_name}
        </p>

        <p>
          <strong>Device:</strong>
          {" "}
          {patient.device_code || "Not Assigned"}
        </p>

        <p>
          <strong>Status:</strong>
          {" "}
          {patient.status || "-"}
        </p>

        <hr />

        <p>
          ❤️ HR:
          {" "}
          {patient.heart_rate ?? "--"}
        </p>

        <p>
          🩸 SpO2:
          {" "}
          {patient.spo2 ?? "--"}
        </p>

        <p>
          🌡 Temp:
          {" "}
          {patient.temperature ?? "--"}
        </p>

        <button
          onClick={() =>
            (window.location.hash =
              `#/patient/${patient.patient_id}`)
          }
        >
          Live Monitoring
        </button>

      </div>

    ))}

  </div>
)}

{isDoctor && (
  <div className="alert-panel">

    <h2>Active Alerts</h2>

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
                    />
                  </label>
                  <label>
                    Contact Number
                    <input
                      type="text"
                      value={newPatient.contact_number}
                      onChange={(e) => handlePatientInput('contact_number', e.target.value)}
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
        {isAdmin && (
          <button
            onClick={() =>
              (window.location.hash =
                `#/patient/${patient.patient_id}`)
            }
          >
            View Details
          </button>
        )}
      </td>
    </tr>
  ))}
</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        {isAdmin && (
        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            <button className="action-btn">View Patient Records</button>
            <button className="action-btn">Manage Alarms</button>
            <button className="action-btn">Generate Reports</button>
            <button className="action-btn">Settings</button>
          </div>
        </div>
      )}
      </div>
    </div> 
  );
}

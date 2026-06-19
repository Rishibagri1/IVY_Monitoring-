import "./PatientDetails.css";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import API_BASE from "./config";

export default function PatientDetails({ patientId }) {
  const clinician = JSON.parse(localStorage.getItem("clinician")) || {};
  const isAdmin = clinician.role === 'Admin';
  const [patient, setPatient] = useState(null);
  const [device, setDevice] = useState(null);
  const [deviceCode, setDeviceCode] = useState("");
  const [latestVital, setLatestVital] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const loadData = useCallback(async () => {
    try {
      const patientRes = await axios.get(`${API_BASE}/patient/${patientId}`);
      setPatient(patientRes.data);

      const vitalRes = await axios.get(`${API_BASE}/vital/latest/${patientId}`);
      setLatestVital(vitalRes.data);

      const deviceRes = await axios.get(`${API_BASE}/device/patient/${patientId}`);
      if (deviceRes.data && deviceRes.data.length > 0) {
        setDevice(deviceRes.data[0]);
      }

      const alertRes = await axios.get(`${API_BASE}/alert/${patientId}`);
      setAlerts(alertRes.data);
    } catch (err) {
      console.error("Load Data Error:", err);
    }
  }, [patientId]);

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      loadData();
    }, 5000);

    return () => clearInterval(interval);
  }, [loadData]);

  const assignDevice = async () => {
    try {
      await axios.post(`${API_BASE}/device/assign`, {
        patient_id: patientId,
        device_code: deviceCode,
      });
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  if (!patient) return <h2>Loading...</h2>;

  return (
    <div className="patient-details-container">
      <div className="patient-details-header">
        <div>
          <p className="patient-context">Patient Monitoring</p>
          <h1 className="patient-details-title">{patient.full_name}</h1>
          <p className="patient-subtitle">{patient.patient_code} · Bed {patient.bed_number || "N/A"}</p>
        </div>
        <button className="back-btn" onClick={() => (window.location.hash = "#/dashboard")}>← Back to Dashboard</button>
      </div>

      <div className="patient-details-grid">
        <div className="info-card patient-overview-card">
          <h2>Patient Information</h2>
          <div className="info-row"><span>Name</span><span>{patient.full_name}</span></div>
          <div className="info-row"><span>Age</span><span>{patient.age}</span></div>
          <div className="info-row"><span>Gender</span><span>{patient.gender}</span></div>
          <div className="info-row"><span>Bed Number</span><span>{patient.bed_number}</span></div>
          <div className="info-row"><span>Contact</span><span>{patient.contact_number}</span></div>
        </div>

        <div className="info-card patient-device-card">
          <h2>Device Information</h2>
          {isAdmin && (
            <div className="device-assign">
              <input
                type="text"
                placeholder="ESP001"
                value={deviceCode}
                onChange={(e) => setDeviceCode(e.target.value)}
              />
              <button className="assign-btn" onClick={assignDevice}>Assign Device</button>
            </div>
          )}
          <div className="info-row"><span>Device Code</span><span>{device ? device.device_code : "Not Assigned"}</span></div>
          <div className="info-row"><span>Status</span><span>{device ? device.status : "Offline"}</span></div>
        </div>
      </div>

      <div className="patient-details-grid patient-details-grid--stacked">
        <div className="info-card latest-vitals-card">
          <h2>Latest Vitals</h2>
          {latestVital ? (
            <div className="latest-vitals-grid">
              <div className="vital-block">
                <span className="vital-label">Heart Rate</span>
                <span className="vital-value">{latestVital.heart_rate ?? "--"}</span>
                <span className="vital-unit">bpm</span>
              </div>
              <div className="vital-block">
                <span className="vital-label">SpO2</span>
                <span className="vital-value">{latestVital.spo2 ?? "--"}</span>
                <span className="vital-unit">%</span>
              </div>
              <div className="vital-block">
                <span className="vital-label">Temperature</span>
                <span className="vital-value">{latestVital.temperature ?? "--"}</span>
                <span className="vital-unit">°C</span>
              </div>
              <div className="vital-block">
                <span className="vital-label">IV Level</span>
                <span className="vital-value">{latestVital.iv_level ?? "--"}</span>
                <span className="vital-unit">{latestVital.iv_level !== null && latestVital.iv_level !== undefined ? "mL" : ""}</span>
              </div>
            </div>
          ) : (
            <p className="empty-message">No vitals available at this time.</p>
          )}
          {latestVital && <p className="updated-text">Updated: {new Date(latestVital.recorded_at).toLocaleString()}</p>}
        </div>

        <div className="info-card alert-history-card">
          <h2>Alert History</h2>
          {alerts.length === 0 ? (
            <p className="empty-message">No alerts recorded.</p>
          ) : (
            alerts.map((alert) => (
              <div key={alert.alert_id} className="alert-item">
                <span className="alert-type">{alert.alert_type}</span>
                <span className="alert-time">{new Date(alert.alert_time).toLocaleString()}</span>
                <p>{alert.message}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

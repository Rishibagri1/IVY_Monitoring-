import "./PatientDetails.css";
import { useEffect, useState } from "react";
import axios from "axios";

export default function PatientDetails({ patientId }) {
  const clinician =
  JSON.parse(localStorage.getItem("clinician")) || {};
  const [patient, setPatient] = useState(null);
  const [device, setDevice] = useState(null);
  const [deviceCode, setDeviceCode] = useState("");
  const [latestVital, setLatestVital] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
  loadData();

  const interval = setInterval(() => {
    loadData();
  }, 5000);

  return () => clearInterval(interval);
}, [patientId]);

  const assignDevice = async () => {
  try {
    await axios.post(
      "http://localhost:5000/device/assign",
      {
        patient_id: patientId,
        device_code: deviceCode
      }
    );

    window.location.reload();
  } catch (err) {
    console.error(err);
  }
};

  const loadData = async () => {
  try {
    // Patient Info
    const patientRes = await axios.get(
      `http://localhost:5000/patient/${patientId}`
    );
    setPatient(patientRes.data);

    // Latest Vital
    const vitalRes = await axios.get(
      `http://localhost:5000/vital/latest/${patientId}`
    );
    setLatestVital(vitalRes.data);

    // Device Info
    const deviceRes = await axios.get(
      `http://localhost:5000/device/patient/${patientId}`
    );

    if (deviceRes.data && deviceRes.data.length > 0) {
      setDevice(deviceRes.data[0]);
    }

    const alertRes = await axios.get(
  `http://localhost:5000/alert/${patientId}`
);

      setAlerts(alertRes.data);
  } catch (err) {
    console.error("Load Data Error:", err);
  }
};
  if (!patient) return <h2>Loading...</h2>;

  return (
    <div className="patient-details-container">

      <h1 className="patient-details-title">
        Patient Details
      </h1>

      <button
        onClick={() => (window.location.hash = "#/dashboard")}
      >
        Back to Dashboard
      </button>

      <div className="info-card">
        <h2>Patient Information</h2>
        
        <p>Name: {patient.full_name}</p>
        <p>Age: {patient.age}</p>
        <p>Gender: {patient.gender}</p>
        <p>Bed Number: {patient.bed_number}</p>
        <p>Contact: {patient.contact_number}</p>
      </div>

      <div className="info-card">
        <h2>Device Information</h2>

       {clinician.role === "Admin" && (
  <>
    <h3>Assign Device</h3>

    <input
      type="text"
      placeholder="ESP001"
      value={deviceCode}
      onChange={(e) => setDeviceCode(e.target.value)}
    />

    <button onClick={assignDevice}>
      Assign Device
    </button>
  </>
)}

        <p>
          Device Code:
          {" "}
          {device ? device.device_code : "Not Assigned"}
        </p>

        <p>
          Status:
          {" "}
          {device ? device.status : "-"}
        </p>
      </div>

      <div className="info-card">

  <h2>Latest Vitals</h2>

  {latestVital ? (
    <>
      <p>Heart Rate: {latestVital.heart_rate}</p>
      <p>SpO2: {latestVital.spo2}</p>
      <p>Temperature: {latestVital.temperature}</p>
      <p>
        Updated:
        {new Date(
          latestVital.recorded_at
        ).toLocaleString()}
      </p>
    </>
  ) : (
    <p>No Vitals Available</p>
  )}

</div>
<div className="info-card">

  <h2>Alert History</h2>

  {alerts.length === 0 ? (
    <p>No Alerts</p>
  ) : (
    alerts.map((alert) => (
      <p key={alert.alert_id}>
        {alert.alert_type} -
        {" "}
        {new Date(alert.alert_time).toLocaleString()}
      </p>
    ))
  )}

</div>
    </div>
  );
}
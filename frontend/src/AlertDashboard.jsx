import { useEffect, useState } from "react";
import axios from "axios";
import API_BASE from "./config";

function AlertDashboard() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    axios
      .get(`${API_BASE}/alert`)
      .then((res) => setAlerts(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="patient-details-container">
      <h1>Alert Dashboard</h1>

      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>Patient ID</th>
            <th>Alert Type</th>
            <th>Message</th>
            <th>Time</th>
          </tr>
        </thead>

        <tbody>
          {alerts.map((alert) => (
            <tr key={alert.alert_id}>
              <td>{alert.patient_id}</td>
              <td>{alert.alert_type}</td>
              <td>{alert.message}</td>
              <td>
                {new Date(
                  alert.alert_time || alert.created_at
                ).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AlertDashboard;
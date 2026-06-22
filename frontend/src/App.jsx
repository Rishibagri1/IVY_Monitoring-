import axios from "axios";
import API_BASE from "./config";
import { useState, useEffect } from 'react';
import './App.css';
import Navigation from './Navigation';
import Home from './Home';
import Dashboard from './Dashboard';
import Register from './Register';
import PatientDetails from "./PatientDetails";

function LoginPage() {
  const [userid, setUserid] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event) => {
  event.preventDefault();

  try {
    const response = await axios.post(
      `${API_BASE}/user/login`,
      {
        userid,
        password
      }
    );

    localStorage.setItem(
      "clinician",
      JSON.stringify(response.data)
    );

    window.location.hash = "#/dashboard";

  } catch (err) {
    alert("Invalid User ID or Password");
  }
};

  return (
    <div className="App">
      <div className="screen">
        <div className="dashboard-card">
          <div className="dashboard-header">
            <div className="dashboard-icon">↗</div>
            <div>
              <h1>Vital Monitoring</h1>
              <p>Access the clinical telemetry network</p>
            </div>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              USER ID
              <div className="input-group">
                <span className="input-icon">👤</span>
                <input
                  type="number"
                  placeholder="Enter User ID"
                  value={userid}
                  onChange={(e) => setUserid(e.target.value)}
                  required
                />
              </div>
            </label>

            <label>
              PASSWORD
              <div className="input-group">
                <span className="input-icon">🔒</span>
                <input
                  type="password"
                  placeholder="Enter your passcode"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </label>

            <button type="submit" className="primary-button">
              Authorize System →
            </button>
          </form>

          <div className="dashboard-footer">
            <span>New clinician?</span>
            <a href="#/register">Create Account</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || '/');
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.slice(1) || '/';
      setRoute(hash);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Wake up the Render backend on app load (free tier sleeps after 15 min).
  // This silent ping gives the server ~30s to wake up before the user logs in.
  useEffect(() => {
    axios.get(`${API_BASE}/check`).catch(() => {});
  }, []);

  // Render content based on route
  let content;

  if (route.startsWith("/patient/")) {
    const clinician = JSON.parse(localStorage.getItem("clinician")) || {};

    if (!clinician.userid && !clinician.full_name) {
      content = (
        <h2 style={{padding:"20px"}}>
          Access Denied - Please Login
        </h2>
      );
    } else {
      const patientId = route.split("/")[2];
      content = (
        <PatientDetails patientId={patientId} theme={theme} setTheme={setTheme} />
      );
    }
  } else {
    switch (route) {
      case '/':
        content = <Home theme={theme} setTheme={setTheme} />;
        break;

      case '/login':
        content = <LoginPage theme={theme} setTheme={setTheme} />;
        break;

      case '/register':
        content = <Register theme={theme} setTheme={setTheme} />;
        break;

      case '/dashboard':
        content = <Dashboard theme={theme} setTheme={setTheme} />;
        break;

      default:
        content = <Home theme={theme} setTheme={setTheme} />;
    }
  }

  // Navigation is shown on all pages except dashboard and patient detail pages
  return (
    <div>
      {route !== "/dashboard" &&
       !route.startsWith("/patient/") && (
        <Navigation theme={theme} setTheme={setTheme} />
      )}

      {content}
    </div>
  );
}

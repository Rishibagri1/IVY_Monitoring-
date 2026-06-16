import { useState } from 'react';
import axios from 'axios';
import API_BASE from './config';
import './App.css';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [userid, setUserid] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 4) {
      alert('Password must be at least 4 characters');
      return;
    }

    try {
      const resp = await axios.post(`${API_BASE}/user`, {
        full_name: fullName,
        userid: userid,
        password,
      });

      // Save clinician info locally and navigate
      const created = resp.data;
      localStorage.setItem('clinician', JSON.stringify({
        full_name: created.full_name,
        userid: created.userid,
        role: created.role,
      }));

      window.location.hash = '#/dashboard';
    } catch (err) {
      const msg = err.response && err.response.data ? err.response.data : err.message;
      alert(`Registration failed: ${msg}`);
    }
  };

  return (
    <div className="App">
      <div className="screen">
        <div className="dashboard-card">
          <div className="dashboard-header">
            <div className="dashboard-icon">↗</div>
            <div>
              <h1>Vital Monitoring </h1>
              <p>Register your credentials to get access</p>
            </div>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              FULL NAME
              <div className="input-group">
                <span className="input-icon">🛡️</span>
                <input
                  type="text"
                  placeholder="Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </label>

            <label>
              USER ID
              <div className="input-group">
                <span className="input-icon">📧</span>
                <input
                  type="number"
                  placeholder="User ID"
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
                  placeholder="Minimum 4 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </label>

          
            <button type="submit" className="primary-button">
              Register Credentials ✚
            </button>
          </form>

          <div className="dashboard-footer">
            <span>Already registered?</span>
            <a href="#/login">Sign In</a>
          </div>
        </div>
      </div>
    </div>
  );
}

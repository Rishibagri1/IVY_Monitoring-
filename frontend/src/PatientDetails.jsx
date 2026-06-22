import "./PatientDetails.css";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import API_BASE from "./config";

// TelemetryChart component to draw real-time SVG curves
function TelemetryChart({ title, data, dataKey, lowThreshold, highThreshold, unit, icon, strokeColorDefault = "#22d3ee", gradientId, isHero = false, onClick, isActive = false }) {
  if (!data || data.length < 2) {
    return (
      <div className={`trend-chart-container ${isHero ? "hero" : "card"} ${isActive ? "active" : ""}`} onClick={onClick}>
        <div className="trend-chart-header">
          <span className="trend-chart-title"><span className="trend-icon">{icon}</span> {title}</span>
        </div>
        <div className="trend-chart-empty">
          Awaiting telemetry data stream...
        </div>
      </div>
    );
  }

  // 1. Sort data chronologically and extract clean values
  const sorted = [...data]
    .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
    .slice(isHero ? -30 : -20); // Take more readings for Hero view

  const points = sorted
    .map(d => Number(d[dataKey]))
    .filter(val => !isNaN(val));

  if (points.length < 2) {
    return (
      <div className={`trend-chart-container ${isHero ? "hero" : "card"} ${isActive ? "active" : ""}`} onClick={onClick}>
        <div className="trend-chart-header">
          <span className="trend-chart-title"><span className="trend-icon">{icon}</span> {title}</span>
        </div>
        <div className="trend-chart-empty">
          Awaiting telemetry data stream...
        </div>
      </div>
    );
  }

  const latestVal = points[points.length - 1];
  
  // Check if latest reading crosses thresholds
  const isTooLow = lowThreshold !== undefined && latestVal < lowThreshold;
  const isTooHigh = highThreshold !== undefined && latestVal > highThreshold;
  const isCritical = isTooLow || isTooHigh;
  
  const strokeColor = isCritical ? "#ef4444" : strokeColorDefault;

  // 2. Define coordinate system dynamically
  const width = isHero ? 800 : 500;
  const height = isHero ? 250 : 160;
  
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = isHero ? 35 : 20; // more room for X-axis labels in hero

  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  // 3. Find dynamic Y bounds (include threshold lines in viewport bounds)
  let yMin = Math.min(...points, lowThreshold !== undefined ? lowThreshold : Infinity);
  let yMax = Math.max(...points, highThreshold !== undefined ? highThreshold : -Infinity);

  const rangeBuffer = (yMax - yMin) * 0.15 || 4;
  yMin = Math.floor(yMin - rangeBuffer);
  yMax = Math.ceil(yMax + rangeBuffer);

  if (yMin === yMax) {
    yMin -= 10;
    yMax += 10;
  }

  // 4. Map values to SVG coordinates
  const coords = points.map((val, idx) => {
    const cx = paddingLeft + (idx / (points.length - 1)) * plotWidth;
    const cy = paddingTop + plotHeight - ((val - yMin) / (yMax - yMin)) * plotHeight;
    return { cx, cy };
  });

  // 5. Generate path string
  let linePath = "";
  coords.forEach((coord, idx) => {
    if (idx === 0) {
      linePath += `M ${coord.cx} ${coord.cy}`;
    } else {
      linePath += ` L ${coord.cx} ${coord.cy}`;
    }
  });

  // Generate area path for shading underneath
  const firstCoord = coords[0];
  const lastCoord = coords[coords.length - 1];
  const baselineY = paddingTop + plotHeight;
  const areaPath = `${linePath} L ${lastCoord.cx} ${baselineY} L ${firstCoord.cx} ${baselineY} Z`;

  // Draw threshold lines
  let highThresholdY = null;
  if (highThreshold !== undefined && highThreshold <= yMax && highThreshold >= yMin) {
    highThresholdY = paddingTop + plotHeight - ((highThreshold - yMin) / (yMax - yMin)) * plotHeight;
  }

  let lowThresholdY = null;
  if (lowThreshold !== undefined && lowThreshold <= yMax && lowThreshold >= yMin) {
    lowThresholdY = paddingTop + plotHeight - ((lowThreshold - yMin) / (yMax - yMin)) * plotHeight;
  }

  // Dynamic status text
  let statusText = "Normal";
  if (isTooLow) statusText = "Low";
  if (isTooHigh) statusText = "High";

  // Grid subdivisions
  const gridCountX = isHero ? 12 : 8;
  const gridCountY = isHero ? 6 : 4;

  return (
    <div 
      className={`trend-chart-container ${isHero ? "hero" : "card"} ${isActive ? "active" : ""} ${isCritical ? "critical-border" : ""}`} 
      onClick={onClick}
    >
      <div className="trend-chart-header">
        <span className="trend-chart-title">
          <span className="trend-icon">{icon}</span>
          {title} {isHero && <span className="hero-badge">Hero View</span>}
        </span>
        <span className={`trend-chart-value ${isCritical ? "critical" : ""}`}>
          {latestVal.toFixed(1)} <span className="trend-unit">{unit}</span>
          <span className="trend-status"> ({statusText})</span>
        </span>
      </div>

      <div className="svg-container">
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
          <defs>
            <linearGradient id={`${gradientId}-${isHero ? 'hero' : 'card'}-normal`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColorDefault} stopOpacity="0.35" />
              <stop offset="100%" stopColor={strokeColorDefault} stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id={`${gradientId}-${isHero ? 'hero' : 'card'}-critical`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Vertical Grid Lines */}
          {Array.from({ length: gridCountX + 1 }).map((_, idx) => {
            const ratio = idx / gridCountX;
            const gx = paddingLeft + ratio * plotWidth;
            return (
              <line
                key={`grid-v-${idx}`}
                x1={gx}
                y1={paddingTop}
                x2={gx}
                y2={paddingTop + plotHeight}
                stroke="rgba(91, 143, 255, 0.04)"
                strokeWidth="1"
              />
            );
          })}

          {/* Horizontal Grid Lines */}
          {Array.from({ length: gridCountY + 1 }).map((_, idx) => {
            const ratio = idx / gridCountY;
            const gy = paddingTop + ratio * plotHeight;
            const val = yMax - ratio * (yMax - yMin);
            return (
              <g key={`grid-h-${idx}`} className="chart-grid-line">
                <line x1={paddingLeft} y1={gy} x2={width - paddingRight} y2={gy} stroke="rgba(91, 143, 255, 0.04)" strokeWidth="1" />
                <text x={paddingLeft - 8} y={gy + 3} textAnchor="end" fill="#8db3d4" fontSize="9px">
                  {Math.round(val)}
                </text>
              </g>
            );
          })}

          {/* High Threshold Guide Line */}
          {highThresholdY !== null && (
            <g className="chart-threshold-guide high">
              <line x1={paddingLeft} y1={highThresholdY} x2={width - paddingRight} y2={highThresholdY} stroke="rgba(239, 68, 68, 0.4)" strokeDasharray="4 4" strokeWidth="1.5" />
              <text x={width - paddingRight - 4} y={highThresholdY - 4} textAnchor="end" fill="#ef4444" fontSize="9px" fontWeight="600">
                High Limit ({highThreshold})
              </text>
            </g>
          )}

          {/* Low Threshold Guide Line */}
          {lowThresholdY !== null && (
            <g className="chart-threshold-guide low">
              <line x1={paddingLeft} y1={lowThresholdY} x2={width - paddingRight} y2={lowThresholdY} stroke="rgba(239, 68, 68, 0.4)" strokeDasharray="4 4" strokeWidth="1.5" />
              <text x={width - paddingRight - 4} y={lowThresholdY - 4} textAnchor="end" fill="#ef4444" fontSize="9px" fontWeight="600">
                Low Limit ({lowThreshold})
              </text>
            </g>
          )}

          {/* Shaded Area Path */}
          <path d={areaPath} fill={`url(#${gradientId}-${isHero ? 'hero' : 'card'}-${isCritical ? "critical" : "normal"})`} />

          {/* Line Path */}
          <path d={linePath} fill="none" stroke={strokeColor} strokeWidth={isHero ? "3.5" : "2.5"} strokeLinecap="round" strokeLinejoin="round" />

          {/* Live pulsing dot on the latest value */}
          {lastCoord && (
            <g className="chart-live-dot">
              <circle cx={lastCoord.cx} cy={lastCoord.cy} r={isHero ? "9" : "7"} fill={strokeColor} opacity="0.3" className="pulse-ring" />
              <circle cx={lastCoord.cx} cy={lastCoord.cy} r={isHero ? "5" : "4"} fill={strokeColor} />
            </g>
          )}

          {/* X-axis time labels (Hero view only) */}
          {isHero && sorted.map((d, idx) => {
            if (idx % 4 === 0 || idx === sorted.length - 1) {
              const date = new Date(d.recorded_at);
              const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const cx = paddingLeft + (idx / (points.length - 1)) * plotWidth;
              return (
                <text key={`label-${idx}`} x={cx} y={paddingTop + plotHeight + 15} textAnchor="middle" fill="#8db3d4" fontSize="8.5px">
                  {timeStr}
                </text>
              );
            }
            return null;
          })}
        </svg>
      </div>
    </div>
  );
}

export default function PatientDetails({ patientId }) {
  const clinician = JSON.parse(localStorage.getItem("clinician")) || {};
  const isAdmin = clinician.role === 'Admin';
  const [patient, setPatient] = useState(null);
  const [device, setDevice] = useState(null);
  const [deviceCode, setDeviceCode] = useState("");
  const [latestVital, setLatestVital] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [vitalsHistory, setVitalsHistory] = useState([]);
  const [activeHero, setActiveHero] = useState("heart_rate");

  const vitalsConfigs = {
    heart_rate: {
      key: "heart_rate",
      title: "Heart Rate History",
      lowThreshold: 60,
      highThreshold: 120,
      unit: "bpm",
      icon: "❤️",
      strokeColorDefault: "#22d3ee",
      gradientId: "hr-gradient"
    },
    spo2: {
      key: "spo2",
      title: "SpO2 History",
      lowThreshold: 90,
      unit: "%",
      icon: "🩸",
      strokeColorDefault: "#10b981",
      gradientId: "spo2-gradient"
    },
    temperature: {
      key: "temperature",
      title: "Temperature History",
      lowThreshold: 35.0,
      highThreshold: 38.0,
      unit: "°C",
      icon: "🌡️",
      strokeColorDefault: "#f59e0b",
      gradientId: "temp-gradient"
    },
    iv_level: {
      key: "iv_level",
      title: "IV Fluid History",
      lowThreshold: 100,
      unit: "mL",
      icon: "💧",
      strokeColorDefault: "#3b82f6",
      gradientId: "iv-gradient"
    }
  };

  const loadData = useCallback(async () => {
    try {
      const patientRes = await axios.get(`${API_BASE}/patient/${patientId}`);
      setPatient(patientRes.data);

      const vitalRes = await axios.get(`${API_BASE}/vital/latest/${patientId}`);
      setLatestVital(vitalRes.data);

      const historyRes = await axios.get(`${API_BASE}/vital/${patientId}`);
      setVitalsHistory(historyRes.data || []);

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

      <div className="info-card vital-trends-card" style={{ marginTop: '32px' }}>
        <h2>Telemetry Trends</h2>
        
        {/* Large Hero Chart Display */}
        <div className="hero-chart-section">
          {vitalsConfigs[activeHero] && (
            <TelemetryChart
              title={vitalsConfigs[activeHero].title}
              data={vitalsHistory}
              dataKey={vitalsConfigs[activeHero].key}
              lowThreshold={vitalsConfigs[activeHero].lowThreshold}
              highThreshold={vitalsConfigs[activeHero].highThreshold}
              unit={vitalsConfigs[activeHero].unit}
              icon={vitalsConfigs[activeHero].icon}
              strokeColorDefault={vitalsConfigs[activeHero].strokeColorDefault}
              gradientId={vitalsConfigs[activeHero].gradientId}
              isHero={true}
            />
          )}
        </div>

        {/* 4 Clickable Grid Cards */}
        <div className="trends-grid trends-grid--four">
          {Object.values(vitalsConfigs).map((cfg) => (
            <TelemetryChart
              key={cfg.key}
              title={cfg.title}
              data={vitalsHistory}
              dataKey={cfg.key}
              lowThreshold={cfg.lowThreshold}
              highThreshold={cfg.highThreshold}
              unit={cfg.unit}
              icon={cfg.icon}
              strokeColorDefault={cfg.strokeColorDefault}
              gradientId={cfg.gradientId}
              isHero={false}
              isActive={activeHero === cfg.key}
              onClick={() => setActiveHero(cfg.key)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

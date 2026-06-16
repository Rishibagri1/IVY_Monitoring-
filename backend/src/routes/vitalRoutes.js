const express = require("express");
const router = express.Router();
const pool = require("../config/db");



// add vitals
router.post("/", async (req, res) => {
  try {
    const { patient_id, heart_rate, spo2, temperature, iv_level } = req.body;

    console.log("Incoming vital data:", req.body);

    if (!patient_id) {
      return res.status(400).send("patient_id is required");
    }

    // 1. Ensure the patient exists (auto-create if missing to match device settings)
    const patientCheck = await pool.query(
      "SELECT patient_id FROM patients WHERE patient_id = $1",
      [patient_id]
    );

    if (patientCheck.rows.length === 0) {
      console.log(`Patient ID ${patient_id} not found. Auto-creating...`);
      await pool.query(
        `INSERT INTO patients (patient_id, patient_code, full_name, age, gender, bed_number, contact_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (patient_id) DO NOTHING`,
        [
          patient_id,
          `P-AUTO-${patient_id}`,
          `IAF Patient ${patient_id} (Auto)`,
          30,
          "Male",
          `Bed ${patient_id}`,
          "000-000-0000"
        ]
      );
    }

    // 2. Ensure device is registered for this patient so they show up as "Online"
    const deviceCheck = await pool.query(
      "SELECT device_id FROM devices WHERE patient_id = $1",
      [patient_id]
    );
    if (deviceCheck.rows.length === 0) {
      console.log(`No device paired for patient ID ${patient_id}. Auto-creating device...`);
      await pool.query(
        `INSERT INTO devices (patient_id, device_code, status)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [patient_id, `ESP32-DEV-${patient_id}`, "active"]
      );
    }

    // 3. Insert vital records
    const result = await pool.query(
      `INSERT INTO vitals (patient_id, heart_rate, spo2, temperature, iv_level) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [patient_id, heart_rate, spo2, temperature, iv_level]
    );
    
    // Alert Generation
    const existingAlert = await pool.query(
      `SELECT *
       FROM alerts
       WHERE patient_id = $1
       AND alert_type = 'HIGH_HEART_RATE'
       AND alert_time > NOW() - INTERVAL '1 minute'`,
      [patient_id]
    );

    if (heart_rate > 120 && existingAlert.rows.length === 0) {
      await pool.query(
        `INSERT INTO alerts (patient_id, alert_type, message)
         VALUES ($1, $2, $3)`,
        [patient_id, "HIGH_HEART_RATE", "Heart rate exceeded threshold"]
      );
    }

    if (temperature > 38.0 || (temperature < 35.0 && temperature > 0.0)) {
      await pool.query(
        `INSERT INTO alerts (patient_id, alert_type, message) VALUES ($1, $2, $3)`,
        [patient_id, "HIGH_TEMPERATURE", "High body temperature detected"]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error in POST /vital:", err);
    res.status(500).send(err.message);
  }
});


// all vitals
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM vitals");
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

router.get("/latest/:patientId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM vitals
       WHERE patient_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [req.params.patientId]
    );

    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// GET /vital/:patientId
router.get("/:patientId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM vitals WHERE patient_id = $1",
      [req.params.patientId]
    );

    res.json(result.rows);
  } catch (err) {
  console.error(err);
  res.status(500).send(err.message);
}
});

module.exports = router;
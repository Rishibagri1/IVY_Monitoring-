const express = require("express");
const router = express.Router();
const pool = require("../config/db");



// add vitals
router.post("/", async (req, res) => {
  try {
    const { patient_id, device_code, heart_rate, spo2, temperature, iv_level } = req.body;

    console.log("Incoming vital data:", req.body);

    let targetPatientId = patient_id;

    // 1. If device_code is provided, lookup the associated patient
    if (device_code) {
      const deviceCheck = await pool.query(
        "SELECT patient_id FROM devices WHERE device_code = $1",
        [device_code]
      );
      if (deviceCheck.rows.length > 0 && deviceCheck.rows[0].patient_id) {
        targetPatientId = deviceCheck.rows[0].patient_id;
      }
    }

    // 2. Verify target patient exists
    let patientExists = false;
    if (targetPatientId) {
      const patientCheck = await pool.query(
        "SELECT patient_id FROM patients WHERE patient_id = $1",
        [targetPatientId]
      );
      if (patientCheck.rows.length > 0) {
        patientExists = true;
      }
    }

    // 3. Fallback: If target patient does not exist, and there is exactly ONE patient in the DB,
    // automatically map the vitals to that single active patient.
    if (!patientExists) {
      const allPatients = await pool.query("SELECT patient_id, full_name FROM patients");
      if (allPatients.rows.length === 1) {
        targetPatientId = allPatients.rows[0].patient_id;
        patientExists = true;
        console.log(`Fallback mapping: routed vitals to the single active patient (ID: ${targetPatientId}, Name: ${allPatients.rows[0].full_name})`);
      }
    }

    if (!patientExists) {
      return res.status(404).send(`Patient with ID ${targetPatientId || "unknown"} does not exist and no single patient fallback is available.`);
    }

    // 3. Insert vital records
    const result = await pool.query(
      `INSERT INTO vitals (patient_id, heart_rate, spo2, temperature, iv_level) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [targetPatientId, heart_rate, spo2, temperature, iv_level]
    );
    
    // Alert Generation
    const existingAlert = await pool.query(
      `SELECT *
       FROM alerts
       WHERE patient_id = $1
       AND alert_type = 'HIGH_HEART_RATE'
       AND alert_time > NOW() - INTERVAL '1 minute'`,
      [targetPatientId]
    );

    if (heart_rate > 120 && existingAlert.rows.length === 0) {
      await pool.query(
        `INSERT INTO alerts (patient_id, alert_type, message)
         VALUES ($1, $2, $3)`,
        [targetPatientId, "HIGH_HEART_RATE", "Heart rate exceeded threshold"]
      );
    }

    if (temperature > 38.0 || (temperature < 35.0 && temperature > 0.0)) {
      await pool.query(
        `INSERT INTO alerts (patient_id, alert_type, message) VALUES ($1, $2, $3)`,
        [targetPatientId, "HIGH_TEMPERATURE", "High body temperature detected"]
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
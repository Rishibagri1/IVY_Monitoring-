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
      } else {
        return res.status(400).send(`Device ${device_code} is not assigned to any active patient.`);
      }
    }

    if (!targetPatientId) {
      return res.status(400).send("patient_id or device_code is required");
    }

    // 2. Verify patient exists in database (No auto-creation!)
    const patientCheck = await pool.query(
      "SELECT patient_id FROM patients WHERE patient_id = $1",
      [targetPatientId]
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).send(`Patient with ID ${targetPatientId} does not exist. Vitals ignored.`);
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
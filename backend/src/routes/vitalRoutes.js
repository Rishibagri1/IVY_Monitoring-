const express = require("express");
const router = express.Router();
const pool = require("../config/db");



// add vitals
router.post("/", async (req, res) => {
  try {
    const { patient_id, heart_rate, spo2, temperature, iv_level } = req.body;

    console.log(req.body);

    const result = await pool.query(
      `INSERT INTO vitals (patient_id, heart_rate, spo2, temperature, iv_level) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [patient_id, heart_rate, spo2, temperature, iv_level]
    );
    
     // Alert Generation
    const existingAlert = await pool.query(
`
SELECT *
FROM alerts
WHERE patient_id = $1
AND alert_type = 'HIGH_HEART_RATE'
AND alert_time >
NOW() - INTERVAL '1 minute'
`,
[patient_id]
);

if (
heart_rate > 120 &&
existingAlert.rows.length === 0
){
  await pool.query(
`
INSERT INTO alerts
(patient_id, alert_type, message)
VALUES
($1,$2,$3)
`,
[
patient_id,
"HIGH_HEART_RATE",
"Heart rate exceeded threshold"
]
);
}
 if (temperature > 38.0 || (temperature < 35.0 && temperature > 0.0)) {
  await pool.query(
    `INSERT INTO alerts (patient_id, alert_type, message) VALUES ($1, $2, $3)`,
    [patient_id, "HIGH_TEMPERATURE", "High body temperature detected"]
  );
}

if (weight > 10000.0) { 
  await pool.query(
    `INSERT INTO alerts (patient_id, alert_type, message) VALUES ($1, $2, $3)`,
    [patient_id, "HIGH_WEIGHT", "Weight limit exceeded threshold"]
  );
}

res.json(result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
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
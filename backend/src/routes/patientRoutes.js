const express = require("express");
const router = express.Router();
const pool = require("../config/db");



// 1. GET all patients
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM patients");
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

router.get("/monitoring/all", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.patient_id,
        p.patient_code,
        p.full_name,
        d.device_code,
        d.status,

        v.heart_rate,
        v.spo2,
        v.temperature,
        v.iv_level,
        v.recorded_at

      FROM patients p

      LEFT JOIN devices d
      ON p.patient_id = d.patient_id

      LEFT JOIN (
        SELECT DISTINCT ON (patient_id)
        *
        FROM vitals
        ORDER BY patient_id, recorded_at DESC
      ) v
      ON p.patient_id = v.patient_id

      ORDER BY p.patient_code
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// 2. GET patient by ID
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM patients WHERE patient_id = $1",
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
});


// 3. POST (Add patient)
router.post("/", async (req, res) => {
  try {
    const { patient_code, full_name, age, gender, bed_number, contact_number } = req.body;

    // Generate a patient_code if not provided by frontend
    const code = patient_code || `P${Date.now()}`;

    const result = await pool.query(
      `INSERT INTO patients 
      (patient_code, full_name, age, gender, bed_number, contact_number) 
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [code, full_name, age, gender, bed_number, contact_number]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
});


// 4. PUT (Update patient)
router.put("/:id", async (req, res) => {
  try {
    const { full_name, age, gender } = req.body;

    const result = await pool.query(
      `UPDATE patients 
       SET full_name=$1, age=$2, gender=$3 
       WHERE patient_id=$4 RETURNING *`,
      [full_name, age, gender, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
});


// 5. DELETE patient
router.delete("/:id", async (req, res) => {
  try {
    const patientId = req.params.id;
    // Delete referenced records first to avoid foreign key failures
    await pool.query("DELETE FROM devices WHERE patient_id=$1", [patientId]);
    await pool.query("DELETE FROM vitals WHERE patient_id=$1", [patientId]);
    await pool.query("DELETE FROM alerts WHERE patient_id=$1", [patientId]);
    await pool.query("DELETE FROM patients WHERE patient_id=$1", [patientId]);

    res.send("Patient deleted");
  } catch (err) {
    console.error("DELETE PATIENT ERROR:", err);
    res.status(500).send(err.message);
  }
});

module.exports = router;
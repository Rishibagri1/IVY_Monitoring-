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
    const { patient_code, full_name, age, gender, bed_number, contact_number, device_code } = req.body;

    if (!full_name || !age || !gender || !bed_number || !contact_number || !device_code) {
      return res.status(400).send("All fields (full_name, age, gender, bed_number, contact_number, device_code) are required.");
    }

    // Generate a patient_code if not provided by frontend
    const code = patient_code || `P${Date.now()}`;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      const patientResult = await client.query(
        `INSERT INTO patients 
        (patient_code, full_name, age, gender, bed_number, contact_number) 
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [code, full_name, age, gender, bed_number, contact_number]
      );
      
      const newPatient = patientResult.rows[0];

      // Assign the device directly
      await client.query(
        `INSERT INTO devices (patient_id, device_code, status)
         VALUES ($1, $2, $3)`,
        [newPatient.patient_id, device_code, "active"]
      );

      await client.query("COMMIT");
      res.json(newPatient);
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("POST /patient error:", err);
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

    // Restart serial sequence if database is now empty
    const countRes = await pool.query("SELECT COUNT(*) FROM patients");
    if (parseInt(countRes.rows[0].count, 10) === 0) {
      await pool.query("ALTER SEQUENCE patients_patient_id_seq RESTART WITH 1");
      console.log("DB: Reset patients sequence patients_patient_id_seq to 1 (table is empty)");
    }

    res.send("Patient deleted");
  } catch (err) {
    console.error("DELETE PATIENT ERROR:", err);
    res.status(500).send(err.message);
  }
});

module.exports = router;
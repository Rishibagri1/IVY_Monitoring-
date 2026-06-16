const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET all users (for debug/dev)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT user_id, full_name, userid, role, created_at FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json(err.message);
  }
});

// POST create a new user
router.post('/', async (req, res) => {
  try {
    const { full_name, userid, password, role } = req.body;

    if (!full_name || !userid || !password) {
      return res.status(400).json('full_name, userid and password are required');
    }

    // For now store provided password in password_hash column (dev only)
    const result = await pool.query(
      `INSERT INTO users (full_name, userid, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING user_id, full_name, userid, role, created_at`,
      [full_name, String(userid), password, role || 'Nurse']
    );

    res.json(result.rows[0]);
  } catch (err) {
    // If DB throws (e.g. unique constraint), forward message
    res.status(500).json(err.message);
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { userid, password } = req.body;

    const result = await pool.query(
      `SELECT user_id, full_name, userid, role, created_at FROM users
       WHERE userid = $1
       AND password_hash = $2`,
      [String(userid), password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json(err.message);
  }
});

module.exports = router;

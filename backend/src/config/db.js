const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon cloud database
  },
});

pool.connect()
  .then(async () => {
    console.log("DB Connected");
    try {
      await pool.query("ALTER TABLE alerts ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT false;");
      console.log("Database migration: is_resolved column verified in alerts table");
    } catch (migErr) {
      console.error("Migration Error:", migErr.message);
    }
  })
  .catch(err => console.error("DB Error", err.message));

module.exports = pool;
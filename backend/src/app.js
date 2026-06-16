console.log("APP FILE LOADED");

const express = require("express");
const cors = require("cors");

const patientRoutes = require("./routes/patientRoutes");
const vitalRoutes = require("./routes/vitalRoutes");
const alertRoutes = require("./routes/alertRoutes");
const userRoutes = require("./routes/userRoutes");
const deviceRoutes = require("./routes/deviceRoutes");

console.log("Loading Device Routes...");
console.log("Device Routes Loaded");

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS not allowed for: " + origin));
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));
app.use(express.json());

// Routes
app.use("/patient", patientRoutes);
app.use("/vital", vitalRoutes);
app.use("/alert", alertRoutes);
app.use("/user", userRoutes);
app.use("/device", deviceRoutes);

app.get("/check", (req, res) => {
  res.send("App Working");
});

module.exports = app;
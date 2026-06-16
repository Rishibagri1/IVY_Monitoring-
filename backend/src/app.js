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

app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
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
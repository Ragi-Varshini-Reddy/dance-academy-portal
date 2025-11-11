const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const adminApp = require("./APIs/adminApi");
const teacherApp = require("./APIs/teacherApi");
const batchApp = require("./APIs/batchApi");
const feeApp = require("./APIs/feeApi");
const studentApp = require("./APIs/studentApi");
const attendanceApp = require("./APIs/attendanceApi");
const authApp = require("./APIs/authApi");

dotenv.config();
const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://dance-academy-portal.vercel.app",
      "https://dance-academy-portal-r1a9.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
//app.options('*', cors());

app.use(express.json({ limit: "10mb" }));

app.use("/admin-api", adminApp);
app.use("/teacher-api", teacherApp);
app.use("/batch-api", batchApp);
app.use("/fee-api", feeApp);
app.use("/student-api", studentApp);
app.use("/attendance-api", attendanceApp);
app.use("/auth-api", authApp);

app.get("/", (req, res) => res.send("Dance Academy Server Running"));

// MongoDB connection (runs once per cold start)
mongoose
  .connect(process.env.DBURL)
  .then(() => console.log("DB connected successfully"))
  .catch((err) => console.log("DB connection error:", err));

module.exports = app;
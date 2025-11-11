const exp = require("express");
const cors = require("cors");
const path = require("path");
const app = exp();
require("dotenv").config();
const mongoose = require("mongoose");
const adminApp = require("./APIs/adminApi");
const teacherApp = require("./APIs/teacherApi");
const batchApp = require("./APIs/batchApi");
const feeApp = require("./APIs/feeApi");
const studentApp = require("./APIs/studentApi");
const attendanceApp = require("./APIs/attendanceApi");
const authApp = require("./APIs/authApi");

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));

app.use(exp.json({ limit: '10mb' }));

app.use("/admin-api", adminApp);
app.use("/teacher-api", teacherApp);
app.use("/batch-api", batchApp);
app.use("/fee-api", feeApp);
app.use("/student-api", studentApp);
app.use("/attendance-api", attendanceApp);
app.use("/auth-api", authApp);

if (process.env.NODE_ENV === "production") {
  const clientBuildPath = path.join(__dirname, "..", "client", "dance-academy-app", "dist");
  app.use(exp.static(clientBuildPath));

  app.get("*", (req, res) => {
    res.sendFile(path.join(clientBuildPath, "index.html"));
  });
}

const port = process.env.PORT || 4000;

mongoose.connect(process.env.DBURL)
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log("DB connected successfully");
    });
  })
  .catch(err => console.log("DB connection error:", err));
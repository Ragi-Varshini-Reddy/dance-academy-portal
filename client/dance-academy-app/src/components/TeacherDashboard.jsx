import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Button,
  Table,
  Form,
  Alert,
  Spinner,
  Tabs,
  Tab,
  Modal,
} from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

const TeacherDashboard = () => {
  const [teacherName, setTeacherName] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [academyId, setAcademyId] = useState("");
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [students, setStudents] = useState([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState("");
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [attendanceList, setAttendanceList] = useState([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState({ total: 0, present: 0, absent: 0 });
  const [loading, setLoading] = useState(false);
  const [attendanceFilter, setAttendanceFilter] = useState("all");
  const [notesError, setNotesError] = useState(false);
  const [activeTab, setActiveTab] = useState("mark-attendance");
  const [batchStudentsWithAttendance, setBatchStudentsWithAttendance] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("userData"));
    const role = localStorage.getItem("role");

    if (user && role === "teacher") {
      setTeacherName(user.username);
      setTeacherId(user._id || user.userId);
      setAcademyId(user.academy);
      fetchBatches(user._id || user.userId, user.academy);
    } else {
      navigate("/login");
    }
  }, [navigate]);

  const BASE_URL = import.meta.env.VITE_BACKEND_URL || "";

  const fetchBatches = async (teacherId, academyId) => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${BASE_URL}/teacher-api/my-batches/${teacherId}`,
        { params: { academy: academyId } }
      );
      setBatches(res.data);
    } catch (err) {
      console.error("Error fetching batches:", err);
      setError("Failed to fetch batches. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentAttendancePercentage = async (batchId) => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${BASE_URL}/attendance-api/attendance-percentage/${batchId}`,
        { params: { academy: academyId } }
      );
      setBatchStudentsWithAttendance(res.data);
      setError("");
    } catch (err) {
      console.error("Error fetching attendance percentages:", err);
      setError("Failed to fetch student attendance data");
    } finally {
      setLoading(false);
    }
  };

  const handleBatchChange = async (e) => {
    const batchId = e.target.value;
    setLoading(true);
    try {
      const batch = batches.find((b) => b._id === batchId);
      setSelectedBatch(batch);
      setStudents(batch?.students || []);
      setAttendanceMarked(false);
      setAttendanceList([]);
      setSummary({ total: 0, present: 0, absent: 0 });
      setAttendanceDate("");
      setError("");
      setNotes("");
      setNotesError(false);
      setAttendanceFilter("all");
      setActiveTab("mark-attendance");
      setBatchStudentsWithAttendance([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = async (e) => {
    const date = e.target.value;
    setAttendanceDate(date);
    setError("");
    setAttendanceMarked(false);
    setAttendanceList([]);
    setSummary({ total: 0, present: 0, absent: 0 });
    setNotes("");
    setNotesError(false);
    setAttendanceFilter("all");

    if (!selectedBatch) return;

    const today = new Date();
    const selected = new Date(date);
    const start = new Date(selectedBatch.startDate);
    const end = new Date(selectedBatch.endDate);

    if (selected > today) {
      setError("Date cannot be in the future.");
      return;
    }
    if (selected < start || selected > end) {
      setError("Date must be within the batch duration.");
      return;
    }
    const dayOfWeek = selected.toLocaleDateString('en-US', { weekday: 'long' });
    if (!selectedBatch.days.includes(dayOfWeek)) {
      setError(`Attendance is not allowed on ${dayOfWeek}. Batch runs only on: ${selectedBatch.days.join(", ")}`);
      return;
    }

    try {
      setLoading(true);
      const res = await axios.get(
        `${BASE_URL}/attendance-api/attendance/${selectedBatch._id}/${date}`,
        { params: { academy: academyId } }
      );

      if (res.data && res.data.length > 0) {
        const attendanceRecord = res.data[0];
        setAttendanceMarked(true);
        setAttendanceList(attendanceRecord.attendance);
        setNotes(attendanceRecord.notes || "");

        const presentCount = attendanceRecord.attendance.filter(
          (s) => s.present
        ).length;
        const absentCount = attendanceRecord.attendance.length - presentCount;
        setSummary({
          total: attendanceRecord.attendance.length,
          present: presentCount,
          absent: absentCount,
        });
      } else {
        setAttendanceMarked(false);
        setAttendanceList(
          students.map((s) => ({ studentId: s._id.toString(), present: false }))
        );
        setSummary({ total: students.length, present: 0, absent: students.length });
      }
    } catch (err) {
      console.error("Error checking attendance:", err);
      setError("Failed to check attendance for selected date.");
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceChange = (studentId) => {
    if (attendanceMarked) return;

    setAttendanceList((prev) =>
      prev.map((a) =>
        a.studentId.toString() === studentId.toString()
          ? { ...a, present: !a.present }
          : a
      )
    );
  };

  const handleSubmitAttendance = async () => {
    if (!attendanceDate) {
      setError("Please select a valid date.");
      return;
    }

    if (!notes.trim()) {
      setNotesError(true);
      return;
    }

    try {
      setLoading(true);
      await axios.post(
        `${BASE_URL}/attendance-api/attendance/${selectedBatch._id}`,
        {
          teacher: teacherId,
          date: attendanceDate,
          attendance: attendanceList,
          notes,
          academy: academyId
        }
      );

      const presentCount = attendanceList.filter((s) => s.present).length;
      const absentCount = attendanceList.length - presentCount;

      setAttendanceMarked(true);
      setSummary({ total: attendanceList.length, present: presentCount, absent: absentCount });
      setError("");
      setNotesError(false);
      alert("Attendance submitted successfully!");
    } catch (err) {
      console.error("Submit error:", err);
      setError(err.response?.data?.message || "Failed to submit attendance");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const openBatchDetails = () => {
    if (selectedBatch) setShowDetailsModal(true);
  };

  const getStudentName = (attendanceItem) => {
    if (
      attendanceItem.studentId &&
      typeof attendanceItem.studentId === "object" &&
      attendanceItem.studentId.name
    ) {
      return attendanceItem.studentId.name;
    }
    const studentObj = students.find(
      (s) => s._id.toString() === attendanceItem.studentId.toString()
    );
    return studentObj?.name || "Unknown";
  };

  const getAttendanceStatus = (percentage) => {
    if (percentage >= 75) return "Good";
    if (percentage >= 50) return "Average";
    return "Poor";
  };

  const handleTabSelect = (tab) => {
    setActiveTab(tab);
    if (tab === "attendance-summary" && selectedBatch) {
      fetchStudentAttendancePercentage(selectedBatch._id);
    }
  };

  return (
    <div className="container py-4">
      <Button
        variant="outline-danger"
        onClick={handleLogout}
        style={{ position: "fixed", top: 30, right: 30, zIndex: 1000 }}
      >
        Logout
      </Button>

      <h2 className="fw-bold text-primary text-center pb-4">👋 Welcome back, {teacherName}!</h2>

      <div className="row align-items-end mb-3">
        <div className="col-md-4 col-sm-6 mb-2">
          <label className="form-label fw-semibold">Select Batch:</label>
          <select
            className="form-select"
            onChange={handleBatchChange}
            value={selectedBatch?._id || ""}
            disabled={loading}
          >
            <option value="">-- Select a batch --</option>
            {batches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {selectedBatch && (
          <>
            <div className="col-md-3 col-sm-6 mb-2">
              <label className="form-label fw-semibold">Select Date:</label>
              <input
                type="date"
                className="form-control"
                value={attendanceDate}
                onChange={handleDateChange}
                min={new Date(selectedBatch.startDate).toISOString().split("T")[0]}
                max={new Date(selectedBatch.endDate).toISOString().split("T")[0]}
                disabled={loading}
              />
            </div>

            <div className="col-md-5 col-sm-12 mb-2">
              <button
                className="btn btn-info w-50"
                onClick={openBatchDetails}
                disabled={loading}
              >
                {loading ? "Loading..." : "View Batch Details"}
              </button>
            </div>
          </>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {selectedBatch && (
        <Tabs
          activeKey={activeTab}
          onSelect={handleTabSelect}
          className="mb-3"
          id="attendance-tabs"
        >
          <Tab eventKey="mark-attendance" title="Mark Attendance">
            {loading ? (
              <div className="d-flex justify-content-center my-5">
                <Spinner animation="border" variant="primary" />
              </div>
            ) : attendanceDate && !error ? (
              <>
                {attendanceMarked ? (
                  <>
                    <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
                      <div>
                        <h5 className="text-success mb-1">Attendance Already Marked</h5>
                        <p className="mb-0">
                          <strong>Total:</strong> {summary.total} |{" "}
                          <strong>Present:</strong> {summary.present} |{" "}
                          <strong>Absent:</strong> {summary.absent}
                        </p>
                      </div>
                      <div className="d-flex flex-column align-items-end" style={{ minWidth: "140px" }}>
                        <Form.Label className="fw-semibold mb-1">Student Filter:</Form.Label>
                        <Form.Select
                          value={attendanceFilter}
                          onChange={(e) => setAttendanceFilter(e.target.value)}
                        >
                          <option value="all">All</option>
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                        </Form.Select>
                      </div>
                    </div>
                    <Table bordered>
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceList
                          .filter((a) => {
                            if (attendanceFilter === "all") return true;
                            if (attendanceFilter === "present") return a.present === true;
                            if (attendanceFilter === "absent") return a.present === false;
                            return true;
                          })
                          .map((a) => (
                            <tr
                              key={
                                typeof a.studentId === "object"
                                  ? a.studentId._id
                                  : a.studentId
                              }
                            >
                              <td>{getStudentName(a)}</td>
                              <td>{a.present ? "Present" : "Absent"}</td>
                            </tr>
                          ))}
                      </tbody>
                    </Table>
                    {notes && (
                      <p className="mt-2 mb-0">
                        <strong>Notes:</strong> {notes}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <h5 className="text-primary">Mark Attendance</h5>
                    <Table bordered>
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Present</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceList.map((a) => (
                          <tr
                            key={
                              typeof a.studentId === "object"
                                ? a.studentId._id
                                : a.studentId
                            }
                          >
                            <td>{getStudentName(a)}</td>
                            <td>
                              <Form.Check
                                type="checkbox"
                                checked={a.present}
                                onChange={() =>
                                  handleAttendanceChange(
                                    typeof a.studentId === "object"
                                      ? a.studentId._id
                                      : a.studentId
                                  )
                                }
                                disabled={attendanceMarked || loading}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>

                    <div className="mb-3">
                      <Form.Label>Notes:</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={notes}
                        onChange={(e) => {
                          setNotes(e.target.value);
                          setNotesError(false);
                        }}
                        isInvalid={notesError}
                        disabled={loading}
                      />
                      {notesError && (
                        <Form.Control.Feedback type="invalid">
                          Notes are required
                        </Form.Control.Feedback>
                      )}
                    </div>

                    <Button 
                      variant="success" 
                      onClick={handleSubmitAttendance}
                      disabled={loading}
                    >
                      {loading ? "Submitting..." : "Submit Attendance"}
                    </Button>
                  </>
                )}
              </>
            ) : (
              <Alert variant="info" className="mt-3 text-center">
                Please select a date to mark attendance
              </Alert>
            )}
          </Tab>
          <Tab eventKey="attendance-summary" title="Attendance Summary">
            {loading ? (
              <div className="d-flex justify-content-center my-5">
                <Spinner animation="border" variant="secondary" />
              </div>
            ) : batchStudentsWithAttendance.length > 0 ? (
              <div className="mt-4 px-3">
                <Table bordered hover responsive className="shadow-sm">
                  <thead className="bg-light">
                    <tr className="text-secondary text-center">
                      <th style={{ width: "35%" }}>Student Name</th>
                      <th style={{ width: "45%" }}>Attendance %</th>
                      <th style={{ width: "20%" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchStudentsWithAttendance.map((student) => {
                      const percentage = parseFloat(student.percentage);
                      const status = getAttendanceStatus(percentage);
                      const progressColor = percentage >= 75 ? "#4CAF50" : percentage >= 50 ? "#FFC107" : "#DC3545";

                      return (
                        <tr key={student.studentId} className="align-middle text-center">
                          <td className="text-start text-dark fw-medium">{student.name}</td>
                          <td>
                            <div className="progress" style={{ height: "22px", backgroundColor: "#f1f1f1" }}>
                              <div
                                className="progress-bar"
                                role="progressbar"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: progressColor,
                                  color: "black",
                                  fontWeight: "500",
                                }}
                              >
                                {percentage}%
                              </div>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`badge rounded-pill ${
                                status === "Good"
                                  ? "bg-success-subtle text-success"
                                  : status === "Average"
                                  ? "bg-warning-subtle text-warning"
                                  : "bg-danger-subtle text-danger"
                              } px-3 py-2`}
                              style={{ fontSize: "0.9rem", fontWeight: 500 }}
                            >
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            ) : (
              <Alert variant="secondary" className="mt-3 text-center">
                {selectedBatch ? "No attendance data available for this batch." : "Please select a batch first."}
              </Alert>
            )}
          </Tab>
        </Tabs>
      )}

      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Batch Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            <strong>Name:</strong> {selectedBatch?.name}
          </p>
          <p>
            <strong>Start Date:</strong>{" "}
            {selectedBatch
              ? new Date(selectedBatch.startDate).toLocaleDateString()
              : ""}
          </p>
          <p>
            <strong>End Date:</strong>{" "}
            {selectedBatch
              ? new Date(selectedBatch.endDate).toLocaleDateString()
              : ""}
          </p>
          <p>
            <strong>Location:</strong> {selectedBatch?.location}
          </p>
          <p>
            <strong>Days:</strong> {selectedBatch?.days?.join(", ")}
          </p>
          <p>
            <strong>Teachers:</strong>{" "}
            {selectedBatch?.teachers?.map((t) => t.name).join(", ")}
          </p>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default TeacherDashboard;
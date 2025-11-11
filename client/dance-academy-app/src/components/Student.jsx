import { useEffect, useState } from "react";
import axios from "axios";
import { FaEdit, FaTrash, FaArrowLeft } from "react-icons/fa";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

const Student = () => {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    photo: "",
    dob: "",
    parentName: "",
    parentPhone: "",
    batches: [],
    joinDate: new Date().toISOString().slice(0, 10),
  });

  // Helper to get admin config
  const getAdminConfig = () => {
    const adminData = JSON.parse(localStorage.getItem("userData"));
    const adminId = adminData?._id;
    return {
      headers: { "x-admin-id": adminId },
      withCredentials: true,
    };
  };

  useEffect(() => {
    fetchStudents();
    fetchBatches();
  }, []);

  const BASE_URL = import.meta.env.PROD ? "https://dance-academy-portal-nigdvqjd2-varshinis-projects-0cf6f1d4.vercel.app" : "http://localhost:4000";
  axios.defaults.baseURL = BASE_URL;

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const config = getAdminConfig();
      if (!config.headers["x-admin-id"]) {
        setError("Admin session expired. Please login again.");
        setLoading(false);
        return;
      }
      const res = await axios.get(`${BASE_URL}/student-api/students`, config);
      setStudents(res.data);
      setError("");
    } catch (err) {
      console.error("Fetch students error:", err);
      setError("Failed to fetch students");
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const config = getAdminConfig();
      const res = await axios.get(`${BASE_URL}/batch-api/batches`, config);
      setBatches(res.data);
    } catch (err) {
      console.error("Fetch batches error:", err);
      setBatches([]);
    }
  };

  const openAddModal = () => {
    setFormData({
      name: "",
      photo: "",
      dob: "",
      parentName: "",
      parentPhone: "",
      batches: [],
      joinDate: new Date().toISOString().slice(0, 10),
    });
    setEditingStudent(null);
    setShowModal(true);
    setError("");
  };

  const openEditModal = (student) => {
    setFormData({
      name: student.name || "",
      photo: student.photo || "",
      dob: student.dob ? student.dob.slice(0, 10) : "",
      parentName: student.parentName || "",
      parentPhone: student.parentPhone || "",
      batches:
        student.batches?.map((b) => (typeof b === "object" ? b._id : b)) || [],
      joinDate: student.joinDate
        ? student.joinDate.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    });
    setEditingStudent(student);
    setShowModal(true);
    setError("");
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this student?")) {
      try {
        const config = getAdminConfig();
        await axios.delete(`${BASE_URL}/student-api/students/${id}`, config);
        fetchStudents();
      } catch (err) {
        console.error("Delete error:", err);
        setError("Failed to delete student");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const config = getAdminConfig();
      
      if (editingStudent) {
        await axios.put(
          `${BASE_URL}/student-api/students/${editingStudent._id}`,
          formData,
          config
        );
      } else {
        await axios.post(
          `${BASE_URL}/student-api/students`, 
          formData, 
          config
        );
      }
      
      setShowModal(false);
      fetchStudents();
      setError("");
    } catch (err) {
      console.error("Submit error:", err);
      setError(err.response?.data?.message || "Failed to save student");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleBatchToggle = (batchId) => {
    setFormData((prev) => {
      const batches = prev.batches.includes(batchId)
        ? prev.batches.filter((b) => b !== batchId)
        : [...prev.batches, batchId];
      return { ...prev, batches };
    });
    setError("");
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, photo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN");
  };

  const handleBack = () => {
    navigate("/admin");
  };

  return (
    <div style={{ padding: "20px" }}>
      {/* Top header with back arrow */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <FaArrowLeft
          style={{ cursor: "pointer", fontSize: "20px", marginRight: "10px" }}
          onClick={handleBack}
          title="Back to Admin Dashboard"
        />
        <h2 style={{ margin: 0 }}>Students Management</h2>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <button 
        className="btn btn-primary mb-3" 
        onClick={openAddModal}
        disabled={loading}
      >
        {loading ? "Loading..." : "+ Add New Student"}
      </button>

      {loading && <p>Loading students...</p>}

      <div className="table-responsive">
        <table className="table table-bordered align-middle">
          <thead className="table-light">
            <tr>
              <th>Photo</th>
              <th>Name</th>
              <th>DOB</th>
              <th>Parent</th>
              <th>Phone</th>
              <th>Batches</th>
              <th>Join Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s._id}>
                <td>
                  {s.photo ? (
                    <img
                      src={s.photo}
                      alt="Student"
                      width="50"
                      height="50"
                      style={{ borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    "No Photo"
                  )}
                </td>
                <td>{s.name}</td>
                <td>{formatDate(s.dob)}</td>
                <td>{s.parentName}</td>
                <td>{s.parentPhone}</td>
                <td>
                  {Array.isArray(s.batches) && s.batches.length > 0
                    ? s.batches
                        .map((b) => (typeof b === "object" ? b.name : b))
                        .join(", ")
                    : "-"}
                </td>
                <td>{formatDate(s.joinDate)}</td>
                <td>
                  <FaEdit
                    style={{ color: "orange", cursor: "pointer", marginRight: 10 }}
                    onClick={() => openEditModal(s)}
                    title="Edit Student"
                  />
                  <FaTrash
                    style={{ color: "gray", cursor: "pointer" }}
                    onClick={() => handleDelete(s._id)}
                    title="Delete Student"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingStudent ? "Edit Student" : "Add Student"}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Student Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Parent Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="parentName"
                    value={formData.parentName}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Parent Phone *</Form.Label>
                  <Form.Control
                    type="text"
                    name="parentPhone"
                    value={formData.parentPhone}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Join Date *</Form.Label>
                  <Form.Control
                    type="date"
                    name="joinDate"
                    value={formData.joinDate}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date of Birth *</Form.Label>
                  <Form.Control
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Photo</Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={loading}
                  />
                  {formData.photo && (
                    <div className="mt-2 d-flex align-items-center">
                      <img
                        src={formData.photo}
                        alt="Preview"
                        width="100"
                        height="100"
                        style={{
                          objectFit: "cover",
                          borderRadius: "10px",
                          border: "1px solid #ccc",
                          marginRight: "10px",
                        }}
                      />
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => setFormData((prev) => ({ ...prev, photo: "" }))}
                        title="Remove selected photo"
                        disabled={loading}
                      >
                        &times;
                      </Button>
                    </div>
                  )}
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Assign Batches (Optional)</Form.Label>
                  <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid #dee2e6", padding: "10px", borderRadius: "5px" }}>
                    {batches.length === 0 ? (
                      <div className="text-muted">No batches available in your academy</div>
                    ) : (
                      batches.map((b) => (
                        <Form.Check
                          key={b._id}
                          type="checkbox"
                          id={`batch-${b._id}`}
                          label={b.name}
                          checked={formData.batches.includes(b._id)}
                          onChange={() => handleBatchToggle(b._id)}
                          disabled={loading}
                        />
                      ))
                    )}
                  </div>
              </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="secondary" 
              onClick={() => setShowModal(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary"
              disabled={loading}
            >
              {loading ? "Saving..." : (editingStudent ? "Update" : "Add")}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default Student;
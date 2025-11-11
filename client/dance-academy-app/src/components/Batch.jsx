import { useEffect, useState } from "react";
import axios from "axios";
import { Button, Modal, Form, Table } from "react-bootstrap";
import { FaEdit, FaTrash, FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const Batch = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    timeSlot: "",
    location: "",
    fee: "",
    days: [],
    teachers: [],
    students: [],
  });

  const BASE_URL = import.meta.env.PROD ? "https://dance-academy-portal-nigdvqjd2-varshinis-projects-0cf6f1d4.vercel.app" : "http://localhost:4000";
  axios.defaults.baseURL = BASE_URL;

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
    const fetchData = async () => {
      try {
        setLoading(true);
        const config = getAdminConfig();
        
        const [batchRes, teacherRes, studentRes] = await Promise.all([
          axios.get(`${BASE_URL}/batch-api/batches`, config),
          axios.get(`${BASE_URL}/admin-api/teachers`, config),
          axios.get(`${BASE_URL}/student-api/students`, config),
        ]);
        
        setBatches(batchRes.data);
        setTeachers(teacherRes.data);
        setStudents(studentRes.data);
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setError("Start date must be before end date");
      setLoading(false);
      return;
    }

    try {
      const config = getAdminConfig();
      
      if (editingBatch) {
        await axios.put(
          `${BASE_URL}/batch-api/batches/${editingBatch._id}`,
          formData,
          config
        );
      } else {
        await axios.post(
          `${BASE_URL}/batch-api/batches`,
          formData,
          config
        );
      }
      
      // Refresh batches list
      const batchRes = await axios.get(`${BASE_URL}/batch-api/batches`, config);
      setBatches(batchRes.data);
      setShowModal(false);
      setEditingBatch(null);
    } catch (err) {
      console.error("Submit error:", err);
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (batch) => {
    setEditingBatch(batch);
    setFormData({
      name: batch.name,
      startDate: batch.startDate?.slice(0, 10) || "",
      endDate: batch.endDate?.slice(0, 10) || "",
      timeSlot: batch.timeSlot || "",
      location: batch.location || "",
      fee: batch.fee || "",
      days: batch.days || [],
      teachers: batch.teachers?.map(t => t._id) || [],
      students: batch.students?.map(s => s._id) || [],
    });
    setShowModal(true);
    setError("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this batch?")) return;
    
    try {
      const config = getAdminConfig();
      await axios.delete(`${BASE_URL}/batch-api/batches/${id}`, config);
      
      // Refresh batches list
      const batchRes = await axios.get(`${BASE_URL}/batch-api/batches`, config);
      setBatches(batchRes.data);
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete batch");
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox" && name === "days") {
      const updatedDays = checked
        ? [...formData.days, value]
        : formData.days.filter(d => d !== value);
      setFormData({ ...formData, days: updatedDays });
    } else if (type === "select-multiple") {
      const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
      setFormData({ ...formData, [name]: selected });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    setError("");
  };

  const handleBack = () => {
    navigate("/admin");
  };

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center mb-3">
        <FaArrowLeft 
          style={{ cursor: "pointer", marginRight: 10 }} 
          onClick={handleBack}
          title="Back to Admin Dashboard"
        />
        <h4 className="fw-bold">Batch Management</h4>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <Button
        variant="primary"
        className="mb-3"
        onClick={() => {
          setShowModal(true);
          setEditingBatch(null);
          setFormData({
            name: "",
            startDate: "",
            endDate: "",
            timeSlot: "",
            location: "",
            fee: "",
            days: [],
            teachers: [],
            students: [],
          });
          setError("");
        }}
        disabled={loading}
      >
        + Add Batch
      </Button>

      {loading && <p>Loading batches...</p>}

      <Table bordered responsive hover>
        <thead>
          <tr>
            <th>Name</th>
            <th>Duration</th>
            <th>Timings</th>
            <th>Venue</th>
            <th>Days</th>
            <th>Fee</th>
            <th>Teachers</th>
            <th>Students</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {batches.map(b => (
            <tr key={b._id}>
              <td>{b.name}</td>
              <td>{new Date(b.startDate).toLocaleDateString()} - {new Date(b.endDate).toLocaleDateString()}</td>
              <td>{b.timeSlot}</td>
              <td>{b.location}</td>
              <td>{b.days?.join(", ")}</td>
              <td>₹{b.fee}</td>
              <td>{b.teachers?.map(t => t.name).join(", ")}</td>
              <td>{b.students?.map(s => s.name).join(", ")}</td>
              <td>
                <FaEdit 
                  style={{ color: "orange", cursor: "pointer", marginRight: 10 }} 
                  onClick={() => openEditModal(b)} 
                  title="Edit Batch"
                />
                <FaTrash 
                  style={{ color: "gray", cursor: "pointer" }} 
                  onClick={() => handleDelete(b._id)}
                  title="Delete Batch"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingBatch ? "Edit Batch" : "Add Batch"}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Batch Name *</Form.Label>
                  <Form.Control 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    required 
                    disabled={loading}
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Fee (₹) *</Form.Label>
                  <Form.Control 
                    name="fee" 
                    type="number" 
                    value={formData.fee} 
                    onChange={handleChange} 
                    required 
                    disabled={loading}
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Start Date *</Form.Label>
                  <Form.Control 
                    type="date" 
                    name="startDate" 
                    value={formData.startDate} 
                    onChange={handleChange} 
                    required 
                    disabled={loading}
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>End Date *</Form.Label>
                  <Form.Control 
                    type="date" 
                    name="endDate" 
                    value={formData.endDate} 
                    onChange={handleChange} 
                    required 
                    disabled={loading}
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Time Slot</Form.Label>
                  <Form.Control 
                    name="timeSlot" 
                    value={formData.timeSlot} 
                    onChange={handleChange} 
                    disabled={loading}
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Location</Form.Label>
                  <Form.Control 
                    name="location" 
                    value={formData.location} 
                    onChange={handleChange} 
                    disabled={loading}
                  />
                </Form.Group>
              </div>
              <div className="col-md-12">
                <Form.Group className="mb-3">
                  <Form.Label>Days</Form.Label>
                  <div className="d-flex flex-wrap gap-2">
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                      <Form.Check
                        key={day}
                        type="checkbox"
                        label={day}
                        name="days"
                        value={day}
                        checked={formData.days.includes(day)}
                        onChange={handleChange}
                        disabled={loading}
                      />
                    ))}
                  </div>
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Assign Teachers</Form.Label>
                  <Form.Select 
                    multiple 
                    name="teachers" 
                    value={formData.teachers} 
                    onChange={handleChange}
                    disabled={loading}
                  >
                    {teachers.map(t => (
                      <option key={t._id} value={t._id}>{t.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Assign Students</Form.Label>
                  <Form.Select 
                    multiple 
                    name="students" 
                    value={formData.students} 
                    onChange={handleChange}
                    disabled={loading}
                  >
                    {students.map(s => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>
            </div>
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
              {loading ? "Processing..." : (editingBatch ? "Update" : "Add")}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default Batch;
import { useEffect, useState } from "react";
import axios from "axios";
import { Button, Form, Table, Badge, Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

const Fee = () => {
  const navigate = useNavigate();
  const [fees, setFees] = useState([]);
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({ batch: "", student: "", month: "", status: "" });
  const [showModal, setShowModal] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [formData, setFormData] = useState({
    student: "",
    batch: "",
    month: "",
    amount: "",
    status: "pending",
    paidOn: "",
  });
  const [error, setError] = useState("");
  const [academyId, setAcademyId] = useState("");

  // Get academy ID from admin data
  useEffect(() => {
    const adminData = JSON.parse(localStorage.getItem("userData"));
    if (adminData && adminData.academyId) {
      setAcademyId(adminData.academyId);
    }
  }, []);

  // Helper to get admin config
  const getAdminConfig = () => {
    const adminData = JSON.parse(localStorage.getItem("userData"));
    const adminId = adminData?._id;
    return {
      headers: { "x-admin-id": adminId },
      withCredentials: true,
    };
  };

const BASE_URL = import.meta.env.PROD ? "https://dance-academy-portal-nigdvqjd2-varshinis-projects-0cf6f1d4.vercel.app" : "http://localhost:4000";
axios.defaults.baseURL = BASE_URL;
axios.defaults.withCredentials = true;

  useEffect(() => {
    if (!academyId) return;
    
    const fetchData = async () => {
      try {
        const config = getAdminConfig();
        const [feeRes, batchRes, studentRes] = await Promise.all([
          axios.get(`${BASE_URL}/fee-api/fees`, {
            ...config,
            params: { academy: academyId }
          }),
          axios.get(`${BASE_URL}/batch-api/batches`, {
            ...config,
            params: { academy: academyId }
          }),
          axios.get(`${BASE_URL}/student-api/students`, {
            ...config,
            params: { academy: academyId }
          })
        ]);
        setFees(feeRes.data);
        setBatches(batchRes.data);
        setStudents(studentRes.data);
      } catch (err) {
        console.error("Data fetch error:", err);
      }
    };
    fetchData();
  }, [academyId]);

  useEffect(() => {
    if (formData.status === "paid" && !formData.paidOn) {
      const today = new Date().toISOString().split("T")[0];
      setFormData((prev) => ({ ...prev, paidOn: today }));
    }
    if (formData.status === "pending") {
      setFormData((prev) => ({ ...prev, paidOn: "" }));
    }
  }, [formData.status]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  const filteredFees = fees.filter((f) => {
    const { batch, student, month, status } = filters;
    return (
      (!batch || f.batch?._id === batch) &&
      (!student || f.student?.name.toLowerCase().includes(student.toLowerCase())) &&
      (!month || f.month === month) &&
      (!status || f.status === status)
    );
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const config = getAdminConfig();
      const payload = {
        student: formData.student,
        batch: formData.batch,
        month: formData.month,
        amount: formData.amount,
        status: formData.status.toLowerCase(),
        academy: academyId
      };
      if (formData.status === "paid" && formData.paidOn) {
        payload.paidOn = new Date(formData.paidOn);
      }

      if (editingFee) {
        await axios.put(`${BASE_URL}/fee-api/fees/${editingFee._id}`, payload, config);
      } else {
        await axios.post(`${BASE_URL}/fee-api/fees`, payload, config);
      }

      const updated = await axios.get(`${BASE_URL}/fee-api/fees`, {
        ...config,
        params: { academy: academyId }
      });
      setFees(updated.data);
      setShowModal(false);
      setEditingFee(null);
    } catch (err) {
      console.error("Submit error:", err.response?.data || err.message);
      setError(err.response?.data?.message || err.message || "Something went wrong");
    }
  };

  const handleEdit = (fee) => {
    setEditingFee(fee);
    setFormData({
      student: fee.student?._id,
      batch: fee.batch?._id,
      month: fee.month,
      amount: fee.amount,
      status: fee.status,
      paidOn: fee.paidOn ? new Date(fee.paidOn).toISOString().split("T")[0] : "",
    });
    setError("");
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      const config = getAdminConfig();
      await axios.delete(`${BASE_URL}/fee-api/fees/${id}`, config);
      const updated = await axios.get(`${BASE_URL}/fee-api/fees`, {
        ...config,
        params: { academy: academyId }
      });
      setFees(updated.data);
    }
  };

  const handleMarkPaid = async (id) => {
    const config = getAdminConfig();
    await axios.put(`${BASE_URL}/fee-api/fees/${id}`, {
      status: "paid",
      paidOn: new Date().toISOString(),
      academy: academyId
    }, config);
    const updated = await axios.get(`${BASE_URL}/fee-api/fees`, {
      ...config,
      params: { academy: academyId }
    });
    setFees(updated.data);
  };

  const totalPaid = filteredFees.filter(f => f.status === "paid").reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const totalPending = filteredFees.filter(f => f.status === "pending").reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const uniqueMonths = [...new Set(fees.map(f => f.month))];

  const handleModalClose = () => {
    setShowModal(false);
    setError("");
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center">
          <FaArrowLeft style={{ cursor: "pointer", marginRight: 10 }} onClick={() => navigate("/admin")} />
          <h4 className="fw-bold mb-0">Fee Management</h4>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setShowModal(true);
            setEditingFee(null);
            setFormData({ student: "", batch: "", month: "", amount: "", status: "pending", paidOn: "" });
            setError("");
          }}
        >
          + Add Fee Record
        </Button>
      </div>

      {/* Filters */}
      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <Form.Select name="batch" value={filters.batch} onChange={handleFilterChange}>
            <option value="">All Batches</option>
            {batches.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </Form.Select>
        </div>
        <div className="col-md-3">
          <Form.Control
            type="text"
            placeholder="Search by student name"
            name="student"
            value={filters.student}
            onChange={handleFilterChange}
          />
        </div>
        <div className="col-md-3">
          <Form.Select name="month" value={filters.month} onChange={handleFilterChange}>
            <option value="">All Months</option>
            {uniqueMonths.map((m, idx) => (
              <option key={idx} value={m}>{m}</option>
            ))}
          </Form.Select>
        </div>
        <div className="col-md-3">
          <Form.Select name="status" value={filters.status} onChange={handleFilterChange}>
            <option value="">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
          </Form.Select>
        </div>
      </div>

      {/* Table */}
      <Table bordered hover responsive>
        <thead>
          <tr>
            <th>Student</th>
            <th>Batch</th>
            <th>Month</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Paid On</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredFees.map((fee) => (
            <tr key={fee._id}>
              <td>{fee.student?.name}</td>
              <td>{fee.batch?.name}</td>
              <td>{fee.month}</td>
              <td>₹{fee.amount}</td>
              <td><Badge bg={fee.status === "paid" ? "success" : "warning"}>{fee.status}</Badge></td>
              <td>{fee.paidOn ? new Date(fee.paidOn).toLocaleDateString("en-IN") : "--"}</td>
              <td>
                <Button size="sm" variant="outline-primary" onClick={() => handleEdit(fee)}>Edit</Button>{' '}
                <Button size="sm" variant="outline-danger" onClick={() => handleDelete(fee._id)}>Delete</Button>{' '}
                {fee.status === "pending" && (
                  <Button size="sm" variant="success" onClick={() => handleMarkPaid(fee._id)}>
                    Mark Paid
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="mt-3">
        <strong>Total Paid:</strong> ₹{totalPaid} &nbsp;&nbsp;|{" "}
        <strong>Total Pending:</strong> ₹{totalPending}
      </div>

      {/* Modal */}
      <Modal show={showModal} onHide={handleModalClose}>
        <Modal.Header closeButton>
          <Modal.Title>{editingFee ? "Edit Fee Record" : "Add Fee Record"}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {error && <div className="alert alert-danger">{error}</div>}

            <Form.Group className="mb-3">
              <Form.Label>Student</Form.Label>
              <Form.Select
                name="student"
                value={formData.student}
                onChange={(e) => setFormData({ ...formData, student: e.target.value })}
                required
                disabled={!!editingFee}
              >
                <option value="">Select Student</option>
                {students.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Batch</Form.Label>
              <Form.Select
                name="batch"
                value={formData.batch}
                onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                required
                disabled={!!editingFee}
              >
                <option value="">Select Batch</option>
                {batches
                  .filter((b) => b.students?.some((s) => s._id === formData.student))
                  .map((b) => (
                    <option key={b._id} value={b._id}>{b.name}</option>
                  ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Month</Form.Label>
              <Form.Control
                name="month"
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                required
                disabled={!!editingFee}
                placeholder="e.g. June 2025"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Amount</Form.Label>
              <Form.Control
                name="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                name="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                required
              >
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </Form.Select>
            </Form.Group>

            {formData.status === "paid" && (
              <Form.Group className="mb-3">
                <Form.Label>Paid On</Form.Label>
                <Form.Control
                  type="date"
                  name="paidOn"
                  value={formData.paidOn}
                  onChange={(e) => setFormData({ ...formData, paidOn: e.target.value })}
                  required
                />
              </Form.Group>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleModalClose}>Cancel</Button>
            <Button variant="primary" type="submit">{editingFee ? "Update" : "Add"}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default Fee;
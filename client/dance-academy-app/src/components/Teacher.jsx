import { useState, useEffect } from "react";
import axios from "axios";
import { FaEdit, FaTrash, FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const BASE_URL = import.meta.env.PROD ? "https://dance-academy-portal-nigdvqjd2-varshinis-projects-0cf6f1d4.vercel.app" : "http://localhost:4000";
const API_BASE = `${BASE_URL}/admin-api/teachers`;

const modalStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.3)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
  backdropFilter: "blur(3px)",
};

const modalContentStyle = {
  backgroundColor: "#ffffff",
  padding: "24px 28px",
  borderRadius: "16px",
  width: "400px",
  boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
  fontFamily: "Segoe UI, sans-serif",
  transition: "all 0.3s ease-in-out",
};

export default function Teacher() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [resetTeacherId, setResetTeacherId] = useState("");
  const [resetForm, setResetForm] = useState({ oldPassword: "", newPassword: "" });
  const [resetError, setResetError] = useState("");
  const [resetValidationMsg, setResetValidationMsg] = useState("");
  const [showResetSuccessAlert, setShowResetSuccessAlert] = useState(false);

  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    assignedBatches: [],
  });

  const [batches, setBatches] = useState([]);

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
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (showResetSuccessAlert) {
      const timer = setTimeout(() => {
        setShowResetSuccessAlert(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showResetSuccessAlert]);

  async function fetchTeachers() {
    try {
      setLoading(true);
      const config = getAdminConfig();
      if (!config.headers["x-admin-id"]) {
        setError("Admin session expired. Please login again.");
        setLoading(false);
        return;
      }
      const res = await axios.get(API_BASE, config);
      setTeachers(res.data);
    } catch {
      setError("Failed to fetch teachers");
    } finally {
      setLoading(false);
    }
  }

  async function fetchBatches() {
    try {
      const res = await axios.get(`${BASE_URL}/batch-api/batches`, getAdminConfig());
      setBatches(res.data);
    } catch {
      setBatches([]);
    }
  }

  const openAddModal = () => {
    setEditingTeacher(null);
    setForm({ name: "", username: "", password: "", assignedBatches: [] });
    fetchBatches();
    setModalOpen(true);
    setError("");
  };

  const openEditModal = (teacher) => {
    setEditingTeacher(teacher);
    setForm({
      name: teacher.name || "",
      username: teacher.username || "",
      password: "",
      assignedBatches:
        teacher.assignedBatches?.map((b) => (typeof b === "string" ? b : b._id)) || [],
    });
    fetchBatches();
    setModalOpen(true);
    setError("");
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTeacher(null);
    setError("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleCheckboxChange = (batchId) => {
    setForm((f) => {
      if (f.assignedBatches.includes(batchId)) {
        return {
          ...f,
          assignedBatches: f.assignedBatches.filter((id) => id !== batchId),
        };
      } else {
        return { ...f, assignedBatches: [...f.assignedBatches, batchId] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const config = getAdminConfig();
    const adminId = config.headers["x-admin-id"];
    if (!adminId) {
      setError("Admin session expired. Please login again.");
      return;
    }

    if (!form.name || !form.username || (!editingTeacher && !form.password)) {
      setError("Name, username and password (for new) are required.");
      return;
    }

    try {
      setLoading(true);

      if (editingTeacher) {
        const updateData = {
          name: form.name,
          username: form.username,
          assignedBatches: form.assignedBatches,
        };
        if (form.password) updateData.password = form.password;

        await axios.put(`${API_BASE}/${editingTeacher._id}`, updateData, config);
      } else {
        await axios.post(API_BASE, form, config);
      }

      await fetchTeachers();
      closeModal();
    } catch (err) {
      setError(
        err.response?.data?.message === "Username already exists"
          ? "Username already exists. Please choose a different one."
          : "Failed to add teacher."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (teacher) => {
    if (!window.confirm(`Are you sure you want to delete ${teacher.name}?`)) return;

    try {
      setLoading(true);
      await axios.delete(`${API_BASE}/${teacher._id}`, getAdminConfig());
      await fetchTeachers();
    } catch {
      setError("Failed to delete teacher.");
    } finally {
      setLoading(false);
    }
  };

  const openResetModal = (teacherId) => {
    setResetTeacherId(teacherId);
    setResetForm({ oldPassword: "", newPassword: "" });
    setResetError("");
    setResetValidationMsg("");
    setResetModalOpen(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError("");
    setResetValidationMsg("");

    if (!resetForm.oldPassword || !resetForm.newPassword) {
      setResetError("Both old and new passwords are required.");
      return;
    }
    if (resetForm.oldPassword === resetForm.newPassword) {
      setResetValidationMsg("Old and new passwords cannot be the same.");
      return;
    }

    try {
      await axios.put(`${API_BASE}/reset-password/${resetTeacherId}`, resetForm, getAdminConfig());
      setResetModalOpen(false);
      setShowResetSuccessAlert(true);
    } catch (err) {
      setResetError(err?.response?.data?.message || "Failed to reset password.");
    }
  };

  const handleBack = () => {
    navigate("/admin");
  };

  return (
    <div style={{ maxWidth: 900, margin: "20px auto", fontFamily: "Arial, sans-serif" }}>
      {showResetSuccessAlert && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            backgroundColor: "#22c55e",
            color: "white",
            padding: "12px 24px",
            borderRadius: 8,
            boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
            fontWeight: "bold",
            zIndex: 1100,
            cursor: "pointer",
          }}
          onClick={() => setShowResetSuccessAlert(false)}
          title="Click to dismiss"
        >
          Password changed successfully!
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}>
        <FaArrowLeft
          style={{ cursor: "pointer", fontSize: "20px", marginRight: "10px" }}
          onClick={handleBack}
          title="Back to Admin Dashboard"
        />
        <h1 style={{ margin: 0 }}>Teachers Management</h1>
      </div>

      <button
        onClick={openAddModal}
        style={{
          padding: "10px 20px",
          marginBottom: 20,
          backgroundColor: "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: "1rem",
        }}
      >
        + Add New Teacher
      </button>

      {loading && <p>Loading...</p>}
      {!loading && teachers.length === 0 && <p>No teachers found.</p>}

      {!loading && teachers.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 50 }}>
          <thead style={{ backgroundColor: "#f0f0f0" }}>
            <tr>
              <th style={{ padding: 10, border: "1px solid #ddd" }}>Name</th>
              <th style={{ padding: 10, border: "1px solid #ddd" }}>Username</th>
              <th style={{ padding: 10, border: "1px solid #ddd" }}>Batches</th>
              <th style={{ padding: 10, border: "1px solid #ddd" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((teacher) => (
              <tr key={teacher._id}>
                <td style={{ padding: 10, border: "1px solid #ddd" }}>{teacher.name}</td>
                <td style={{ padding: 10, border: "1px solid #ddd" }}>{teacher.username}</td>
                <td style={{ padding: 10, border: "1px solid #ddd" }}>
                  {teacher.assignedBatches
                    ?.map((b) => (typeof b === "string" ? b : b.name || b._id))
                    .join(", ") || "-"}
                </td>
                <td style={{ padding: 10, border: "1px solid #ddd" }}>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <FaEdit
                      style={{ color: "orange", cursor: "pointer", marginRight: 10 }}
                      onClick={() => openEditModal(teacher)}
                    />
                    <FaTrash
                      style={{ color: "gray", cursor: "pointer" }}
                      onClick={() => handleDelete(teacher)}
                    />
                    <button
                      onClick={() => openResetModal(teacher._id)}
                      style={{
                        ...iconBtnStyle,
                        color: "#2563eb",
                        fontSize: "0.9rem",
                        fontWeight: "bold",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Reset Password
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <div style={modalStyle} onClick={closeModal}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <h2>{editingTeacher ? "Edit Teacher" : "Add New Teacher"}</h2>
            {error && <div style={{ color: "red" }}>{error}</div>}
            <form onSubmit={handleSubmit}>
              {["name", "username", !editingTeacher && "password"]
                .filter(Boolean)
                .map((field) => (
                  <div style={{ marginBottom: 16 }} key={field}>
                    <label style={{ display: "block", marginBottom: 4 }}>
                      {field.charAt(0).toUpperCase() + field.slice(1)}:
                    </label>
                    <input
                      type={field === "password" ? "password" : "text"}
                      name={field}
                      value={form[field]}
                      onChange={handleChange}
                      required
                      style={inputStyle}
                    />
                  </div>
                ))}

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 4 }}>Assign Batches:</label>
                <div
                  style={{
                    maxHeight: "100px",
                    overflowY: "auto",
                    border: "1px solid #ccc",
                    padding: "8px",
                    borderRadius: "4px",
                  }}
                >
                  {batches.length === 0 && <div>No batches available</div>}
                  {batches.map((b) => (
                    <label key={b._id} style={{ display: "block", marginBottom: 4, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={form.assignedBatches.includes(b._id)}
                        onChange={() => handleCheckboxChange(b._id)}
                        style={{ marginRight: 8 }}
                      />
                      {b.name || b._id}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" onClick={closeModal} style={buttonStyleCancel}>
                  Cancel
                </button>
                <button type="submit" style={buttonStylePrimary}>
                  {editingTeacher ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetModalOpen && (
        <div style={modalStyle} onClick={() => setResetModalOpen(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <h2>Reset Password</h2>
            {resetError && <div style={{ color: "red", marginBottom: 10 }}>{resetError}</div>}
            {resetValidationMsg && (
              <div style={{ color: "orange", marginBottom: 10 }}>{resetValidationMsg}</div>
            )}
            <form onSubmit={handleResetPassword}>
              {["oldPassword", "newPassword"].map((field) => (
                <div key={field} style={{ marginBottom: 16 }}>
                  <label>{field === "oldPassword" ? "Old Password:" : "New Password:"}</label>
                  <input
                    type="password"
                    name={field}
                    value={resetForm[field]}
                    onChange={(e) => {
                      setResetForm((f) => ({ ...f, [field]: e.target.value }));
                      setResetValidationMsg("");
                    }}
                    required
                    style={inputStyle}
                  />
                </div>
              ))}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  style={buttonStyleCancel}
                >
                  Cancel
                </button>
                <button type="submit" style={buttonStylePrimary}>
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Shared Styles
const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  boxSizing: "border-box",
  borderRadius: 4,
  border: "1px solid #ccc",
};

const iconBtnStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "1.2rem",
  padding: "4px",
};

const buttonStylePrimary = {
  padding: "8px 16px",
  backgroundColor: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
};

const buttonStyleSecondary = {
  padding: "6px 10px",
  backgroundColor: "#f3f4f6",
  border: "1px solid #d1d5db",
  borderRadius: 4,
  cursor: "pointer",
};

const buttonStyleCancel = {
  ...buttonStyleSecondary,
  backgroundColor: "#e5e7eb",
};

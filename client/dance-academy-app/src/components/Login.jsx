import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [useOtp, setUseOtp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    academyName: "",
    adminName: "",
    email: "",
    phone: "",
    username: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(""); 
  };

const BASE_URL = import.meta.env.PROD ? "https://dance-academy-portal-nigdvqjd2-varshinis-projects-0cf6f1d4.vercel.app" : "http://localhost:4000";
axios.defaults.baseURL = BASE_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (!useOtp) {
        if (isSignUp) {
          // Registration logic
          await axios.post(`${BASE_URL}/auth-api/register`, {
            academyName: formData.academyName,
            adminName: formData.adminName,
            email: formData.email,
            phone: formData.phone,
            username: formData.username,
            password: formData.password,
          });
          alert("Registration successful! Please login.");
          setIsSignUp(false);
          setFormData({
            ...formData,
            adminName: "",
            email: "",
            phone: "",
          });
        } else {
          // Login logic
          const res = await axios.post(`${BASE_URL}/auth-api/login`, {
            academyName: formData.academyName,
            username: formData.username,
            password: formData.password,
          });

          const { role, academy, admin, teacher } = res.data;

          // Store user data in localStorage
          localStorage.setItem("academyData", JSON.stringify(academy));
          localStorage.setItem("role", role);

          if (role === "admin") {
            localStorage.setItem("userData", JSON.stringify(admin));
            navigate("/admin");
          } else if (role === "teacher") {
            localStorage.setItem("userData", JSON.stringify(teacher));
            navigate("/teacher");
          }
        }
      } else {
        // OTP logic would go here
        console.log("OTP flow would be implemented here");
      }
    } catch (err) {
      console.error("Error:", err);
      const errorMessage = err.response?.data?.error || 
                          err.message || 
                          "Something went wrong";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light">
      <div className="card shadow p-4" style={{ maxWidth: "500px", width: "100%" }}>
        <h3 className="text-center mb-4">{isSignUp ? "Sign Up" : "Sign In"}</h3>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <div className="form-check form-switch mb-4">
          <input
            className="form-check-input"
            type="checkbox"
            checked={useOtp}
            onChange={() => setUseOtp(!useOtp)}
            id="otpToggle"
          />
          <label className="form-check-label" htmlFor="otpToggle">
            Use OTP Login
          </label>
        </div>

        <form onSubmit={handleSubmit}>
          {!useOtp && (
            <div className="mb-3 row align-items-center">
              <label className="col-sm-4 col-form-label">Academy Name</label>
              <div className="col-sm-8">
                <input
                  type="text"
                  className="form-control rounded"
                  name="academyName"
                  value={formData.academyName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          )}

          {isSignUp && !useOtp && (
            <>
              <div className="mb-3 row align-items-center">
                <label className="col-sm-4 col-form-label">Admin Name</label>
                <div className="col-sm-8">
                  <input
                    type="text"
                    className="form-control rounded"
                    name="adminName"
                    value={formData.adminName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="mb-3 row align-items-center">
                <label className="col-sm-4 col-form-label">Email</label>
                <div className="col-sm-8">
                  <input
                    type="email"
                    className="form-control rounded"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="mb-3 row align-items-center">
                <label className="col-sm-4 col-form-label">Phone</label>
                <div className="col-sm-8">
                  <input
                    type="text"
                    className="form-control rounded"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </>
          )}

          {!useOtp && (
            <>
              <div className="mb-3 row align-items-center">
                <label className="col-sm-4 col-form-label">Username</label>
                <div className="col-sm-8">
                  <input
                    type="text"
                    className="form-control rounded"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="mb-3 row align-items-center">
                <label className="col-sm-4 col-form-label">Password</label>
                <div className="col-sm-8">
                  <input
                    type="password"
                    className="form-control rounded"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </>
          )}

          {useOtp && (
            <div className="alert alert-info text-center">
              OTP authentication will be implemented here.
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary w-100 rounded"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            ) : (
              isSignUp ? "Register" : "Login"
            )}
          </button>
        </form>

        <div className="text-center mt-3">
          <button
            className="btn btn-link"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
          >
            {isSignUp
              ? "Already have an account? Sign In"
              : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
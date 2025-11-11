import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import Student from './components/Student';
import Teacher from './components/Teacher';
import Batch from './components/Batch';
import Fee from './components/Fee';
import AttendanceDashboard from './components/AttendanceDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/admin/students" element={<Student />} />
        <Route path="/admin/teachers" element={<Teacher />} />
        <Route path="/admin/batches" element={<Batch />} />
        <Route path="/admin/fees" element={<Fee />} />
        <Route path="/admin/attendance" element={<AttendanceDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;

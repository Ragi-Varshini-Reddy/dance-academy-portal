import { useNavigate } from 'react-router-dom';
import Button from 'react-bootstrap/Button';

const cards = [
  { name: 'Student', icon: '👩‍🎓', path: '/admin/students' },
  { name: 'Teacher', icon: '👩‍🏫', path: '/admin/teachers' },
  { name: 'Batch', icon: '📅', path: '/admin/batches' },
  { name: 'Fee', icon: '💰', path: '/admin/fees' },
  { name: 'Attendance', icon: '📝', path: '/admin/attendance' }
];

const AdminDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div style={{ height: '100vh', backgroundColor: '#f8f9fa', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem', position: 'relative' }}>
      <Button variant="outline-danger" onClick={handleLogout} style={{ position: 'fixed', top: 30, right: 30 }}>Logout</Button>
      <h2 style={{ marginBottom: '2.5rem', color: '#2563eb' }}>Admin Dashboard</h2>
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {cards.map((card) => (
          <div
            key={card.name}
            onClick={() => navigate(card.path)}
            style={{ width: '200px', height: '160px', background: '#ffffff', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', transition: 'transform 0.2s ease' }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <div style={{ fontSize: '2.8rem' }}>{card.icon}</div>
            <div style={{ marginTop: '1rem', fontSize: '1.3rem', color: '#333' }}>{card.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;

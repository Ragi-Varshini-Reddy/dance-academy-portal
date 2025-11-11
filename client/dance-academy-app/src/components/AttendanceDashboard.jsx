import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from "react-icons/fa";
import { 
  Button, 
  Form, 
  Table, 
  Spinner, 
  Alert,
  Container,
  Row,
  Col,
} from 'react-bootstrap';
import axios from 'axios';
import { format, eachDayOfInterval, parseISO, isSameDay } from 'date-fns';

const AttendanceDashboard = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [batchDetails, setBatchDetails] = useState(null);
  const [students, setStudents] = useState([]);
  const [sessionDates, setSessionDates] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState({
    batches: false,
    details: false,
    attendance: false
  });
  const [error, setError] = useState(null);
  const [academyId, setAcademyId] = useState('');
  const [hoveredDate, setHoveredDate] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [showCustomTooltip, setShowCustomTooltip] = useState(false);

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

  // Fetch all batches for the academy
  useEffect(() => {
    if (!academyId) return;

    const fetchBatches = async () => {
      try {
        setLoading(prev => ({ ...prev, batches: true }));
        setError(null);
        
        const config = getAdminConfig();
        const response = await axios.get(`${BASE_URL}/batch-api/batches`, {
          ...config,
          params: { academy: academyId }
        });
        setBatches(response.data);
      } catch (error) {
        console.error('Error fetching batches:', error);
        setError(error.response?.data?.message || error.message || 'Failed to load batches');
        setBatches([]);
      } finally {
        setLoading(prev => ({ ...prev, batches: false }));
      }
    };
    fetchBatches();
  }, [academyId]);

  // Fetch batch details when selected
  useEffect(() => {
    if (!selectedBatch || !academyId) return;

    const fetchBatchDetails = async () => {
      try {
        setLoading(prev => ({ ...prev, details: true }));
        setError(null);
        
        const config = getAdminConfig();
        
        const [batchResponse, attendanceResponse] = await Promise.all([
          axios.get(`${BASE_URL}/batch-api/batches/${selectedBatch}`, {
            ...config,
            params: { academy: academyId }
          }),
          axios.get(`${BASE_URL}/attendance-api/attendance-all/${selectedBatch}`, {
            ...config,
            params: { academy: academyId }
          })
        ]);
        
        if (!batchResponse.data) {
          throw new Error('Batch not found');
        }
        
        setBatchDetails(batchResponse.data);
        setStudents(batchResponse.data.students || []);
        setAttendanceRecords(attendanceResponse.data || []);
        calculateSessionDates(batchResponse.data);
      } catch (error) {
        console.error('Error fetching batch details:', error);
        setError(error.response?.data?.message || error.message || 'Failed to load data');
        resetBatchData();
      } finally {
        setLoading(prev => ({ ...prev, details: false }));
      }
    };

    fetchBatchDetails();
  }, [selectedBatch, academyId]);

  // Calculate session dates based on batch schedule - ONLY conducted dates up to current date
  const calculateSessionDates = (batch) => {
    try {
      if (!batch?.days?.length || !batch.startDate || !batch.endDate) {
        setSessionDates([]);
        return;
      }

      const start = parseISO(batch.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to start of day
      
      // Use the earlier of batch end date or today
      const endDate = parseISO(batch.endDate);
      const end = endDate > today ? today : endDate;
      
      // If start date is in the future, no sessions to show
      if (start > today) {
        setSessionDates([]);
        return;
      }
      
      const allDates = eachDayOfInterval({ start, end });
      const batchDays = batch.days.map(d => d.toLowerCase());
      
      // Filter only dates when batch is conducted AND only past/present dates
      const validDates = allDates.filter(date => {
        const dayOfWeek = format(date, 'EEEE').toLowerCase();
        return batchDays.includes(dayOfWeek) && date <= today;
      });
      
      setSessionDates(validDates);
    } catch (error) {
      console.error('Date calculation error:', error);
      setSessionDates([]);
    }
  };

  // Group dates by month for header display
  const groupDatesByMonth = () => {
    if (!sessionDates || !Array.isArray(sessionDates)) return {};
    
    const grouped = {};
    sessionDates.forEach(date => {
      const monthYear = format(date, 'MMMM yyyy');
      if (!grouped[monthYear]) {
        grouped[monthYear] = [];
      }
      grouped[monthYear].push(date);
    });
    return grouped;
  };

  const monthGroups = useMemo(() => groupDatesByMonth(), [sessionDates]);

  // Get notes for a specific date
  const getNotesForDate = (date) => {
    const record = attendanceRecords.find(record => 
      isSameDay(parseISO(record.date), date)
    );
    return record?.notes || '';
  };

  // Handle mouse enter for date cells
  const handleDateMouseEnter = (date, event) => {
    const notes = getNotesForDate(date);
    if (notes) {
      setHoveredDate(date);
      setHoverPosition({
        x: event.clientX,
        y: event.clientY
      });
      setShowCustomTooltip(true);
    }
  };

  // Handle mouse leave for date cells
  const handleDateMouseLeave = () => {
    setShowCustomTooltip(false);
    setHoveredDate(null);
  };

  // Get attendance status for a student on a specific date
  const getAttendanceStatus = (studentId, date) => {
    try {
      if (!attendanceRecords || !studentId || !date) return null;
      
      // Find attendance record for this date
      const record = attendanceRecords.find(record => 
        isSameDay(parseISO(record.date), date)
      );
      
      if (!record || !record.attendance) return null;
      
      // Find student's attendance in this record
      const studentRecord = record.attendance.find(a => 
        a.studentId?._id?.toString() === studentId?.toString() || 
        a.studentId?.toString() === studentId?.toString()
      );
      
      return studentRecord?.present;
    } catch (error) {
      console.error('Error getting attendance status:', error);
      return null;
    }
  };

  const resetBatchData = () => {
    setBatchDetails(null);
    setStudents([]);
    setSessionDates([]);
    setAttendanceRecords([]);
  };

  const handleBatchChange = (e) => {
    setSelectedBatch(e.target.value);
    resetBatchData();
  };

  return (
    <Container className="py-4" style={{ minHeight: '100vh' }}>
      <Row className="mb-4">
        <Col>
          <div className="d-flex align-items-center gap-2" style={{ cursor: 'pointer', width: 'max-content' }} onClick={() => navigate('/admin')}>
            <FaArrowLeft size={20} />
            <h4 className="mb-0 fw-bold">Attendance Management</h4>
          </div>
        </Col>
      </Row>

      {error && (
        <Row className="mb-3">
          <Col>
            <Alert variant="danger" onClose={() => setError(null)} dismissible>
              {error}
            </Alert>
          </Col>
        </Row>
      )}

      <Row className="mb-4">
        <Col md={6}>
          <Form.Group controlId="batchSelect">
            <Form.Label>Select Batch</Form.Label>
            <Form.Control
              as="select"
              value={selectedBatch}
              onChange={handleBatchChange}
              disabled={loading.batches}
            >
              <option value="" disabled>{loading.batches ? 'Loading batches...' : 'Select a batch'}</option>
              {batches.map(batch => (
                <option key={batch._id} value={batch._id}>
                  {batch.name} ({format(new Date(batch.startDate), 'MMM yyyy')} - {format(new Date(batch.endDate), 'MMM yyyy')})
                </option>
              ))}
            </Form.Control>
          </Form.Group>
        </Col>
      </Row>

      {loading.details && (
        <Row className="mb-3">
          <Col className="text-center">
            <Spinner animation="border" />
            <span className="ms-2">Loading batch details...</span>
          </Col>
        </Row>
      )}

      {batchDetails && (
        <>
          <Row className="mb-3">
            <Col>
              <h4>{batchDetails.name}</h4>
              <p className="text-muted">
                Days: {batchDetails.days?.join(', ') || 'Not specified'} | 
                Time: {batchDetails.timeSlot || 'Not specified'} | 
                Students: {students.length}
              </p>
            </Col>
          </Row>

          {sessionDates.length > 0 ? (
            <div className="table-responsive mt-4">
              <Table bordered hover responsive className="text-center align-middle">
                <thead>
                  <tr>
                    <th
                      rowSpan={2}
                      style={{
                        position: 'sticky',
                        left: 0,
                        backgroundColor: '#f8f9fa',
                        zIndex: 2,
                        verticalAlign: 'middle',
                        textAlign: 'center',
                        minWidth: '150px'
                      }}
                    >
                      <strong>Student Name</strong>
                    </th>
                    {Object.entries(monthGroups).map(([monthYear, dates]) => (
                      <th
                        key={monthYear}
                        colSpan={dates.length}
                        style={{
                          backgroundColor: '#e9ecef',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          borderBottom: '1px solid #dee2e6'
                        }}
                      >
                        {monthYear}
                      </th>
                    ))}
                  </tr>

                  <tr>
                    {sessionDates.map((date) => (
                      <th 
                        key={date.toString()}
                        style={{ 
                          minWidth: '40px', 
                          cursor: 'pointer',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => handleDateMouseEnter(date, e)}
                        onMouseLeave={handleDateMouseLeave}
                      >
                        <div className="fw-bold">{format(date, 'dd')}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {format(date, 'EEE')}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.length > 0 ? (
                    students.map((student) => (
                      <tr key={student._id}>
                        <td
                          style={{
                            position: 'sticky',
                            left: 0,
                            backgroundColor: '#fff',
                            zIndex: 1,
                            textAlign: 'left',
                            paddingLeft: '12px',
                            fontWeight: 500
                          }}
                        >
                          {student.name}
                        </td>
                        {sessionDates.map((date) => {
                          const status = getAttendanceStatus(student._id, date);
                          return (
                            <td
                              key={`${student._id}-${date}`}
                              style={{
                                backgroundColor:
                                  status === true
                                    ? 'rgba(40, 167, 69, 0.1)'
                                    : status === false
                                    ? 'rgba(220, 53, 69, 0.1)'
                                    : 'transparent'
                              }}
                              onMouseEnter={(e) => handleDateMouseEnter(date, e)}
                              onMouseLeave={handleDateMouseLeave}
                            >
                              {status === true ? (
                                <span className="text-success fw-bold">P</span>
                              ) : status === false ? (
                                <span className="text-danger fw-bold">A</span>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={sessionDates.length + 1} className="text-center text-muted py-4">
                        No students in this batch
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          ) : (
            <Row>
              <Col>
                <Alert variant="info">
                  {batchDetails.startDate && new Date(batchDetails.startDate) > new Date() 
                    ? "This batch hasn't started yet." 
                    : "No session dates found for this batch in the current date range."}
                </Alert>
              </Col>
            </Row>
          )}
        </>
      )}

      {/* Custom tooltip that appears on hover */}
      {showCustomTooltip && hoveredDate && (
        <div
          style={{
            position: 'fixed',
            top: hoverPosition.y + 10,
            left: hoverPosition.x + 10,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '14px',
            zIndex: 9999,
            maxWidth: '300px',
            pointerEvents: 'none'
          }}
        >
          <div className="fw-bold mb-1">
            {format(hoveredDate, 'MMMM d, yyyy (EEEE)')}
          </div>
          <div>{getNotesForDate(hoveredDate)}</div>
        </div>
      )}
    </Container>
  );
};

export default AttendanceDashboard;
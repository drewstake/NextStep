import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import { TokenContext } from '../components/TokenContext';
import axios from 'axios';
import '../styles/EmployerApplicationTracker.css';
import NotificationBanner from '../components/NotificationBanner';

const EmployerApplicationTracker = () => {
  const { token } = useContext(TokenContext);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const initialApplications = [
    {
      id: 1,
      applicantName: "John Doe",
      position: "Software Engineer",
      dateApplied: "2025-01-10",
      status: "Interview Scheduled",
      notes: "Interview scheduled for 2025-01-20",
      resume: "https://example.com/resumes/john_doe.pdf",
      editing: false,
    },
    {
      id: 2,
      applicantName: "Jane Smith",
      position: "Frontend Developer",
      dateApplied: "2025-01-12",
      status: "Under Review",
      notes: "Review in progress",
      resume: "https://example.com/resumes/jane_smith.pdf",
      editing: false,
    },
    {
      id: 3,
      applicantName: "Alice Johnson",
      position: "Backend Developer",
      dateApplied: "2025-01-15",
      status: "Rejected",
      notes: "Not a good fit for the role",
      resume: "https://example.com/resumes/alice_johnson.pdf",
      editing: false,
    },
    {
      id: 4,
      applicantName: "Bob Brown",
      position: "Full Stack Developer",
      dateApplied: "2025-01-18",
      status: "Offer Extended",
      notes: "Offer extended, awaiting response",
      resume: "https://example.com/resumes/bob_brown.pdf",
      editing: false,
    },
  ];

  const [applications, setApplications] = useState(initialApplications);
  const [editedValues, setEditedValues] = useState({});
  const [editingId, setEditingId] = useState(null);
  const editingRowRef = useRef(null);

  const statusOptions = ["Interview Scheduled", "Under Review", "Rejected", "Offer Extended"];

  const handleEdit = (id) => {
    // Ensure only one row is in edit mode at a time.
    setApplications(applications.map(app => ({ ...app, editing: false })));
    setApplications(applications => 
      applications.map(app => app.id === id ? { ...app, editing: true } : app)
    );
    setEditingId(id);
    const app = applications.find(app => app.id === id);
    setEditedValues(prev => ({ ...prev, [id]: { status: app.status, notes: app.notes } }));
  };

  const handleCancel = useCallback(
    (id) => {
      setApplications((prevApps) =>
        prevApps.map((app) =>
          app.id === id ? { ...app, editing: false } : app
        )
      );
      setEditingId(null);
      setEditedValues((prev) => {
        const newValues = { ...prev };
        delete newValues[id];
        return newValues;
      });
    },
    [setApplications, setEditingId, setEditedValues] // and any dependencies if needed (e.g., applications)
  );

  const handleSave = (id) => {
    const newValues = editedValues[id];
    setApplications(applications.map(app => app.id === id ? { ...app, ...newValues, editing: false } : app));
    setEditingId(null);
    setEditedValues(prev => {
      const newValues = { ...prev };
      delete newValues[id];
      return newValues;
    });
    setMessage("Application updated successfully");
  };

  const handleChange = (id, field, value) => {
    setEditedValues(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleViewResume = async (resumeUrl) => {
    try {
      const response = await axios.get(resumeUrl, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error viewing resume:', error);
      setError("Resume not available");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (editingRowRef.current && !editingRowRef.current.contains(event.target)) {
        if (editingId !== null) {
          handleCancel(editingId);
        }
      }
    };

    if (editingId !== null) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editingId, handleCancel]);

  return (
    <div className="employer-application-tracker-container">
      {error && <NotificationBanner message={error} type="error" onDismiss={() => setError(null)} />}
      {message && <NotificationBanner message={message} type="success" onDismiss={() => setMessage(null)} />}
      <h1>Employer Application Tracker</h1>
      <p>Track all job applications for your postings below:</p>
      <table className="employer-tracker-table">
        <thead>
          <tr>
            <th>Applicant Name</th>
            <th>Position</th>
            <th>Date Applied</th>
            <th>Status</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => {
            if (application.editing) {
              return (
                <tr key={application.id} ref={editingRowRef}>
                  <td>{application.applicantName}</td>
                  <td>{application.position}</td>
                  <td>{application.dateApplied}</td>
                  <td>
                    <select
                      value={editedValues[application.id]?.status || application.status}
                      onChange={(e) => handleChange(application.id, 'status', e.target.value)}
                    >
                      {statusOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={editedValues[application.id]?.notes || application.notes}
                      onChange={(e) => handleChange(application.id, 'notes', e.target.value)}
                    />
                  </td>
                  <td>
                    <button onClick={() => handleSave(application.id)}>Save</button>
                    <button onClick={() => handleViewResume(application.resume)}>View Resume</button>
                  </td>
                </tr>
              );
            } else {
              return (
                <tr key={application.id}>
                  <td>{application.applicantName}</td>
                  <td>{application.position}</td>
                  <td>{application.dateApplied}</td>
                  <td>{application.status}</td>
                  <td>{application.notes}</td>
                  <td>
                    <button onClick={() => handleEdit(application.id)}>Edit</button>
                    <button onClick={() => handleViewResume(application.resume)}>View Resume</button>
                  </td>
                </tr>
              );
            }
          })}
        </tbody>
      </table>
    </div>
  );
};

export default EmployerApplicationTracker;

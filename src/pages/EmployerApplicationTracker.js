import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosConfig';
import '../styles/EmployerApplicationTracker.css';
import NotificationBanner from '../components/NotificationBanner';

const EmployerApplicationTracker = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [editedValues, setEditedValues] = useState({});
  const [editingId, setEditingId] = useState(null);
  const editingRowRef = useRef(null);

  const statusOptions = ["Pending", "Reviewed", "Interviewing", "Offered", "Rejected"];

  // Fetch applications on component mount
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get('/employer/applications');
        setApplications(response.data);
      } catch (error) {
        console.error('Error fetching applications:', error);
        setError('Failed to load applications. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  const handleEdit = (id) => {
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
    []
  );

  const handleSave = async (id) => {
    try {
      const newValues = editedValues[id];
      await axiosInstance.put(`/employer/applications/${id}`, {
        status: newValues.status,
        notes: newValues.notes
      });

      setApplications(applications.map(app => 
        app.id === id ? { ...app, ...newValues, editing: false } : app
      ));
      setEditingId(null);
      setEditedValues(prev => {
        const newValues = { ...prev };
        delete newValues[id];
        return newValues;
      });
      setMessage("Application updated successfully");
    } catch (error) {
      console.error('Error updating application:', error);
      setError('Failed to update application. Please try again.');
    }
  };

  const handleChange = (id, field, value) => {
    setEditedValues(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleViewResume = async (applicantId) => {
    try {
      if (!applicantId) {
        setError("TBD ");
        return;
      }
      navigate(`/applicant-profile/${applicantId}`);
    } catch (error) {
      console.error('Error viewing resume:', error);
      setError("Failed to open resume");
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

  const ApplicantNameLink = ({ name, applicantId }) => (
    <button 
      onClick={() => handleViewResume(applicantId)}
      className="applicant-name-link"
      data-applicant-id={applicantId}
    >
      {name}
    </button>
  );

  const renderTableRow = (application) => {
    const commonCells = (
      <>
        <td>
          <ApplicantNameLink 
            name={application.applicantName}
            applicantId={application.applicantId}
          />
        </td>
        <td>{application.position}</td>
        <td>{application.dateApplied}</td>
      </>
    );

    if (application.editing) {
      return (
        <tr key={application.id} ref={editingRowRef}>
          {commonCells}
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
          </td>
        </tr>
      );
    }

    return (
      <tr key={application.id}>
        {commonCells}
        <td>{application.status}</td>
        <td>{application.notes}</td>
        <td>
          <button onClick={() => handleEdit(application.id)}>Edit</button>
        </td>
      </tr>
    );
  };

  if (loading) {
    return <div className="loading">Loading applications...</div>;
  }

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
          {applications.map(renderTableRow)}
        </tbody>
      </table>
    </div>
  );
};

export default EmployerApplicationTracker;

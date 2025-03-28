import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/Details.css";
import NotificationBanner from "../components/NotificationBanner";
import { TokenContext } from '../components/TokenContext';

const Details = () => {
  const { jobId, returnTo } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const { token } = useContext(TokenContext);

  const handleBackToJobs = async () => {
    if (returnTo === "jobs") {
      navigate("/jobs");
    } else {
      navigate(`/`);
    }
  };

  const handleApplyNow = async () => {
    try {
      await axios.post('http://localhost:4000/jobsTracker', {
        _id: job._id,
        swipeMode: 1 // 1 for apply
      }, {
        headers: {
          'Authorization': `Bearer ${token}` // Ensure token is available
        }
      });
      setMessage('Application successful!');
      // Optionally, navigate to a confirmation page or show a success message
    } catch (error) {
      setError('Error applying for job: ' + error.response ? error.response.data.error : error.message);
      // Optionally, show an error message to the user
    }
  };

  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        const response = await axios.get(`http://localhost:4000/jobs/${jobId}`);
        setJob(response.data);
      } catch (error) {
        console.error("Error fetching job details:", error);
        setError("Failed to load job details. Please try again later.");
      }
    };

    fetchJobDetails();
  }, [jobId]);

  if (!job) {
    return (
      <div className="details-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="details-container">
      {error && <NotificationBanner message={error} type="error" onDismiss={() => setError(null)} />}
      {message && <NotificationBanner message={message} type="success" onDismiss={() => setMessage(null)} />}

      <div className="details-content">
        <button className="close-button" onClick={handleBackToJobs}>
          ×
        </button>

        <div className="job-header">
          <h1>{job.title}</h1>
          <div className="company-info">
            <a href={job.companyWebsite} target="_blank" rel="noopener noreferrer">
              {job.companyName}
            </a>
            <span className="job-location">{job.locations.join(", ")}</span>
          </div>
        </div>

        <div className="job-overview">
          <div className="overview-item">
            <strong>Salary Range:</strong> {job.salaryRange}
          </div>
          <div className="overview-item">
            <strong>Schedule:</strong> {job.schedule}
          </div>
          {job.benefits && job.benefits.length > 0 && (
            <div className="overview-item">
              <strong>Benefits:</strong> {job.benefits.join(", ")}
            </div>
          )}
        </div>

        <div className="detailed-section">
          <h2>Job Summary</h2>
          <p>{job.jobDescription}</p>
        </div>

        {job.skills && job.skills.length > 0 && (
          <div className="detailed-section">
            <h2>Required Skills</h2>
            <p>{job.skills.join(", ")}</p>
          </div>
        )}

        <div className="action-buttons">
          <button onClick={handleBackToJobs} className="back-button">
            Back to Jobs
          </button>
          <button onClick={handleApplyNow} className="apply-button">
            Apply Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default Details;

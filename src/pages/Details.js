import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/Details.css";

const Details = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);

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

  if (error) {
    return (
      <div className="details-container">
        <div className="error-message">{error}</div>
        <button onClick={() => navigate("/jobs")} className="back-button">
          Back to Jobs
        </button>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="details-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="details-container">
      <div className="details-content">
        <button className="close-button" onClick={() => navigate("/jobs")}>
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
          <button onClick={() => navigate("/jobs")} className="back-button">
            Back to Jobs
          </button>
          <button className="apply-button">
            Apply Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default Details;

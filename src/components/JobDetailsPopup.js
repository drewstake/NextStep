import React from 'react';
import '../styles/JobDetailsPopup.css';

const JobDetailsPopup = ({ job, onClose }) => {
  if (!job) return null;

  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <button className="close-button" onClick={onClose}>×</button>
        <h1 className="popup-title">Job Details</h1>

        <div className="job-details">
        <div className="detail-section">
            <h4>Job Title</h4>
            <p>{job.title}</p>
          </div>
          <div className="detail-section">
            <h4>Location(s)</h4>
            <p>{Array.isArray(job.locations) ? job.locations.join(', ') : job.locations}</p>
          </div>

          <div className="detail-section">
            <h4>Salary Range</h4>
            <p>{job.salaryRange}</p>
          </div>

          <div className="detail-section">
            <h4>Schedule</h4>
            <p>{job.schedule}</p>
          </div>

          <div className="detail-section">
            <h4>Start Date</h4>
            <p>{job.startDate}</p>
          </div>

          <div className="detail-section">
            <h4>Benefits</h4>
            <p>{job.benefits.join(', ')}</p>
          </div>

          <div className="detail-section">
            <h4>Required Skills</h4>
            <p>{job.skills.join(', ')}</p>
          </div>

          <div className="detail-section">
            <h4>Job Description</h4>
            <p>{job.jobDescription}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetailsPopup; 
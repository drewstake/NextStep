import React from "react";
import "../styles/JobCard.css";

const JobCard = ({
  _id,
  title,
  companyName,
  locations,
  salaryRange,
  jobType,
  schedule,
  jobDescription,
  skills,
  benefits,
  onSkip,
  onApply,
  currentIndex,
  totalJobs,
}) => {
  return (
    <div className="job-card">
      <div className="job-content">
        <h1>{title}</h1>
        <h2>{companyName}</h2>

        <div className="meta-info">
          <div className="meta-item">
            <span>📍 {locations}</span>
          </div>
          <div className="meta-item">
            <span>💰 {salaryRange}</span>
          </div>
          <div className="meta-item">
            <span>⏰ {schedule}</span>
          </div>
        </div>

        <div className="job-description">
          <h3>Job Description</h3>
          <p>{jobDescription}</p>
        </div>

        <div className="skills-section">
          <h3>Required Skills</h3>
          <div className="skills-list">
            {skills &&
              skills.map((skill, index) => (
                <div key={index} className="skill-item">
                  {skill}
                </div>
              ))}
          </div>
        </div>

        <div className="action-buttons">
          <button className="skip-button" onClick={() => onSkip(_id)}>
            ← Skip
          </button>
          <button className="apply-button" onClick={() => onApply(_id)}>
            Apply →
          </button>
        </div>
      </div>

      {currentIndex && totalJobs && (
        <div className="job-counter">
          {currentIndex} of {totalJobs} jobs
        </div>
      )}
    </div>
  );
};

export default JobCard;

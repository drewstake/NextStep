import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/JobCard.css";
import { TokenContext } from "./TokenContext";

const JobCard = ({
  job_id,
  title,
  companyName,
  companyWebsite,
  salaryRange,
  benefits,
  locations,
  schedule,
  jobDescription,
  skills,
  onApplyClick,
}) => {
  const navigate = useNavigate();
  const { employerFlag } = useContext(TokenContext);
  const [slide, setSlide] = useState(false);
  const [showDetailsWindow, setShowDetailsWindow] = useState(false);

  // Basic description is used as a summary fallback
  const description =
    jobDescription ||
    "We are seeking an experienced professional to join our team. In this role, you will work on cutting-edge projects, collaborate with a talented group, and contribute to innovative solutions. Responsibilities include project management, client engagement, and strategic planning. Enjoy a competitive salary, excellent benefits, and a dynamic work environment.";

  const handleApply = () => {
    console.log("Clicked job id " + job_id);
    onApplyClick(job_id);
  };

  // Toggle details window and job card slide
  const handleDetails = () => {
    navigate(`/jobs/${job_id}`);
  };

  return (
    <div className="job-card-container">
      <div className={`job-card ${slide ? "slide-left" : ""}`}>
        <div className="job-card-header">
          <div className="header-left">
            <h2 className="job-title">{title}</h2>
            <div className="company-info">
              <a
                href={companyWebsite}
                target="_blank"
                rel="noopener noreferrer"
              >
                {companyName}
              </a>
              <span className="job-location">{locations.join(", ")}</span>
            </div>
          </div>
          {!employerFlag && (
            <div className="header-right">
              <button onClick={handleApply} className="apply-button">
                Apply
              </button>
            </div>
          )}
        </div>
        <div className="job-card-body">
          <div className="job-details">
            <div className="job-info-row">
              <p className="salary-range">
                <strong>Salary:</strong> {salaryRange}
              </p>
              <p className="job-schedule">
                <strong>Schedule:</strong> {schedule}
              </p>
            </div>
            {benefits && benefits.length > 0 && (
              <p className="job-benefits">
                <strong>Benefits:</strong> {benefits.join(", ")}
              </p>
            )}
          </div>
          <div className="job-description">
            <p>{description}</p>
          </div>
          {skills && skills.length > 0 && (
            <div className="job-skills">
              <strong>Skills/Requirements:</strong>
              <ul>
                {skills.map((skill, index) => (
                  <li key={index}>{skill}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="job-card-footer">
          <button onClick={handleDetails} className="details-button">
            Details
          </button>
        </div>
      </div>
      {showDetailsWindow && (
        <div className="details-window">
          <button className="close-button" onClick={handleDetails}>
            ×
          </button>
          {/* Removed the "Job Details" header */}
          <div className="detailed-section">
            <h4>Job Summary</h4>
            <p>{description}</p>
          </div>
          <div className="detailed-section">
            <h4>Responsibilities</h4>
            <ul>
              <li>Design and develop high-quality software solutions.</li>
              <li>
                Collaborate with cross-functional teams to define product goals.
              </li>
              <li>
                Maintain code integrity and ensure best practices are followed.
              </li>
              <li>Identify and resolve performance bottlenecks and bugs.</li>
            </ul>
          </div>
          <div className="detailed-section">
            <h4>Qualifications</h4>
            <ul>
              <li>Bachelor's degree in Computer Science or a related field.</li>
              <li>
                Proven experience with JavaScript, React, and modern front-end
                frameworks.
              </li>
              <li>Strong analytical and problem-solving skills.</li>
              <li>Excellent communication and teamwork abilities.</li>
            </ul>
          </div>
          <div className="detailed-section">
            <h4>Benefits</h4>
            <p>
              Competitive salary, comprehensive health insurance, 401(k) with
              company match, paid time off, and opportunities for professional
              growth.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobCard;

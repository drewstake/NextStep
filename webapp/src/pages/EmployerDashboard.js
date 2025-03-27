// File: /src/pages/EmployerDashboard.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/EmployerDashboard.css';

const EmployerDashboard = () => {
  const navigate = useNavigate();

  const functions = [
    { label: "Create Job Posting", action: () => { /* TODO: Hook up create job posting functionality */ } },
    { label: "Manage Job Postings", action: () => { /* TODO: Hook up manage job postings functionality */ } },
    { label: "Applicant Tracking", action: () => { navigate('/employer-application-tracker'); } },
    { label: "Communication Tools", action: () => { /* TODO: Hook up communication tools functionality */ } },
    { label: "Analytics & Reporting", action: () => { /* TODO: Hook up analytics & reporting functionality */ } },
    { label: "Candidate Profiles", action: () => { /* TODO: Hook up candidate profiles functionality */ } },
    { label: "Company Profile", action: () => { /* TODO: Hook up company profile & branding functionality */ } },
    { label: "Integrations", action: () => { /* TODO: Hook up integrations functionality */ } }
  ];

  return (
    <div className="employer-dashboard-container">
      <h1>Employer Dashboard</h1>
      <div className="dashboard-boxes">
        {functions.map((func, index) => (
          <div key={index} className="dashboard-box" onClick={func.action}>
            {func.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmployerDashboard;

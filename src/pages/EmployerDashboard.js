// File: /src/pages/EmployerDashboard.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/EmployerDashboard.css';

const EmployerDashboard = () => {
  const navigate = useNavigate();

  const functions = [
    { label: "Manage Job Postings", action: () => { navigate('/manage-job-postings'); }, isUrl: true },
    { label: "Applicant Tracking", action: () => { navigate('/employer-application-tracker'); }, isUrl: true },
    { label: "Communication Tools", action: () => { /* TODO: Hook up communication tools functionality */ }, isUrl: false },
    { label: "Analytics & Reporting", action: () => { /* TODO: Hook up analytics & reporting functionality */ }, isUrl: false },
    { label: "Company Profile", action: () => { /* TODO: Hook up company profile & branding functionality */ }, isUrl: false },
    { label: "Integrations", action: () => { /* TODO: Hook up integrations functionality */ }, isUrl: false }
  ];

  return (
    <div className="employer-dashboard-container">
      <h1>Employer Dashboard</h1>
      <div className="dashboard-boxes">
        {functions.map((func, index) => (
          <div 
            key={index} 
            className={`dashboard-box ${func.isUrl ? 'has-url' : ''}`} 
            onClick={func.action}
          >
            {func.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmployerDashboard;

// File: /src/pages/EmployerDashboard.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/EmployerDashboard.css';

const EmployerDashboard = () => {
  const navigate = useNavigate();

  const functions = [
    { label: "Manage Job Postings", action: () => { navigate('/manage-job-postings'); }, isUrl: true },
    { label: "Applicant Tracking", action: () => { navigate('/employer-application-tracker'); }, isUrl: true },
/*     { label: "Communication Tools", action: () => { navigate('/employer-messenger'); }, isUrl: true },
 */    { label: "Company Profile", action: () => { navigate('/company-profile'); }, isUrl: true },
    { label: "Manage Users", action: () => { navigate('/manage-users'); }, isUrl: true },
   /*  { label: "Integrations", action: () => {  }, isUrl: false } */
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

// File: /src/pages/ApplicationTracker.js
import React from 'react';
import '../styles/ApplicationTracker.css';

const ApplicationTracker = () => {
  const fakeJobs = [
    {
      id: 1,
      title: "Software Engineer",
      company: "Tech Corp",
      dateApplied: "2025-01-10",
      status: "Interview",
      notes: "Follow up next week"
    },
    {
      id: 2,
      title: "Frontend Developer",
      company: "Web Solutions",
      dateApplied: "2025-01-12",
      status: "Pending",
      notes: "Waiting for feedback"
    },
    {
      id: 3,
      title: "Backend Developer",
      company: "Data Systems",
      dateApplied: "2025-01-15",
      status: "Rejected",
      notes: "Sent thank you note"
    },
    {
      id: 4,
      title: "Full Stack Developer",
      company: "Innovatech",
      dateApplied: "2025-01-18",
      status: "Offer",
      notes: "Offer received, reviewing terms"
    }
  ];

  return (
    <div className="application-tracker-container">
      <h1>Application Tracker</h1>
      <p>Track your job applications below:</p>
      <table className="tracker-table">
        <thead>
          <tr>
            <th>Job Title</th>
            <th>Company</th>
            <th>Date Applied</th>
            <th>Status</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {fakeJobs.map(job => (
            <tr key={job.id}>
              <td>{job.title}</td>
              <td>{job.company}</td>
              <td>{job.dateApplied}</td>
              <td>{job.status}</td>
              <td>{job.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ApplicationTracker;

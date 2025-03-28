// File: /src/pages/BrowseJobs.js
import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import JobCard from '../components/JobCard';
import '../styles/BrowseJobs.css';
import { TokenContext } from '../components/TokenContext';
import NotificationBanner from '../components/NotificationBanner';

// Define swipe mode constants
const APPLY = 1;

const BrowseJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { token } = useContext(TokenContext);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        // Replace the URL with your actual API endpoint.
        const response = await axios.get('http://localhost:4000/jobs?keyword=');
        setJobs(response.data);
      } catch (error) {
        console.error('Error fetching jobs:', error);
      }
    };

    fetchJobs();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    // For now, just log the search query. Later, you could use this to filter the jobs or make a new API call.
    console.log('Searching for:', searchQuery);
    const response = await axios.get('http://localhost:4000/jobs?q=' + searchQuery);
    setJobs(response.data);
  };

  const handleApply = async (jobId) => {
    if (!token) {
      setError("Please sign in to apply for jobs. If you don't have an account, you can create one.");
      return;
    }
    try {
      const response = await axios.post('http://localhost:4000/jobsTracker', { _id: jobId, swipeMode: APPLY }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`${response.status} ${response.statusText}\n`);
      setMessage("Applied successfully!");
    } catch (error) {
      if (error.response && error.response.status === 409) {
        console.log(error.response.data.error + jobId);
        setError(error.response.data.error);
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
    }
  };

  return (
    <div className="browse-jobs-container">
      {error && <NotificationBanner message={error} type="error" onDismiss={() => setError(null)} />}
      {message && <NotificationBanner message={message} type="success" onDismiss={() => setMessage(null)} />}
      <h1>Browse Jobs</h1>

      {/* Search Bar */}
      <form className="job-search-form" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search for jobs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="job-search-input"
        />
        <button type="submit" className="job-search-button">
          Search
        </button>
      </form>

      {/* Job Listings */}
      <div className="jobs-list">
        {jobs.length > 0 ? (
          jobs.map((job) => (
            <JobCard
              key={job._id}
              job_id={job._id}
              title={job.title}
              companyName={job.companyName}
              companyWebsite={job.companyWebsite}
              salaryRange={job.salaryRange}
              benefits={job.benefits}
              locations={job.locations}
              schedule={job.schedule}
              jobDescription={job.jobDescription}
              skills={job.skills}
              onApplyClick={handleApply}
            />
          ))
        ) : (
          <p className="placeholder-text">
            
          </p>
        )}
      </div>
    </div>
  );
};

export default BrowseJobs;

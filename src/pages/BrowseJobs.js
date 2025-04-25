// File: /src/pages/BrowseJobs.js
import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import JobCard from '../components/JobCard';
import '../styles/BrowseJobs.css';
import { TokenContext } from '../components/TokenContext';
import NotificationBanner from '../components/NotificationBanner';
import { API_SERVER } from '../config';

// Define swipe mode constants
const APPLY = 1;

const BrowseJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { token, name, email } = useContext(TokenContext);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        // Initial fetch without search query
        const response = await axios.get(`${API_SERVER}/jobs`, 
          token ? {
            headers: { Authorization: `Bearer ${token}` }
          } : undefined
        );
        setJobs(response.data);
      } catch (error) {
        console.error('Error fetching jobs:', error);
      }
    };

    fetchJobs();
  }, [token]);

  const handleSearch = async (e) => {
    e.preventDefault();
    setIsSearching(true);
    setSearchQuery(searchInput); // Update the actual search query when button is clicked
    try {
      const response = await axios.get(`${API_SERVER}/jobs?q=` + searchInput, 
        token ? {
          headers: { Authorization: `Bearer ${token}` }
        } : undefined
      );
      setJobs(response.data);
    } catch (error) {
      console.error('Error searching jobs:', error);
      setError('Failed to search jobs. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleApply = async (jobId) => {
    if (!token) {
      setError("Please sign in to apply for jobs. If you don't have an account, you can create one.");
      return;
    }
    try {
      await axios.post(`${API_SERVER}/jobsTracker`, { 
        _id:jobId, 
        email,
        name,
        swipeMode: APPLY 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage("Applied successfully!");
      // Refresh the jobs list after successful application
      const response = await axios.get(`${API_SERVER}/jobs?q=` + searchQuery, 
        token ? {
          headers: { Authorization: `Bearer ${token}` }
        } : undefined
      );
      setJobs(response.data);
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
      {isSearching && <div className="search-overlay" />}
      <h1>Browse Jobs</h1>

      {/* Search Bar */}
      <form className="job-search-form" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Tell me in your own words... e.g. 'Any high paying job'"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="job-search-input"
        />
        <button type="submit" className="job-search-button" disabled={isSearching}>
          {isSearching ? 'Wait...' : 'Search'}
        </button>
      </form>

      {/* Job Count */}
      <div className="job-count-label">
        {jobs.length > 0 ? (
          <p>Found {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}</p>
        ) : (
          <p>No jobs found</p>
        )}
      </div>

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

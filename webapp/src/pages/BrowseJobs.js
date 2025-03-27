// File: /src/pages/BrowseJobs.js
import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import JobCard from '../components/JobCard';
import '../styles/BrowseJobs.css';
import { TokenContext } from '../components/TokenContext';

const BrowseJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { token } = useContext(TokenContext);

  // Fetch jobs from the database when the component mounts.
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        // Replace the URL with your actual API endpoint.
        // const response = await axios.get('http://localhost:4000/jobs?keyword=');
        // setJobs(response.data);
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
      alert("Please sign in to apply for jobs. If you don't have an account, you can create one.");
      return;
    }
    try {
      const response = await axios.post('http://localhost:4000/apply', { _id: jobId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`${response.status} ${response.statusText}\n`);
      alert("Applied successfully!");
    } catch (error) {
      //debugger;
      if (error.response && error.response.status === 409) {
        console.log(error.response.data.error + jobId);
        alert(error.response.data.error); // Display the error message from API
      } else {
        alert('An unexpected error occurred. Please try again later.');
      }
    }

  };

  return (
    <div className="browse-jobs-container">
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
            No jobs available at this time. Please check back later.
          </p>
        )}
      </div>
    </div>
  );
};

export default BrowseJobs;

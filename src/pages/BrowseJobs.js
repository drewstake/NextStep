// File: /src/pages/BrowseJobs.js
import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import JobCard from "../components/JobCard";
import "../styles/BrowseJobs.css";
import { TokenContext } from "../components/TokenContext";
import NotificationBanner from "../components/NotificationBanner";

// Define swipe mode constants
const APPLY = 1;
const IGNORE = 2;

const BrowseJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [currentJobIndex, setCurrentJobIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const { token } = useContext(TokenContext);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch jobs from the database when the component mounts
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const response = await axios.get("http://localhost:4000/jobs");
        setJobs(response.data);
        setError(null);
      } catch (err) {
        setError("Failed to fetch jobs. Please try again later.");
        console.error("Error fetching jobs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.get(
        `http://localhost:4000/jobs?q=${searchQuery}`
      );
      setJobs(response.data);
      setCurrentJobIndex(0); // Reset to first job when searching
    } catch (error) {
      console.error("Error searching jobs:", error);
      setError("Failed to search jobs. Please try again later.");
    }
  };

  const handleSkip = (jobId) => {
    setCurrentJobIndex((prev) => Math.min(prev + 1, jobs.length - 1));
  };

  const handleApply = async (jobId) => {
    if (!token) {
      setError(
        "Please sign in to apply for jobs. If you don't have an account, you can create one."
      );
      return;
    }
    try {
      const response = await axios.post('http://localhost:4000/jobsTracker', { _id: jobId, swipeMode: APPLY }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`${response.status} ${response.statusText}\n`);
      setMessage("Applied successfully!");
      // Move to next job after applying
      setCurrentJobIndex((prev) => Math.min(prev + 1, jobs.length - 1));
    } catch (error) {

      if (error.response && error.response.status === 409) {
        console.log(error.response.data.error + jobId);
        setError(error.response.data.error);
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading jobs...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  const currentJob = jobs[currentJobIndex];

  return (
    <div className="browse-jobs">
      {error && (
        <NotificationBanner
          message={error}
          type="error"
          onDismiss={() => setError(null)}
        />
      )}
      {message && (
        <NotificationBanner
          message={message}
          type="success"
          onDismiss={() => setMessage(null)}
        />
      )}
      <div className="search-container">
        <h1>Browse Jobs</h1>
        <form onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search for jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-button">
            Search
          </button>
        </form>
      </div>

      {currentJob && (
        <JobCard
          {...currentJob}
          onSkip={handleSkip}
          onApply={handleApply}
          currentIndex={currentJobIndex + 1}
          totalJobs={jobs.length}
        />
      )}
    </div>
  );
};

export default BrowseJobs;

// File: /src/pages/BrowseJobs.js
import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import JobCard from "../components/JobCard";
import "../styles/BrowseJobs.css";
import { TokenContext } from "../components/TokenContext";

const BrowseJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const { token } = useContext(TokenContext);

  // Fetch jobs from the database when the component mounts
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await axios.get("http://localhost:3001/jobs");
        setJobs(response.data);
      } catch (error) {
        console.error("Error fetching jobs:", error);
      }
    };

    fetchJobs();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.get(
        `http://localhost:3001/jobs?q=${searchQuery}`
      );
      setJobs(response.data);
      setCurrentIndex(0); // Reset to first job when searching
    } catch (error) {
      console.error("Error searching jobs:", error);
    }
  };

  const handleApply = async (jobId) => {
    if (!token) {
      alert(
        "Please sign in to apply for jobs. If you don't have an account, you can create one."
      );
      return;
    }
    try {
      await axios.post(
        "http://localhost:3001/apply",
        { _id: jobId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert("Applied successfully!");
      // Move to next job after applying
      setCurrentIndex((prev) => Math.min(prev + 1, jobs.length - 1));
    } catch (error) {
      if (error.response?.status === 409) {
        alert(error.response.data.error);
      } else {
        alert("An unexpected error occurred. Please try again later.");
      }
    }
  };

  const handleSwipe = (direction) => {
    if (direction === "right") {
      // Apply to job
      handleApply(jobs[currentIndex]._id);
    } else {
      // Skip to next job
      setCurrentIndex((prev) => Math.min(prev + 1, jobs.length - 1));
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

      <div className="jobs-stack">
        {jobs.length > 0 ? (
          <>
            <JobCard
              key={jobs[currentIndex]._id}
              {...jobs[currentIndex]}
              onSwipe={handleSwipe}
              isLast={currentIndex === jobs.length - 1}
            />
            <div className="swipe-hint">
              <span>← Skip</span>
              <span>Apply →</span>
            </div>
            <div className="jobs-progress">
              {currentIndex + 1} of {jobs.length} jobs
            </div>
          </>
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

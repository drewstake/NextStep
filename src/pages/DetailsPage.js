import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { TokenContext } from "../components/TokenContext";
import "../styles/DetailsPage.css";
import {
  Container,
  Typography,
  Box,
  Chip,
  Button,
  Grid,
  Paper,
  CircularProgress,
  Divider,
  Avatar,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  LocationOn,
  Work,
  AttachMoney,
  AccessTime,
  Share,
  BookmarkBorder,
  Bookmark,
  ArrowBack,
  CalendarToday,
  Groups,
  TrendingUp,
  School,
} from "@mui/icons-material";

const DetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useContext(TokenContext);

  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        const response = await axios.get(`http://localhost:3001/jobs/${id}`);
        setJob(response.data);
        setLoading(false);
      } catch (err) {
        setError("Failed to load job details");
        setLoading(false);
      }
    };

    fetchJobDetails();
  }, [id]);

  const handleApply = async () => {
    if (!token) {
      navigate("/login", { state: { from: `/job/${id}` } });
      return;
    }

    try {
      await axios.post(
        `http://localhost:3001/jobs/${id}/apply`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert("Application submitted successfully!");
    } catch (err) {
      alert("Failed to submit application. Please try again.");
    }
  };

  if (loading) return <div className="details-page loading">Loading...</div>;
  if (error) return <div className="details-page error">{error}</div>;
  if (!job) return <div className="details-page error">Job not found</div>;

  return (
    <div className="details-page">
      <div className="details-container">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Back to Jobs
        </button>

        <div className="job-header">
          <h1>{job.title}</h1>
          <div className="company-section">
            <h2>{job.company}</h2>
            {job.companyWebsite && (
              <a
                href={job.companyWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="company-website"
              >
                Visit Company Website
              </a>
            )}
          </div>
        </div>

        <div className="job-meta-info">
          <div className="meta-item">
            <span className="label">Location:</span>
            <span>{job.location}</span>
          </div>
          <div className="meta-item">
            <span className="label">Salary:</span>
            <span>{job.salary}</span>
          </div>
          <div className="meta-item">
            <span className="label">Job Type:</span>
            <span>{job.jobType}</span>
          </div>
          <div className="meta-item">
            <span className="label">Schedule:</span>
            <span>{job.schedule}</span>
          </div>
        </div>

        <div className="job-section">
          <h3>Job Description</h3>
          <div className="description-content">
            {job.jobDescription.split("\n").map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>

        {job.requiredSkills && job.requiredSkills.length > 0 && (
          <div className="job-section">
            <h3>Required Skills</h3>
            <ul className="skills-list">
              {job.requiredSkills.map((skill, index) => (
                <li key={index}>{skill}</li>
              ))}
            </ul>
          </div>
        )}

        {job.benefits && job.benefits.length > 0 && (
          <div className="job-section">
            <h3>Benefits</h3>
            <ul className="benefits-list">
              {job.benefits.map((benefit, index) => (
                <li key={index}>{benefit}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="apply-section">
          <button onClick={handleApply} className="apply-button">
            Apply for this Position
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailsPage;

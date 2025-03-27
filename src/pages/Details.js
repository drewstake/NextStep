import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/Details.css";

const Details = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [activities, setActivities] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [nextJob, setNextJob] = useState(null);

  useEffect(() => {
    // Fetch job details
    fetchJobDetails();
    // Fetch activities
    fetchActivities();
    // Fetch next job preview
    fetchNextJob();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`);
      const data = await response.json();
      setJob(data);
    } catch (error) {
      console.error("Error fetching job details:", error);
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/activities`);
      const data = await response.json();
      setActivities(data);
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  };

  const fetchNextJob = async () => {
    try {
      const response = await fetch("/api/jobs/next");
      const data = await response.json();
      setNextJob(data);
    } catch (error) {
      console.error("Error fetching next job:", error);
    }
  };

  const handleSwipe = async (direction) => {
    try {
      await fetch(`/api/jobs/${jobId}/swipe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ direction }),
      });
      // Refresh activities after swipe
      fetchActivities();
      // Update next job preview
      fetchNextJob();
    } catch (error) {
      console.error("Error processing swipe:", error);
    }
  };

  const handleMessage = async () => {
    try {
      await fetch(`/api/jobs/${jobId}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      // Refresh activities
      fetchActivities();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleCallInterview = async () => {
    try {
      await fetch(`/api/jobs/${jobId}/call-interview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      // Refresh activities
      fetchActivities();
    } catch (error) {
      console.error("Error scheduling call:", error);
    }
  };

  if (!job) return <div>Loading...</div>;

  return (
    <div className="details-container">
      <div className="details-header">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Back
        </button>
        <h1>{job.title}</h1>
      </div>

      <div className="job-details">
        <div className="company-info">
          <h2>{job.company}</h2>
          <p>{job.location}</p>
        </div>
        <div className="job-description">
          <h3>Description</h3>
          <p>{job.description}</p>
        </div>
        <div className="requirements">
          <h3>Requirements</h3>
          <ul>
            {job.requirements.map((req, index) => (
              <li key={index}>{req}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="activities-section">
        <h2>Recent Activities</h2>
        <div className="activities-list">
          {activities.map((activity, index) => (
            <div key={index} className="activity-item">
              <div className="activity-icon">
                {activity.type === "swipe" && "👆"}
                {activity.type === "message" && "💬"}
                {activity.type === "call" && "📞"}
              </div>
              <div className="activity-content">
                <p>{activity.description}</p>
                <span className="activity-time">{activity.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="action-buttons">
        <button onClick={() => handleSwipe("left")} className="reject-button">
          Reject
        </button>
        <button onClick={() => handleSwipe("right")} className="accept-button">
          Accept
        </button>
        <button onClick={handleMessage} className="message-button">
          Message
        </button>
        <button onClick={handleCallInterview} className="call-button">
          Schedule Call
        </button>
      </div>

      {showPreview && nextJob && (
        <div className="next-job-preview">
          <h3>Next Job Preview</h3>
          <div className="preview-card">
            <h4>{nextJob.title}</h4>
            <p>{nextJob.company}</p>
            <p>{nextJob.location}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Details;

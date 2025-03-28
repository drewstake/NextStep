// File: /src/components/Swipe.js
import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Swipe.css';
import axios from 'axios';
import { ThumbsUp, ThumbsDown } from 'lucide-react'; // Import icons
import NotificationBanner from './NotificationBanner';
import { TokenContext } from './TokenContext';

// Define swipe mode constants
const APPLY = 1;
const IGNORE = 2;

// A simple single-card "infinite" swiping component
const Swipe = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0); // Which job we're on
  const [isSwiping, setIsSwiping] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState(null); // 'horizontal' or 'vertical'
  const { token, setToken } = useContext(TokenContext);
  //  const [searchQuery, setSearchQuery] = useState('software');
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await axios.get('http://localhost:4000/retrieveJobsForHomepage?q=', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setJobs(response.data);
      } catch (error) {
        console.error('Error fetching jobs:', error);
      }
    };

    fetchJobs();
  }, [token]);

  const updateJobsTracker = async (jobId, swipeMode) => {
    if (!token) {
      setError("Please sign in to apply for jobs. If you don't have an account, you can create one.");
      return;
    }
    try {
      await axios.post('http://localhost:4000/jobsTracker', { _id: jobId, swipeMode }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Set appropriate message based on swipeMode
      switch (swipeMode) {
        case APPLY:
          setMessage("Applied successfully!");
          break;
        case IGNORE:
          setMessage("Job ignored");
          break;
        default:
          setMessage("Action completed");
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        setToken(null);
        setError("Your session has expired. Please sign in again.");
      } else if (error.response && error.response.status === 409) {
        console.log(error.response.data.error + jobId);
        setError(error.response.data.error);
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
    }
  };

  const determineSwipeDirection = (deltaX, deltaY) => {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    if (absX > absY) {
      return 'horizontal';
    } else if (absY > absX) {
      return 'vertical';
    }
    return null;
  };

  // Touch handlers (mobile)
  const handleTouchStart = (e) => {
    setIsSwiping(true);
    setStartX(e.touches[0].clientX);
    setStartY(e.touches[0].clientY);
    setSwipeDirection(null);
  };

  const handleTouchMove = (e) => {
    if (!isSwiping) return;
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const deltaX = touchX - startX;
    const deltaY = touchY - startY;

    // Determine direction if not set
    if (!swipeDirection) {
      const direction = determineSwipeDirection(deltaX, deltaY);
      if (direction) {
        setSwipeDirection(direction);
      }
    }

    // Update position based on locked direction
    if (swipeDirection === 'horizontal') {
      setCurrentX(deltaX);
      setCurrentY(0);
    } else if (swipeDirection === 'vertical') {
      setCurrentX(0);
      // Only allow upward movement (negative values)
      setCurrentY(deltaY > 0 ? 0 : deltaY);
    }
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  // Mouse handlers (desktop)
  const handleMouseDown = (e) => {
    setIsSwiping(true);
    setStartX(e.clientX);
    setStartY(e.clientY);
    setSwipeDirection(null);
  };

  const handleMouseMove = (e) => {
    if (!isSwiping) return;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    // Determine direction if not set
    if (!swipeDirection) {
      const direction = determineSwipeDirection(deltaX, deltaY);
      if (direction) {
        setSwipeDirection(direction);
      }
    }

    // Update position based on locked direction
    if (swipeDirection === 'horizontal') {
      setCurrentX(deltaX);
      setCurrentY(0);
    } else if (swipeDirection === 'vertical') {
      setCurrentX(0);
      // Only allow upward movement (negative values)
      setCurrentY(deltaY > 0 ? 0 : deltaY);
    }
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  const handleEnd = () => {
    setIsSwiping(false);
    setSwipeDirection(null);
    const horizontalSwipe = Math.abs(currentX) > 100;
    const verticalSwipe = Math.abs(currentY) > 100;

    if (horizontalSwipe || verticalSwipe) {
      if (verticalSwipe && currentY < 0) {
        // Swipe up detected
        setMessage("Skipped");
        // Remove the swiped card from the jobs array
        setJobs(prevJobs => prevJobs.filter((_, index) => index !== currentIndex));
        // Reset to 0 if this was the last card, otherwise move to next
        setCurrentIndex(0);
        setCurrentX(0);
        setCurrentY(0);
        return;
      }

      if (horizontalSwipe) {
        if (currentX > 0) {
          if (jobs[currentIndex]) {
            if (!jobs[currentIndex].applied || jobs[currentIndex].applied === 'B') {
              jobs[currentIndex].applied = 'A';
              updateJobsTracker(jobs[currentIndex]._id, APPLY);
            }
          }
        } else {
          if (jobs[currentIndex]) {
            if (!jobs[currentIndex].applied || (jobs[currentIndex].applied === 'B' && jobs[currentIndex].applied === 'A')) {
              jobs[currentIndex].applied = 'B';
              updateJobsTracker(jobs[currentIndex]._id, IGNORE);
            }
          }
        }
      }

      // Remove the swiped card from the jobs array
      setJobs(prevJobs => prevJobs.filter((_, index) => index !== currentIndex));

      // Reset to 0 if this was the last card, otherwise move to next
      setCurrentIndex(0);
      setCurrentX(0);
      setCurrentY(0);
    } else {
      setCurrentX(0);
      setCurrentY(0);
    }
  };

  const getNextIndex = (current) => (current + 1) % jobs.length;

  const handleCardTap = (job) => {
    if (!isSwiping) {
      navigate(`/jobs/${job._id}`);
    }
  };

  const renderCard = (job, index, isCurrent = false) => {
    if (!job) return null;

    const cardStyle = isCurrent ? {
      transform: `translate(${currentX}px, ${currentY}px) rotate(${currentX * 0.05}deg)`,
      transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
    } : {};

    // Determine swipe direction class
    let swipeClass = '';
    if (isSwiping) {
      if (Math.abs(currentX) > Math.abs(currentY)) {
        if (isCurrent) {
          swipeClass = currentX > 0 ? 'swiping-right' : 'swiping-left';
        }
      } else if (currentY < 0) {
        if (isCurrent) {
          swipeClass = 'swiping-up';
        }
      }
    }

    return (
      <div
        key={job._id}
        className={`swipe-job-card ${isCurrent ? 'current' : 'next'} ${swipeClass}`}
        style={cardStyle}
        onTouchStart={isCurrent ? handleTouchStart : undefined}
        onTouchMove={isCurrent ? handleTouchMove : undefined}
        onTouchEnd={isCurrent ? handleTouchEnd : undefined}
        onMouseDown={isCurrent ? handleMouseDown : undefined}
        onMouseMove={isCurrent ? handleMouseMove : undefined}
        onMouseUp={isCurrent ? handleMouseUp : undefined}
        onClick={() => handleCardTap(job)}
      >
        <h2>{job.title}</h2>
        <p>
          {job.companyWebsite ? (
            <a href={job.companyWebsite} target="_blank" rel="noopener noreferrer">
              {job.companyName}
            </a>
          ) : (
            job.companyName
          )}
        </p>
        <p>
          <strong>Location(s):</strong> {Array.isArray(job.locations) ? job.locations.join(', ') : job.locations}
        </p>
        <p>{job.jobDescription}</p>
        {swipeClass === 'swiping-right' && <ThumbsUp className="icon" />}
        {swipeClass === 'swiping-left' && <ThumbsDown className="icon" />}
      </div>
    );
  };

  return (
    <div className="swipe-container">
      {error && <NotificationBanner message={error} type="error" onDismiss={() => setError(null)} />}
      {message && <NotificationBanner message={message} type="success" onDismiss={() => setMessage(null)} />}
      {jobs.length > 0 && (
        <>
          <div className="job-count-label">
            Showing {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
          </div>
          <div className="swipe-direction-label left">Swipe left to reject</div>
          <div className="swipe-direction-label right">Swipe right to apply</div>
          <div className="swipe-direction-label up">Swipe up to skip</div>
        </>
      )}
      {jobs.length === 0 ? (
        <div className="empty-state">
          No more jobs to show
        </div>
      ) : (
        <>
          {getNextIndex(currentIndex) === 0 &&
            <div className="empty-state">
              No more jobs to show
            </div>}
          {getNextIndex(currentIndex) !== 0 &&
            renderCard(jobs[getNextIndex(currentIndex)], getNextIndex(currentIndex))}
          {renderCard(jobs[currentIndex], currentIndex, true)}
        </>
      )}
    </div>
  );
};

export default Swipe;

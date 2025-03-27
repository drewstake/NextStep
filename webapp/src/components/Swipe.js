// File: /src/components/Swipe.js
import React, { useState, useContext, useEffect } from 'react';
import '../styles/Swipe.css';
import axios from 'axios';
import { ThumbsUp, ThumbsDown } from 'lucide-react'; // Import icons

import { TokenContext } from './TokenContext';


// A simple single-card “infinite” swiping component
const Swipe = () => {
  const [currentIndex, setCurrentIndex] = useState(0); // Which job we’re on
  const [isSwiping, setIsSwiping] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const { token } = useContext(TokenContext);
  //  const [searchQuery, setSearchQuery] = useState('software');
  const [jobs, setJobs] = useState([]);

  // The currently visible job object

  useEffect(() => {
    const fetchJobs = async () => {
      try {

        const response = await axios.get('http://localhost:4000/jobs?q=');
        setJobs(response.data);

      } catch (error) {
        console.error('Error fetching jobs:', error);
      }
    };

    fetchJobs();
  }, []);

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
      if (error.response && error.response.status === 409) {
        console.log(error.response.data.error + jobId);
        alert(error.response.data.error); // Display the error message from API
      } else {
        alert('An unexpected error occurred. Please try again later.');
      }
    }

  };

  // Touch handlers (mobile)
  const handleTouchStart = (e) => {
    setIsSwiping(true);
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    if (!isSwiping) return;
    const touchX = e.touches[0].clientX;
    setCurrentX(touchX - startX);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  // Mouse handlers (desktop)
  const handleMouseDown = (e) => {
    setIsSwiping(true);
    setStartX(e.clientX);
  };

  const handleMouseMove = (e) => {
    if (!isSwiping) return;
    setCurrentX(e.clientX - startX);
  };

  const handleMouseUp = () => {
    handleEnd();
  };


  const handleEnd = () => {
    setIsSwiping(false);
    // If swiped far enough left or right, load next job
    if (Math.abs(currentX) > 100) {
      // Reset the position

      if (currentX > 0) {
        // Swiped Right
        if (jobs[currentIndex]){
          //apply only if applied flag is unset or was previously rejected
          if (!jobs[currentIndex].applied || jobs[currentIndex].applied === 'B') {
            jobs[currentIndex].applied = 'A';
            handleApply(jobs[currentIndex]._id);
          }
        }
      }
      else {
        // Swiped Left
        if (jobs[currentIndex]){
          if (!jobs[currentIndex].applied || (jobs[currentIndex].applied === 'B' && jobs[currentIndex].applied === 'A')) {
            jobs[currentIndex].applied = 'B';
            //handleReject(jobs[currentIndex]._id);
          }
        }
      }
      setCurrentX(0);
      // Move to next job in an infinite loop
      setCurrentIndex(function (prevIndex) {
        var newIndex;
        if (jobs.length > 0) {
          newIndex = (prevIndex + 1) % jobs.length;
        } else {
          newIndex = 0; // Or handle the case where jobs is empty differently
        }
        return newIndex;
      });
    } else {
      // Snap back if not far enough
      setCurrentX(0);
    }
  };

  return (
    <div
      className="swipe-container"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp} /* if they drag off the card area */
    >
      {/* The main job card */}
      <div
        className="swipe-job-card"
        style={{
          transform: `translateX(${currentX}px) rotate(${currentX * 0.05}deg)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        {jobs[currentIndex] && (
          <>
            <h2>{jobs[currentIndex].title}</h2>
            <p>
              {jobs[currentIndex].companyWebsite ? (
                <a href={jobs[currentIndex].companyWebsite} target="_blank" rel="noopener noreferrer">
                  {jobs[currentIndex].companyName}
                </a>
              ) : (
                jobs[currentIndex].companyName
              )}
            </p>
            <p>
              <strong>Location(s):</strong> {Array.isArray(jobs[currentIndex].locations) ? jobs[currentIndex].locations.join(', ') : jobs[currentIndex].locations}
            </p>
            <p>{jobs[currentIndex].jobDescription}</p>
            {(jobs[currentIndex].applied && jobs[currentIndex].applied === 'A') && (<ThumbsUp className="icon" />)} {/* Show thumbs up if applied is true */}
            {(jobs[currentIndex].applied && jobs[currentIndex].applied === 'B') && <ThumbsDown className="icon" />}  {/* Show thumbs down if ignore is true */}

          </>
        )}
      </div>
    </div>
  );
};

export default Swipe;

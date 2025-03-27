import React, { useState, useRef, useEffect } from "react";
import "../styles/JobCard.css";

const JobCard = ({
  _id,
  title,
  companyName,
  locations,
  salaryRange,
  jobType,
  schedule,
  jobDescription,
  skills = [],
  benefits = [],
  onApply,
  onSwipe,
  isLast,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const cardRef = useRef(null);

  const handleStart = (clientX) => {
    setIsDragging(true);
    setStartX(clientX - offsetX);
  };

  const handleMove = (clientX) => {
    if (isDragging) {
      const currentX = clientX - startX;
      setOffsetX(currentX);
    }
  };

  const handleEnd = () => {
    setIsDragging(false);

    if (Math.abs(offsetX) > 100) {
      // Swipe threshold met
      const direction = offsetX > 0 ? "right" : "left";
      onSwipe(direction);
    }

    setOffsetX(0);
  };

  // Mouse events
  const handleMouseDown = (e) => handleStart(e.clientX);
  const handleMouseMove = (e) => handleMove(e.clientX);
  const handleMouseUp = () => handleEnd();

  // Touch events
  const handleTouchStart = (e) => handleStart(e.touches[0].clientX);
  const handleTouchMove = (e) => handleMove(e.touches[0].clientX);
  const handleTouchEnd = () => handleEnd();

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    card.addEventListener("touchstart", handleTouchStart);
    card.addEventListener("touchmove", handleTouchMove);
    card.addEventListener("touchend", handleTouchEnd);

    return () => {
      card.removeEventListener("touchstart", handleTouchStart);
      card.removeEventListener("touchmove", handleTouchMove);
      card.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, startX]);

  const getSwipeClass = () => {
    if (!isDragging) return "";
    if (offsetX > 50) return "swiping-right";
    if (offsetX < -50) return "swiping-left";
    return "swiping";
  };

  const cardStyle = {
    transform: isDragging
      ? `translateX(${offsetX}px) rotate(${offsetX * 0.1}deg)`
      : "none",
    transition: isDragging ? "none" : "transform 0.3s ease",
  };

  return (
    <div
      ref={cardRef}
      className={`job-card-container ${
        isFlipped ? "flipped" : ""
      } ${getSwipeClass()}`}
      onClick={() => setIsFlipped(!isFlipped)}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="job-card-inner">
        {/* Front of card */}
        <div className="job-card-front">
          <h2>{title}</h2>
          <h3>{companyName}</h3>
          <div className="job-meta-front">
            <p>
              <span>📍</span>{" "}
              {Array.isArray(locations) ? locations[0] : locations}
            </p>
            <p>
              <span>💰</span> {salaryRange}
            </p>
            <p>
              <span>💼</span> {jobType}
            </p>
            <p>
              <span>🕒</span> {schedule}
            </p>
          </div>
          <div className="flip-hint">Click to see full description →</div>
        </div>

        {/* Back of card */}
        <div className="job-card-back">
          <button
            className="flip-back"
            onClick={(e) => {
              e.stopPropagation();
              setIsFlipped(false);
            }}
          >
            ←
          </button>
          <div className="job-content">
            <h2>{title}</h2>
            <h3>{companyName}</h3>

            <div className="description-section">
              <h4>Job Description</h4>
              <p>{jobDescription}</p>
            </div>

            {skills.length > 0 && (
              <div className="skills-section">
                <h4>Required Skills</h4>
                <div className="skills-list">
                  {skills.map((skill, index) => (
                    <span key={index} className="skill-tag">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {benefits.length > 0 && (
              <div className="benefits-section">
                <h4>Benefits</h4>
                <div className="benefits-list">
                  {benefits.map((benefit, index) => (
                    <span key={index} className="benefit-tag">
                      {benefit}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              className="apply-button"
              onClick={(e) => {
                e.stopPropagation();
                onApply(_id);
              }}
            >
              Apply Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobCard;

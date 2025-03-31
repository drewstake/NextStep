import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from '../utils/axiosConfig';
import '../styles/ApplicantProfile.css';
import NotificationBanner from '../components/NotificationBanner';

const ApplicantProfile = () => {
  const { userId } = useParams();
  const [applicant, setApplicant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showResumeOverlay, setShowResumeOverlay] = useState(false);

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    // If phone already contains hyphens, return as is
    if (phone.includes('-')) return phone;
    
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    // Format as XXX-XXX-XXXX
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      console.log(match);
      return `${match[1]}-${match[2]}-${match[3]}`;
    }else{
      console.log(phone);
      return phone;
    }
  };

  useEffect(() => {
    const fetchApplicantProfile = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get(`/userProfile/${userId}`);
        setApplicant(response.data);
      } catch (error) {
        console.error('Error fetching applicant profile:', error);
        setError('Failed to load applicant profile. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchApplicantProfile();
    }
  }, [userId]);

  if (loading) {
    return <div className="loading">Loading applicant profile...</div>;
  }

  if (error) {
    return <NotificationBanner message={error} type="error" onDismiss={() => setError(null)} />;
  }

  if (!applicant) {
    return <div className="error">Applicant not found</div>;
  }

  return (
    <div className="applicant-profile-container">
      <h1>Applicant Profile</h1>
      
      <div className="profile-header">
        {applicant.encodedPhoto && (
          <img 
            src={applicant.encodedPhoto} 
            alt={`${applicant.full_name}'s profile`} 
            className="profile-photo"
          />
        )}
        <div className="profile-info">
          <h2>{applicant.full_name}</h2>
          <a href={`mailto:${applicant.email}`} className="email-link">
            {applicant.email}
          </a>
          {applicant.phone && (
            <a href={`tel:${applicant.phone.replace(/\D/g, '')}`} className="phone-link">
              {formatPhoneNumber(applicant.phone)}
            </a>
          )}
          {applicant.location && <p className="location">{applicant.location}</p>}
        </div>
        {applicant.resumeFile && (
          <button 
            onClick={() => setShowResumeOverlay(true)}
            className="view-resume-button"
          >
            View Resume
          </button>
        )}
        {applicant.resumeFile ? (
          <div className="resume-section">
            {showResumeOverlay && (
              <div className="resume-overlay">
                <div className="resume-overlay-content">
                  <button 
                    className="close-overlay-button"
                    onClick={() => setShowResumeOverlay(false)}
                  >
                    ×
                  </button>
                  {applicant.resumeFile.mimetype === 'application/pdf' ? (
                    <iframe
                      src={`data:${applicant.resumeFile.mimetype};base64,${applicant.resumeFile.buffer}`}
                      title={`${applicant.full_name}'s resume`}
                      width="100%"
                      height="100%"
                      style={{ border: 'none' }}
                    />
                  ) : (
                    <iframe
                      src={`data:${applicant.resumeFile.mimetype};base64,${applicant.resumeFile.buffer}`}
                      title={`${applicant.full_name}'s resume`}
                      width="100%"
                      height="100%"
                      style={{ border: 'none' }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p>No resume available</p>
        )}
      </div>

      <div className="profile-sections-grid">
        <div className="profile-section">
          <h3>Skills</h3>
          {applicant.skills && applicant.skills.length > 0 ? (
            <div className="skills-list">
              {applicant.skills.map((skill, index) => (
                <span key={index} className="skill-tag">{skill}</span>
              ))}
            </div>
          ) : (
            <p>No skills listed</p>
          )}
        </div>

        <div className="profile-section">
          <h3>Experience</h3>
          {applicant.experience && applicant.experience.length > 0 ? (
            <div className="experience-list">
              {applicant.experience.map((exp, index) => (
                <div key={index} className="experience-item">
                  <h4>{exp.title}</h4>
                  <p className="company">{exp.company}</p>
                  <p className="period">{exp.startDate} - {exp.endDate || 'Present'}</p>
                  <p className="description">{exp.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>No experience listed</p>
          )}
        </div>

        <div className="profile-section">
          <h3>Education</h3>
          {applicant.education && applicant.education.length > 0 ? (
            <div className="education-list">
              {applicant.education.map((edu, index) => (
                <div key={index} className="education-item">
                  <h4>{edu.degree}</h4>
                  <p className="school">{edu.school}</p>
                  <p className="period">{edu.startDate} - {edu.endDate || 'Present'}</p>
                  {edu.description && <p className="description">{edu.description}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p>No education listed</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicantProfile; 
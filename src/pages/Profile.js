// File: /src/pages/Profile.js
import React, { useState, useEffect, useContext } from 'react';
import '../styles/Profile.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'
import { TokenContext } from '../components/TokenContext';
import NotificationBanner from '../components/NotificationBanner';
import { API_SERVER } from '../config';

const Profile = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [profileImage, setProfileImage] = useState(null); // for local photo viewer
  const [photo, setPhoto] = useState(null); // for mongo field
  const [profilePic, setProfilePic] = useState(null);
  const [resume, setResume] = useState(null);
  const [location, setLocation] = useState('');
  const [profilePicAlt, setProfilePicAlt] = useState(""); // Default alt text
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResumeOverlay, setShowResumeOverlay] = useState(false);

  const navigate = useNavigate(1);
  //const location = useLocation();
  const { token, setToken, triggerProfileUpdate, employerFlag } = useContext(TokenContext);
  const [updateFlag] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API_SERVER}/profile`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setResume(response.data.resumeFile);
          setFullName(response.data.full_name);
          if (!response.data.firstName || !response.data.lastName) {
            const nameParts = (response.data.full_name || '').split(' ');
            setFirstName(nameParts[0] || '');
            setLastName(nameParts.slice(1).join(' ') || '');
          } else {
            setFirstName(response.data.firstName);
            setLastName(response.data.lastName);
          }
          setPhone(response.data.phone);
          setEmail(response.data.email);
          setLocation(response.data.location);
          setProfileImage(response.data.encodedPhoto);
          setProfilePic(response.data.pictureUrl);
          setSkills(response.data.skills);

        } catch (error) {
          console.error('Profile error:', error.response.data);
        }
      } else {
        navigate('/login');
      }
    };

    fetchProfile();

  }, [updateFlag, token, navigate, setToken]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);

      // Preview the selected image so the user may 
      // verify that correct images is being uploaded
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResumeChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setResume(file);
      setIsAnalyzing(true);
      setMessage('Analyzing your resume...');

      try {
        const formData = new FormData();
        formData.append('pdf', file);

        const response = await axios.post(`${API_SERVER}/analyze-resume`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });

        if (response.data) {
          const { skills: analyzedSkills } = response.data;
          setMessage(`Resume analysis complete! Please review the skills and update your profile.`);
          setSkills(analyzedSkills || []);
        }
      } catch (error) {
        console.error('Error analyzing resume:', error);
        setError('Failed to analyze resume. Please try again.');
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleSkillAdd = (e) => {
    e.preventDefault();
    const trimmedSkill = newSkill.trim();

    if (!trimmedSkill) {
      return;
    }

    if (skills.includes(trimmedSkill)) {
      setError(`Skill "${trimmedSkill}" already exists in your list`);
      return;
    }

    setSkills(prevSkills => [...prevSkills, trimmedSkill]);
    setNewSkill('');
  };

  const handleSkillRemove = (index) => {
    setSkills(prevSkills => prevSkills.filter((_, i) => i !== index));
  };

  const handleClearSkills = () => {
    setSkills([]);
    setNewSkill('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("firstName", firstName);
    formData.append("lastName", lastName);
    formData.append("full_name", fullName);
    formData.append("phone", phone);
    formData.append("email", email);
    formData.append("location", location);
    formData.append("skills", JSON.stringify(skills));

    if (photo) {
      formData.append("photo", photo);
    }

    if (resume) {
      formData.append("resume", resume);
    }

    try {
      await axios.post(`${API_SERVER}/updateprofile`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage(
        <span>
          Profile Updated.{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
            style={{ color: '#007bff', textDecoration: 'underline', cursor: 'pointer' }}
          >
            See matched jobs
          </a>
        </span>
      );
      triggerProfileUpdate(); // Trigger profile update after successful submission
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile. Please try again.');
    }
  };

  const handleViewResume = () => {
    if (!resume) {
      setError('No resume available');
      return;
    }
    setShowResumeOverlay(true);
  };

  return (
    <div className="profile-container">
      {error && <NotificationBanner message={error} type="error" onDismiss={() => setError(null)} />}
      {message && <NotificationBanner message={message} type="success" onDismiss={() => setMessage(null)} />}
      <h2>Profile</h2>
      <form onSubmit={handleSubmit} className="profile-form">
        <div className="profile-header">
          {/* Photo Upload - Only show for non-employers */}
          {!employerFlag && (
            <>
              <div className="profile-image-container">
                {profileImage ? (
                  <img className="profile-image"
                    src={profileImage}
                    alt=""
                  />
                ) : (
                  <img
                    className="profile-image"
                    src={profilePic}
                    alt={profilePicAlt}
                    onError={() => {
                      setProfilePicAlt("");
                      setProfilePic(null);
                    }}
                  />
                )}
                <div
                  className="profile-image-edit"
                  onClick={() => document.getElementById('photo-upload').click()}
                >
                  ✎
                </div>
              </div>
              {showResumeOverlay && (
                <div className="resume-overlay">
                  <div className="resume-overlay-content">
                    <button
                      className="close-overlay-button"
                      onClick={() => setShowResumeOverlay(false)}
                    >
                      ×
                    </button>
                    <iframe
                      src={`data:${resume.mimetype};base64,${resume.buffer}`}
                      title="Your resume"
                      width="100%"
                      height="100%"
                      style={{ border: 'none' }}
                    />
                  </div>
                </div>
              )}
              <div className="profile-form-group-hidden">
                <label className="profile-label">Profile Photo</label>
                <label htmlFor="photo-upload" className="upload-label">Upload...</label>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="file-input"
                />
              </div>
            </>
          )}

          <div className="profile-fields-container">
            {/* Resume Upload - Only show for non-employers */}
            {!employerFlag && (
              <div className="profile-form-group">
                <input
                  id="resume-upload"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleResumeChange}
                  className="file-input"
                />
              </div>
            )}

            {/* Name Fields Row */}
            <div className="profile-form-row">
              <div className="profile-form-group">
                <label className="profile-label">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  className="profile-input"
                />
              </div>

              <div className="profile-form-group">
                <label className="profile-label">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter your first name"
                  required
                  className="profile-input"
                />
              </div>

              <div className="profile-form-group">
                <label className="profile-label">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter your last name"
                  required
                  className="profile-input"
                />
              </div>
            </div>

            {/* Contact Information Row */}
            <div className="profile-form-row">
              <div className="profile-form-group">
                <label className="profile-label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                  className="profile-input"
                />
              </div>

              <div className="profile-form-group">
                <label className="profile-label">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="123-456-7890"
                  required
                  className="profile-input"
                />
              </div>

              <div className="profile-form-group">
                <label className="profile-label">Preferred Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Remote, Chicago, etc."
                  required
                  className="profile-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Skills Management Section */}
        {!employerFlag && (
          <div className="skills-section">
            <div className="skills-header">
              <h3>Your Professional Skills</h3>
              {skills?.length > 0 && !isAnalyzing && (
                <button
                  type="button"
                  className="clear-skills-button"
                  onClick={handleClearSkills}
                >
                  Reset Skills
                </button>
              )}
            </div>

            {/* Add New Skill Input */}
            <div className="add-skill-form">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Add a new skill or upload your resume to analyze your skills..."
                className="skill-input"
                disabled={isAnalyzing}
              />
              <button
                type="button"
                className="add-skill-button"
                onClick={handleSkillAdd}
                disabled={isAnalyzing}
              >
                Add Skill
              </button>
            </div>

            {/* Skills List */}
            <div className="skills-list">
              {skills?.map((skill, index) => (
                <div key={index} className="skill-item">
                  <span>{skill}</span>
                  <button
                    type="button"
                    className="remove-skill"
                    onClick={() => handleSkillRemove(index)}
                    disabled={isAnalyzing}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit and Upload Buttons */}
        <div className="button-container">
          {!employerFlag && (
            <>
              <label htmlFor="resume-upload" className="upload-button">
                <span>
                  Upload Resume
                </span>
              </label>
              {resume && (

                <label htmlFor="resume-upload" className="upload-button" onClick={(e) => {
                  e.preventDefault();
                  handleViewResume();
                }}>
                  <span>
                    View Current Resume
                  </span>
                </label>

              )}
            </>
          )}
          <button type="submit" className="profile-button" disabled={isAnalyzing}>Save Profile</button>
        </div>
      </form>
    </div>
  );
};

export default Profile;

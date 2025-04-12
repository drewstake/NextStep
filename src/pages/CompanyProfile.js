import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosConfig';
import '../styles/CompanyProfile.css';
import { TokenContext } from '../components/TokenContext';
import NotificationBanner from '../components/NotificationBanner';

const CompanyProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [companyData, setCompanyData] = useState({
    name: '',
    description: '',
    industry: '',
    size: '',
    location: '',
    website: '',
    logo: null
  });
  const { setCompanyId } = useContext(TokenContext);

  // Fetch company profile data on component mount
  useEffect(() => {
    const fetchCompanyProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axiosInstance.get('/companyProfile');

        if (response.data) {
          setCompanyData({
            name: response.data.name || '',
            description: response.data.description || '',
            industry: response.data.industry || '',
            size: response.data.size || '',
            location: response.data.location || '',
            website: response.data.website || '',
            logo: null // We don't set the file input value for security reasons
          });
        }
      } catch (error) {
        console.error('Error fetching company profile:', error);
        if (error.response && error.response.status === 401) {
          navigate('/login');
        } else if (error.response && error.response.status !== 404) {
          // Only show error if it's not a 404 (profile not found)
          setError('Failed to load company profile. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyProfile();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCompanyData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage('');
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('name', companyData.name);
      formData.append('description', companyData.description);
      formData.append('industry', companyData.industry);
      formData.append('size', companyData.size);
      formData.append('location', companyData.location);
      formData.append('website', companyData.website);
      
      if (companyData.logo) {
        formData.append('logo', companyData.logo);
      }

      const response = await axiosInstance.put('/companyProfile', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data) {
        setMessage('Company profile updated successfully!');
        if (response.data._id) {
          setCompanyId(response.data._id);
        }
        // Clear the file input after successful upload
        setCompanyData(prev => ({
          ...prev,
          logo: null
        }));
        // Reset the file input element
        const fileInput = document.getElementById('logo');
        if (fileInput) fileInput.value = '';
      }
    } catch (error) {
      console.error('Error updating company profile:', error);
      if (error.response && error.response.status === 401) {
        navigate('/login');
      } else {
        setError('Failed to update company profile. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="company-profile-container">Loading...</div>;
  }

  return (
    <div className="company-profile-container">
      <h1>Company Profile</h1>
      
      {error && <NotificationBanner message={error} type="error" onDismiss={() => setError(null)} />}
      {message && <NotificationBanner message={message} type="success" onDismiss={() => setMessage(null)} />}
      
      <form onSubmit={handleSubmit} className="company-profile-form">
        <div className="form-group">
          <label htmlFor="name">Company Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={companyData.name}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Company Description</label>
          <textarea
            id="description"
            name="description"
            value={companyData.description}
            onChange={handleInputChange}
            rows="4"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="industry">Industry</label>
          <input
            type="text"
            id="industry"
            name="industry"
            value={companyData.industry}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="size">Company Size</label>
          <select
            id="size"
            name="size"
            value={companyData.size}
            onChange={handleInputChange}
            required
          >
            <option value="">Select size</option>
            <option value="1-10">1-10 employees</option>
            <option value="11-50">11-50 employees</option>
            <option value="51-200">51-200 employees</option>
            <option value="201-500">201-500 employees</option>
            <option value="501+">501+ employees</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="location">Location</label>
          <input
            type="text"
            id="location"
            name="location"
            value={companyData.location}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="website">Website</label>
          <input
            type="url"
            id="website"
            name="website"
            value={companyData.website}
            onChange={handleInputChange}
          />
        </div>
                
        <button type="submit" className="save-button">Save Profile</button>
      </form>
    </div>
  );
};

export default CompanyProfile; 
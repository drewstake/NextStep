import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../utils/axiosConfig';
import '../styles/ManageJobPostings.css';
import NotificationBanner from '../components/NotificationBanner';

const ManageJobPostings = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingJob, setEditingJob] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    companyName: '',
    companyWebsite: '',
    salaryRange: '',
    benefits: [],
    locations: [],
    schedule: '',
    jobDescription: '',
    skills: []
  });

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/employer/jobs/search?query=${searchQuery}`);
      setJobs(response.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setError('Failed to load jobs. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]); // Empty dependency array since it doesn't depend on any props or state

  // Fetch jobs on component mount
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]); // Add fetchJobs to dependencies

  
  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/employer/jobs/search?query=${searchQuery}`);
      setJobs(response.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setError('Failed to load jobs. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post('/jobs', formData);
      setMessage('Job created successfully');
      setShowCreateForm(false);
      setFormData({
        title: '',
        companyName: '',
        companyWebsite: '',
        salaryRange: '',
        benefits: [],
        locations: [],
        schedule: '',
        jobDescription: '',
        skills: []
      });
      fetchJobs();
    } catch (error) {
      console.error('Error creating job:', error);
      setError('Failed to create job. Please try again.');
    }
  };

  const handleUpdateJob = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.put(`/employer/jobs/${editingJob._id}`, formData);
      setMessage('Job updated successfully');
      setEditingJob(null);
      setFormData({
        title: '',
        companyName: '',
        companyWebsite: '',
        salaryRange: '',
        benefits: [],
        locations: [],
        schedule: '',
        jobDescription: '',
        skills: []
      });
      fetchJobs();
    } catch (error) {
      console.error('Error updating job:', error);
      setError('Failed to update job. Please try again.');
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (window.confirm('Are you sure you want to delete this job posting?')) {
      try {
        await axiosInstance.delete(`/employer/jobs/${jobId}`);
        setMessage('Job deleted successfully');
        fetchJobs();
      } catch (error) {
        console.error('Error deleting job:', error);
        setError('Failed to delete job. Please try again.');
      }
    }
  };

  const handleEditJob = (job) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      companyName: job.companyName,
      companyWebsite: job.companyWebsite,
      salaryRange: job.salaryRange,
      benefits: job.benefits,
      locations: job.locations,
      schedule: job.schedule,
      jobDescription: job.jobDescription,
      skills: job.skills
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleArrayInputChange = (e, field) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      [field]: value.split(',').map(item => item.trim())
    }));
  };

  if (loading) {
    return <div className="loading">Loading jobs...</div>;
  }

  return (
    <div className="manage-job-postings-container">
      {error && <NotificationBanner message={error} type="error" onDismiss={() => setError(null)} />}
      {message && <NotificationBanner message={message} type="success" onDismiss={() => setMessage(null)} />}
      
      <h1>Manage Job Postings</h1>
      
      <div className="actions-bar">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>
        
        <button 
          className="create-job-btn"
          onClick={() => setShowCreateForm(true)}
        >
          Create New Job
        </button>
      </div>

      {(showCreateForm || editingJob) && (
        <div className="job-form-overlay">
          <div className="job-form">
            <h2>{editingJob ? 'Edit Job' : 'Create New Job'}</h2>
            <form onSubmit={editingJob ? handleUpdateJob : handleCreateJob}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Company Name</label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Company Website</label>
                <input
                  type="url"
                  name="companyWebsite"
                  value={formData.companyWebsite}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Salary Range</label>
                <input
                  type="text"
                  name="salaryRange"
                  value={formData.salaryRange}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Benefits (comma-separated)</label>
                <input
                  type="text"
                  value={formData.benefits.join(', ')}
                  onChange={(e) => handleArrayInputChange(e, 'benefits')}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Locations (comma-separated)</label>
                <input
                  type="text"
                  value={formData.locations.join(', ')}
                  onChange={(e) => handleArrayInputChange(e, 'locations')}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Schedule</label>
                <input
                  type="text"
                  name="schedule"
                  value={formData.schedule}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Job Description</label>
                <textarea
                  name="jobDescription"
                  value={formData.jobDescription}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Skills (comma-separated)</label>
                <input
                  type="text"
                  value={formData.skills.join(', ')}
                  onChange={(e) => handleArrayInputChange(e, 'skills')}
                  required
                />
              </div>
              
              <div className="form-actions">
                <button type="submit">
                  {editingJob ? 'Update Job' : 'Create Job'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingJob(null);
                    setFormData({
                      title: '',
                      companyName: '',
                      companyWebsite: '',
                      salaryRange: '',
                      benefits: [],
                      locations: [],
                      schedule: '',
                      jobDescription: '',
                      skills: []
                    });
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="jobs-list">
        {jobs.map(job => (
          <div key={job._id} className="job-card">
            <div className="job-header">
              <h3>{job.title}</h3>
              <span className="application-count">
                {job.applicationCount} applications
              </span>
            </div>
            <div className="job-company-info">
              <div className="company-name">{job.companyName}</div>
              <div className="company-location">{job.locations.join(', ')}</div>
            </div>
            <div className="job-description">
              <p>{job.jobDescription}</p>
            </div>
            <div className="job-details">
              <div className="detail-item">
                <span className="detail-label">Salary</span>
                <span className="detail-value">{job.salaryRange}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Schedule</span>
                <span className="detail-value">{job.schedule}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Posted</span>
                <span className="detail-value">{new Date(job.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="job-actions">
              <button onClick={() => handleEditJob(job)}>Edit</button>
              <button 
                className="delete-btn"
                onClick={() => handleDeleteJob(job._id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManageJobPostings; 
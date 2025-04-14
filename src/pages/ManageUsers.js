import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/ManageUsers.css';
import NotificationBanner from '../components/NotificationBanner';
import { TokenContext } from '../components/TokenContext';
import jwt_decode from 'jwt-decode';
import { API_SERVER } from '../config';

const ManageUsers = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [companyUsers, setCompanyUsers] = useState([]);
  const [emailToAdd, setEmailToAdd] = useState('');
  const [isAddingByEmail, setIsAddingByEmail] = useState(false);
  const { token } = useContext(TokenContext);
  const currentUserId = token ? jwt_decode(token).id : null;

  // Fetch company users
  const fetchCompanyUsers = useCallback(async () => {
    try {
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get(`${API_SERVER}/company/users`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setCompanyUsers(response.data);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        navigate('/login');
      } else {
        setError('Failed to load company users. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  // Fetch company users on component mount
  useEffect(() => {
    fetchCompanyUsers();
  }, [fetchCompanyUsers]);


  // Add user by email
  const handleAddUserByEmail = async (e) => {
    e.preventDefault();
    setIsAddingByEmail(true);
    try {
      if (!token) {
        navigate('/login');
        return;
      }

      // First search for the user by email
      const searchResponse = await axios.get(`${API_SERVER}/company/users/search?search=${emailToAdd}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (searchResponse.data && searchResponse.data.length > 0) {
        const user = searchResponse.data[0];

        // Add the user to the company
        await axios.post(`${API_SERVER}/company/users`, { userId: user._id }, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setMessage(`User ${user.full_name} added successfully`);
        setEmailToAdd('');
        fetchCompanyUsers();
      } else {
        setError('No EMPLOYER user is registered with this email address.');
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        navigate('/login');
      } else {
        setError('Failed to add user. Please try again later.');
      }
    } finally {
      setIsAddingByEmail(false);
    }
  };

  // Remove user from company
  const handleRemoveUser = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this user from the company?')) {
      return;
    }

    try {
      if (!token) {
        navigate('/login');
        return;
      }

      await axios.delete(`${API_SERVER}/company/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setMessage('User removed successfully');
      fetchCompanyUsers();
    } catch (error) {
      if (error.response && error.response.status === 401) {
        navigate('/login');
      } else {
        setError('Failed to remove user. Please try again later.');
      }
    }
  };

  if (loading) {
    return <div className="manage-users-container">Loading...</div>;
  }

  return (
    <div className="manage-users-container">
      {error && <NotificationBanner message={error} type="error" onDismiss={() => setError(null)} />}
      {message && <NotificationBanner message={message} type="success" onDismiss={() => setMessage(null)} />}

      <h1>Manage Company Users</h1>

      <div className="add-by-email-section">
        <h2>Add User by Email</h2>
        <p>Add an EMPLOYER user to the company by entering their email address.</p>
        <form className="add-email-form" onSubmit={handleAddUserByEmail}>
          <div className="form-group">
            <input
              type="email"
              className="email-input"
              value={emailToAdd}
              onChange={(e) => setEmailToAdd(e.target.value)}
              placeholder="Enter user's email"
              required
            />
            <button
              type="submit"
              className="add-button"
              disabled={isAddingByEmail}
            >
              {isAddingByEmail ? 'Adding...' : 'Add User'}
            </button>
          </div>
        </form>
      </div>

      <div className="company-users-section">
        <h2>Current Company Users</h2>
        {companyUsers.length > 0 ? (
          <div className="users-list">
            {companyUsers.map((user) => (
              <div key={user._id} className="user-card">
                <div className="user-info">
                  <h4>{user.full_name}</h4>
                  <p>{user.email}</p>
                </div>
                <div className="user-actions">
                  {user._id === currentUserId ? (
                    <span className="current-user-label"><i>You</i></span>
                  ) : (
                    <button
                      className="remove-button"
                      onClick={() => handleRemoveUser(user._id)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-users">No users in the company yet</div>
        )}
      </div>
    </div>
  );
};

export default ManageUsers; 
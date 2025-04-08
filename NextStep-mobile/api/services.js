import api from './config';

// Get user applications with job details
export const getUserApplications = async () => {
  try {
    const response = await api.get('/applications');
    return response.data;
  } catch (error) {
    console.error('Error fetching user applications:', error);
    throw error;
  }
};

// Other API service functions can be added here 
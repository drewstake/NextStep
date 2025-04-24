import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/config';

// Create a cross-platform alert function
const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function BrowseJobsScreen({ navigation, route }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmployer, setIsEmployer] = useState(false);
  const [error, setError] = useState(null);

  // Function to remove a job from the filtered list
  const removeJobFromList = (jobId) => {
    setFilteredJobs(prevJobs => prevJobs.filter(job => job._id !== jobId));
  };

  // Fetch jobs from API
  const fetchJobs = async (searchTerm = '') => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get the auth token from storage
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        showAlert('Authentication Error', 'Please log in again');
        navigation.replace('Login');
        return;
      }
      
      // Set the authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Make the API call with search query if provided
      // Check if user is an employer
      //const userProfile = await api.get('/profile');
      
      //if (userProfile.data.isEmployer) {
      //  setIsEmployer(true);
      //  showAlert('Access Denied', 'Employer accounts cannot browse jobs. Please use the employer dashboard instead.');
      //  navigation.replace('EmployerDashboard');
      //  return;
      //}

      //const skills = userProfile.data.skills;
      //const location = userProfile.data.location;

      
/*       if (skills?.length > 0 ) {
        searchQuery = `skills: ${skills.join(',')}`;
      } 
      if (location) {
        searchQuery += ` location: ${location}`;
      }
 */
      const response = await api.get(`/jobs?q=${encodeURIComponent(searchQuery)}`);

      setJobs(response.data);
      setFilteredJobs(response.data);
      setIsLoading(false);

    } catch (error) {
      setIsLoading(false);
      console.error('Error fetching jobs:', error);
      
      if (error.response) {
        // Server responded with an error
        const { status, data } = error.response;
        
        if (status === 401) {
          // Unauthorized - token expired or invalid
          showAlert('Session Expired', 'Please log in again');
          AsyncStorage.removeItem("userToken");
          navigation.replace('Login');
        } else if (status === 403) {
          // Forbidden - user doesn't have permission
          showAlert('Access Denied', 'You do not have permission to view jobs');
        } else {
          // Other server errors
          setError(data.error || 'Failed to load jobs. Please try again later.');
        }
      } else if (error.request) {
        // Request was made but no response received
        setError('Network error. Please check your internet connection.');
      } else {
        // Something else happened
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchJobs();
  }, []);

  // Refresh view when screen comes into focus
  useFocusEffect(

    React.useCallback(() => {
      fetchJobs();
      // Just refresh the current filtered jobs without API call
//      setFilteredJobs(prevJobs => [...prevJobs]);
    }, [])
  );

  // Handle job removal when returning from job details
  useEffect(() => {
    const removeJobId = route.params?.removeJobId;
    if (removeJobId) {
      removeJobFromList(removeJobId);
      navigation.setParams({ removeJobId: null });
    }
  }, [route.params?.removeJobId]);

  // Handle search
  const handleSearch = () => {
    fetchJobs(searchQuery);
  };

  // Handle job application
  const handleApply = async (jobId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        showAlert('Authentication Error', 'Please log in again');
        navigation.replace('Login');
        return;
      }
      
      // Set the authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Track job application (mode 1 for apply)
      await api.post('/jobsTracker', {
        _id: jobId,
        swipeMode: 1
      });
      
      // Remove the job from the filtered list
      removeJobFromList(jobId);
      
      showAlert('Success', 'Application submitted successfully!');
    } catch (error) {
      console.error('Error applying for job:', error);
      
      if (error.response) {
        const { status, data } = error.response;
        
        if (status === 401) {
          showAlert('Session Expired', 'Please log in again');
          AsyncStorage.removeItem("userToken");
          navigation.replace('Login');
        } else {
          showAlert('Error', data.error || 'Failed to submit application. Please try again.');
          if (data.error.toLowerCase().includes('already')) {
            removeJobFromList(jobId);
          }
    
        }
      } else {
        showAlert('Error', 'Network error. Please check your internet connection.');
      }
    }
  };

  const renderJobItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => navigation.navigate('JobDetails', { 
        jobId: item._id,
        source: 'BrowseJobs',
        jobs: filteredJobs,
        currentIndex: index
      })}
    >
      <View style={styles.jobHeader}>
        <View>
          <Text style={styles.jobTitle}>{item.title}</Text>
          <Text style={styles.companyName}>{item.companyName}</Text>
        </View>
        <TouchableOpacity 
          style={styles.applyButton}
          onPress={() => handleApply(item._id)}
        >
          <Text style={styles.applyButtonText}>Apply</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.jobDetails}>
        <Text style={styles.detail}>{item.locations?.[0] || 'Location not specified'}</Text>
        <Text style={styles.detail}>{item.salaryRange || 'Salary not specified'}</Text>
        <Text style={styles.detail}>{item.schedule || 'Schedule not specified'}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={48} color="#fff" />
      <Text style={styles.emptyStateText}>
        {error ? error : 'No jobs found matching your search'}
      </Text>
    </View>
  );

  return (
    <LinearGradient
      colors={['#2A0845', '#6441A5']}
      style={styles.container}
    >
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search jobs..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="rgba(255, 255, 255, 0.6)"
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={handleSearch}
        >
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF69B4" />
          <Text style={styles.loadingText}>Loading jobs...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          renderItem={renderJobItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 30,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
    color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    paddingHorizontal: 20,
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: '#FF69B4',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 15,
  },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066cc',
    marginBottom: 5,
  },
  companyName: {
    fontSize: 16,
    color: '#FF69B4',
    marginBottom: 10,
  },
  applyButton: {
    backgroundColor: '#FF69B4',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 5,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  jobDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  detail: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 10,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
}); 
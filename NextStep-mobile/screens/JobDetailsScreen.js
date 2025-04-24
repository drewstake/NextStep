import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, PanResponder, Alert, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/config';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;

// Create a cross-platform alert function
const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function JobDetailsScreen({ route, navigation }) {
  const { jobId, source, jobs, currentIndex } = route.params;
  const [job, setJob] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentJobIndex, setCurrentJobIndex] = useState(currentIndex);
  const position = new Animated.ValueXY();

  // Set the job from the passed jobs array
  useEffect(() => {
    if (jobs && currentIndex !== undefined && currentIndex < jobs.length) {
      setJob(jobs[currentIndex]);
      setCurrentJobIndex(currentIndex);
    } else if (jobId) {
      // Fallback to API if jobs array is not available
      const fetchJobDetails = async () => {
        try {
          setIsLoading(true);
          setError(null);
          
          const token = await AsyncStorage.getItem('userToken');
          
          if (!token) {
            showAlert('Authentication Error', 'Please log in again');
            navigation.replace('Login');
            return;
          }
          
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await api.get(`/jobs/${jobId}`);
          setJob(response.data);
        } catch (error) {
          console.error('Error fetching job details:', error);
          setError('Failed to load job details. Please try again.');
        } finally {
          setIsLoading(false);
        }
      };

      fetchJobDetails();
    } else {
      setError('No job data available');
    }
  }, [jobs, currentIndex, jobId, navigation]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (event, gesture) => {
      position.setValue({ x: gesture.dx, y: gesture.dy });
    },
    onPanResponderRelease: (event, gesture) => {
      if (gesture.dy < -SWIPE_THRESHOLD) {
        // Swipe up - Ignore
        forceSwipe('up');
      } else if (gesture.dx > SWIPE_THRESHOLD) {
        // Swipe right - Apply
        forceSwipe('right');
      } else if (gesture.dx < -SWIPE_THRESHOLD) {
        // Swipe left - Reject
        forceSwipe('left');
      } else {
        // Reset position if not swiped far enough
        resetPosition();
      }
    }
  });

  const forceSwipe = (direction) => {
    const x = direction === 'right' ? SCREEN_WIDTH : direction === 'left' ? -SCREEN_WIDTH : 0;
    const y = direction === 'up' ? -SCREEN_WIDTH : 0;

    Animated.timing(position, {
      toValue: { x, y },
      duration: 250,
      useNativeDriver: false
    }).start(() => onSwipeComplete(direction));
  };

  const onSwipeComplete = (direction) => {
    if (!job) return;
    
    direction === 'right' ? handleApply(job) : 
    direction === 'left' ? handleReject(job) : 
    handleIgnore(job);

    // Remove the job from the list in the previous screen
    navigation.setParams({ removeJobId: job._id });

    // Navigate to next job if available
    const nextIndex = currentJobIndex + 1;
    //console.log('Current index:', currentJobIndex, 'Next index:', nextIndex, 'Total jobs:', jobs?.length);
    
    if (jobs && nextIndex < jobs.length) {
      //console.log('Loading next job:', jobs[nextIndex].title);
      setCurrentJobIndex(nextIndex);
      setJob(jobs[nextIndex]);
      position.setValue({ x: 0, y: 0 });
    } else {
     // console.log('No more jobs available, returning to browse screen');
      // No more jobs, go back to browse screen
      navigation.goBack();
    }
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false
    }).start();
  };

  const handleApply = async (job) => {
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
        _id: job._id,
        swipeMode: 1
      });
      
      showAlert('Applied!', `You have applied for ${job.title} at ${job.companyName}`);
      
      // Remove the job from the list in the previous screen
      navigation.setParams({ removeJobId: job._id });

      // Navigate to next job if available
      const nextIndex = currentJobIndex + 1;
      if (jobs && nextIndex < jobs.length) {
        setCurrentJobIndex(nextIndex);
        setJob(jobs[nextIndex]);
        position.setValue({ x: 0, y: 0 });
      } else {
        // No more jobs, go back to browse screen
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error applying for job:', error);
      
      if (error.response) {
        const { status, data } = error.response;
        
        if (status === 401) {
          showAlert('Session Expired', 'Please log in again');
          AsyncStorage.removeItem("userToken");
          navigation.replace('Login');
        } else {
          const errorMessage = data.error || 'Failed to submit application. Please try again.';
          showAlert('Error', errorMessage);
          
          // Check if error message contains "already"
          if (errorMessage.toLowerCase().includes('already')) {
            navigation.setParams({ removeJobId: job._id });
            // Navigate to next job if available
            const nextIndex = currentJobIndex + 1;
            if (jobs && nextIndex < jobs.length) {
              setCurrentJobIndex(nextIndex);
              setJob(jobs[nextIndex]);
              position.setValue({ x: 0, y: 0 });
            } else {
              navigation.goBack();
            }
          }
        }
      } else {
        showAlert('Error', 'Network error. Please check your internet connection.');
      }
    }
  };

  const handleReject = async (job) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        showAlert('Authentication Error', 'Please log in again');
        navigation.replace('Login');
        return;
      }
      
      // Set the authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Track job rejection (mode 2 for skip)
      await api.post('/jobsTracker', {
        _id: job._id,
        swipeMode: 2
      });
      
      showAlert('Rejected', `You have rejected ${job.title} at ${job.companyName}`);
    } catch (error) {
      console.error('Error rejecting job:', error);
      const errorMessage = error?.response?.data?.error || 'Failed to record your rejection. Please try again.';
      showAlert('Error', errorMessage);
      
      // Check if error message contains "already"
      if (errorMessage.toLowerCase().includes('already')) {
        navigation.setParams({ removeJobId: job._id });
      }
    }
  };

  const handleIgnore = async (job) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        showAlert('Authentication Error', 'Please log in again');
        navigation.replace('Login');
        return;
      }
      
      // Set the authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Track job ignore (mode 3 for ignore)
      await api.post('/jobsTracker', {
        _id: job._id,
        swipeMode: 3
      });
      
      showAlert('Ignored', `You have ignored ${job.title} at ${job.companyName}`);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error?.response?.data?.error || 'Failed to record your action. Please try again.';
      showAlert('Error', errorMessage);
      
      // Check if error message contains "already"
      if (errorMessage.toLowerCase().includes('already')) {
        navigation.setParams({ removeJobId: job._id });
      }
    }
  };

  const getCardStyle = () => {
    const rotate = position.x.interpolate({
      inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
      outputRange: ['-120deg', '0deg', '120deg']
    });

    return {
      ...position.getLayout(),
      transform: [{ rotate }]
    };
  };

  // Render loading state
  if (isLoading) {
    return (
      <LinearGradient
        colors={['#2A0845', '#6441A5']}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF69B4" />
          <Text style={styles.loadingText}>Loading job details...</Text>
        </View>
      </LinearGradient>
    );
  }

  // Render error state
  if (error) {
    return (
      <LinearGradient
        colors={['#2A0845', '#6441A5']}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF69B4" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // Render job details
  return (
    <LinearGradient
      colors={['#2A0845', '#6441A5']}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {!job ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF69B4" />
          <Text style={styles.loadingText}>Loading job details...</Text>
        </View>
      ) : (
        <Animated.View 
          style={[styles.card, getCardStyle()]} 
          {...panResponder.panHandlers}
        >
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.companyName}>{job.companyName}</Text>
          <Text style={styles.location}>{job.locations?.[0] || 'Location not specified'}</Text>
          
          <View style={styles.salaryContainer}>
            <Text style={styles.salaryLabel}>Salary Range</Text>
            <Text style={styles.salaryAmount}>{job.salaryRange || 'Not specified'}</Text>
          </View>

          <View style={styles.scheduleContainer}>
            <Text style={styles.scheduleLabel}>Schedule</Text>
            <Text style={styles.scheduleType}>{job.schedule || 'Not specified'}</Text>
          </View>

          {job.benefits && job.benefits.length > 0 && (
            <View style={styles.benefitsContainer}>
              <Text style={styles.benefitsLabel}>Benefits</Text>
              <Text style={styles.benefitsList}>
                {job.benefits.join(', ')}
              </Text>
            </View>
          )}

          <View style={styles.summaryContainer}>
            <Text style={styles.summaryLabel}>Job Summary</Text>
            <Text style={styles.summaryText}>
              {job.jobDescription || 'No description available.'}
            </Text>
          </View>

          {job.skills && job.skills.length > 0 && (
            <View style={styles.skillsContainer}>
              <Text style={styles.skillsLabel}>Required Skills</Text>
              <Text style={styles.skillsList}>
                {job.skills.join(', ')}
              </Text>
            </View>
          )}
        </Animated.View>
      )}

      {source !== 'MyJobs' && job && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.backToJobsButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backToJobsText}>Back to Jobs</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.applyNowButton}
            onPress={() => handleApply(job)}
          >
            <Text style={styles.applyNowText}>Apply Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 15,
    paddingTop: 40,
    paddingBottom: 5,
  },
  backButton: {
    padding: 8,
    marginBottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    margin: 20,
    padding: 20,
    marginTop: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  jobTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  companyName: {
    fontSize: 18,
    color: '#FFB6C1',
    marginBottom: 5,
  },
  location: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 20,
  },
  salaryContainer: {
    marginBottom: 15,
  },
  salaryLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 5,
  },
  salaryAmount: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
  },
  scheduleContainer: {
    marginBottom: 15,
  },
  scheduleLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 5,
  },
  scheduleType: {
    fontSize: 18,
    color: '#fff',
  },
  benefitsContainer: {
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 15,
    borderRadius: 10,
  },
  benefitsLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 10,
  },
  benefitsList: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
  },
  summaryContainer: {
    marginBottom: 20,
  },
  summaryLabel: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
  },
  skillsContainer: {
    marginBottom: 20,
  },
  skillsLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 10,
  },
  skillsList: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 40,
  },
  backToJobsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  backToJobsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  applyNowButton: {
    backgroundColor: '#FFB6C1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  applyNowText: {
    color: '#2A0845',
    fontSize: 16,
    fontWeight: '600',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FFB6C1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#2A0845',
    fontSize: 16,
    fontWeight: '600',
  },
}); 
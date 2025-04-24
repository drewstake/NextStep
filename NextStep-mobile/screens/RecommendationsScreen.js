import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  PanResponder,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import api from "../api/config";

// Create a cross-platform alert function
const showAlert = (title, message) => {
  if (Platform.OS === "web") {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

const SWIPE_THRESHOLD = 100;
const SCREEN_WIDTH = Dimensions.get("window").width;

export default function RecommendationsScreen({ navigation, route }) {
  const [currentJobIndex, setCurrentJobIndex] = useState(0);
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmployer, setIsEmployer] = useState(false);
  const [error, setError] = useState(null);
  const [savedJobs, setSavedJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Animation values for the card
  const position = useRef(new Animated.ValueXY()).current;
  const swipeOpacity = {
    right: position.x.interpolate({
      inputRange: [0, 50],
      outputRange: [0, 1],
      extrapolate: "clamp",
    }),
    left: position.x.interpolate({
      inputRange: [-50, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    }),
    up: position.y.interpolate({
      inputRange: [-50, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    }),
  };

  // Function to reset the card position
  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 5,
      useNativeDriver: false,
    }).start();
  };

  // Function to swipe the card out
  const swipeCard = (direction) => {
    let x = 0;
    let y = 0;

    if (direction === "right") {
      x = SCREEN_WIDTH + 100;
    } else if (direction === "left") {
      x = -SCREEN_WIDTH - 100;
    } else if (direction === "up") {
      y = -SCREEN_WIDTH;
    }

    Animated.timing(position, {
      toValue: { x, y },
      duration: 300,
      useNativeDriver: false,
    }).start(() => {

      position.setValue({ x: 0, y: 0 });

      /* 
      // Reset position for the next card
       */
      setTimeout(() => {
        console.log("jobs.length ", jobs.length);

        setJobs((prevJobs) => {
          console.log("swipeCard direction " + prevJobs[0]._id, direction);
          // Remove the current job from the array
          let currentJobId = null;
          currentJobId = prevJobs[0]._id;
          if (currentJobId) {
            if (direction === "right") {
              handleApply(currentJobId);
            } else if (direction === "left") {
              handleSkip(currentJobId);
            } else if (direction === "up") {
              handleSaveForLater(currentJobId);
            }
          }
          const updatedJobs = prevJobs.filter((_, index) => index !== 0);
          return updatedJobs;
        });

        // Create a new jobs array without the current job
      }, 100);

      // Process the action for the swiped job
    });
  };


  // PanResponder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (event, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (event, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          swipeCard("right");
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          swipeCard("left");
        } else if (gesture.dy < -SWIPE_THRESHOLD) {
          swipeCard("up");
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  useEffect(() => {
    console.log("Initial loadjobs.length ", jobs.length);
  }, []);
  // Reset position when jobs change
  useEffect(() => {
    console.log("jobs.length ", jobs.length);
    position.setValue({ x: 0, y: 0 });
  }, [jobs.length]);

  // Function to remove a job from the filtered list
  const removeJobFromList = (jobId) => {
    setJobs((prevJobs) => {
      // Filter out the swiped job
      const updatedJobs = prevJobs.filter((job) => job._id !== jobId);

      // Reset position immediately to prevent lingering animations
      position.setValue({ x: 0, y: 0 });

      return updatedJobs;
    });
  };

  // Handle job application
  const handleApply = async (jobId) => {
    try {
      const token = await AsyncStorage.getItem("userToken");

      if (!token) {
        showAlert("Authentication Error", "Please log in again");
        navigation.replace("Login");
        return;
      }

      // Set the authorization header
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // Track job application (mode 1 for apply)
      await api.post("/jobsTracker", {
        _id: jobId,
        swipeMode: 1,
      });

      // Job is already removed by the swipeCard function
      showAlert("Success", "Application submitted successfully!");
    } catch (error) {
      console.error("Error applying for job:", error);

      if (error.response) {
        const { status, data } = error.response;

        if (status === 401) {
          showAlert("Session Expired", "Please log in again");
          AsyncStorage.removeItem("userToken");
          navigation.replace("Login");
        } else {
          showAlert(
            "Error",
            data.error || "Failed to submit application. Please try again."
          );
        }
      } else {
        showAlert(
          "Error",
          "Network error. Please check your internet connection."
        );
      }
    }
  };

  const handleSkip = async (jobId) => {
    try {
      const token = await AsyncStorage.getItem("userToken");

      if (!token) {
        showAlert("Authentication Error", "Please log in again");
        navigation.replace("Login");
        return;
      }

      console.log("handleSkip jobId ", jobId);

      // Set the authorization header
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // Track job skip (mode 0 for skip)
      await api.post("/jobsTracker", {
        _id: jobId,
        swipeMode: 0,
      });

      // Job is already removed by the swipeCard function
    } catch (error) {
      console.error("Error skipping job:", error);

      if (error.response) {
        const { status } = error.response;

        if (status === 401) {
          showAlert("Session Expired", "Please log in again");
          AsyncStorage.removeItem("userToken");
          navigation.replace("Login");
        }
      }
    }
  };

  // Handle saving a job for later
  const handleSaveForLater = async (jobId) => {
    try {
      const token = await AsyncStorage.getItem("userToken");

      if (!token) {
        showAlert("Authentication Error", "Please log in again");
        navigation.replace("Login");
        return;
      }

      // Set the authorization header
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // Track job save (mode 2 for save for later)
      await api.post("/jobsTracker", {
        _id: jobId,
        swipeMode: 2,
      });

      // Add job to saved jobs
      const savedJob = jobs.find((job) => job._id === jobId);
      if (savedJob) {
        setSavedJobs((prev) => [...prev, savedJob]);
      }

      // Job is already removed by the swipeCard function
      showAlert("Success", "Job saved for later!");
    } catch (error) {
      console.error("Error saving job for later:", error);

      if (error.response) {
        const { status } = error.response;

        if (status === 401) {
          showAlert("Session Expired", "Please log in again");
          AsyncStorage.removeItem("userToken");
          navigation.replace("Login");
        }
      }
    }
  };

  // Fetch jobs from API
  const fetchJobs = async () => {
    try {
      console.log("Fetching jobs...");

      setIsLoading(true);
      setError(null);

      // Get the auth token from storage
      const token = await AsyncStorage.getItem("userToken");

      if (!token) {
        showAlert("Authentication Error", "Please log in again");
        navigation.replace("Login");
        return;
      }

      // Set the authorization header
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // Check if user is an employer
      const userProfile = await api.get("/profile");

      if (userProfile?.data?.isEmployer) {
        setIsEmployer(true);
        showAlert(
          "Access Denied",
          "Employer accounts cannot browse jobs. Please use the employer dashboard instead."
        );
        navigation.replace("EmployerDashboard");
        return;
      }
      const skills = userProfile.data.skills;
      const location = userProfile.data.location;


      let searchQuery = '';
      if (skills?.length > 0) {
        searchQuery = `skills: ${skills.join(',')}`;
      }
      if (location) {
        searchQuery += ` location: ${location}`;
      }


      // Make the API call
      const response = await api.get(`/retrieveJobsForHomepage${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : 'Any job'}`);

      // Check if we have valid jobs data
      if (!response || !response.data) {
        console.error("No response data:", response);
        setError("Failed to load jobs. No data received.");
        return;
      }

      // Ensure jobs data is an array
      const jobsData = Array.isArray(response.data) ? response.data : [];
      console.log("Jobs data:", jobsData);

      setJobs(jobsData);

    } catch (error) {
      console.error("Error fetching jobs:", error);

      if (error.response) {
        // Server responded with an error
        const { status, data } = error.response;

        if (status === 401) {
          // Unauthorized - token expired or invalid
          showAlert("Session Expired", "Please log in again");
          AsyncStorage.removeItem("userToken");
          navigation.replace("Login");
        } else if (status === 403) {
          // Forbidden - user doesn't have permission
          showAlert("Access Denied", "You do not have permission to view jobs");
        } else {
          // Other server errors
          setError(
            data?.error || "Failed to load jobs. Please try again later."
          );
        }
      } else if (error.request) {
        // Request was made but no response received
        setError("Network error. Please check your internet connection.");
      } else {
        // Something else happened
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load 
  useFocusEffect(
    React.useCallback(() => {
      const loadInitialData = async () => {
        try {
          await fetchJobs();
        } catch (error) {
          console.error("Error in initial data load:", error);
          setJobs([]);
        }
      };

      loadInitialData();
    }, [])
  );

  // Refresh view when screen comes into focus
  /* useFocusEffect(
    React.useCallback(() => {
      // Just refresh the current jobs without API call
      setJobs((prevJobs) => [...prevJobs]);
    }, [])
  ); */

  // Handle job removal when returning from job details
  useEffect(() => {
    const removeJobId = route.params?.removeJobId;
    if (removeJobId) {
      removeJobFromList(removeJobId);
      navigation.setParams({ removeJobId: null });
    }
  }, [route.params?.removeJobId]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={48} color="#fff" />
      <Text style={styles.emptyStateText}>
        {error ? error : "No jobs found"}
      </Text>
      <TouchableOpacity style={styles.refreshButton} onPress={fetchJobs}>
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCurrentJob = () => {
    if (jobs.length === 0) {
      return renderEmptyState();
    }

    const currentJob = jobs[currentJobIndex];

    // Calculate rotation based on X position
    const rotate = position.x.interpolate({
      inputRange: [-200, 0, 200],
      outputRange: ["-20deg", "0deg", "20deg"],
    });

    return (
      <View style={styles.jobCardContainer}>
        <Text style={styles.jobCount}>Showing {jobs.length} jobs</Text>
        <Text style={styles.swipeInstruction}>Swipe up to save for later</Text>

        <Animated.View
          style={[
            styles.jobCard,
            {
              transform: [
                { translateX: position.x },
                { translateY: position.y },
                { rotate: rotate },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Overlay labels that appear when swiping */}
          <Animated.View
            style={[
              styles.overlayLabel,
              styles.applyLabel,
              { opacity: swipeOpacity.right },
            ]}
          >
            <Text style={styles.applyLabelText}>APPLY</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.overlayLabel,
              styles.rejectLabel,
              { opacity: swipeOpacity.left },
            ]}
          >
            <Text style={styles.rejectLabelText}>REJECT</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.overlayLabel,
              styles.saveLabel,
              { opacity: swipeOpacity.up },
            ]}
          >
            <Text style={styles.saveLabelText}>SAVE</Text>
          </Animated.View>

          {/* Job content */}
          <Text style={styles.jobTitle}>{currentJob.title}</Text>
          <Text style={styles.companyName}>{currentJob.companyName}</Text>
          <Text style={styles.location}>
            {currentJob.locations?.[0]}
          </Text>

          <View style={styles.salaryContainer}>
            <Text style={styles.salaryLabel}>Salary Range</Text>
            <Text style={styles.salaryAmount}>{currentJob.salaryRange || 'Not specified'}</Text>
          </View>

          <View style={styles.scheduleContainer}>
            <Text style={styles.scheduleLabel}>Schedule</Text>
            <Text style={styles.scheduleType}>{currentJob.schedule || 'Not specified'}</Text>
          </View>

          {currentJob.benefits && currentJob.benefits.length > 0 && (
            <View style={styles.benefitsContainer}>
              <Text style={styles.benefitsLabel}>Benefits</Text>
              <Text style={styles.benefitsList}>
                {currentJob.benefits.join(', ')}
              </Text>
            </View>
          )}

          <View style={styles.jobDescription}>
            <Text style={styles.descriptionText}>
              {currentJob.jobDescription}
            </Text>
          </View>

          {currentJob.skills && currentJob.skills.length > 0 && (
            <View style={styles.skillsContainer}>
              <Text style={styles.skillsLabel}>Required Skills</Text>
              <Text style={styles.skillsList}>
                {currentJob.skills.join(', ')}
              </Text>
            </View>
          )}
        </Animated.View>

        <View style={styles.actionButtons}>
          <View style={styles.skipButton}>
            <Text style={styles.skipButtonText}>Swipe left to reject</Text>
          </View>

          <View style={styles.applyButton}>
            <Text style={styles.applyButtonText}>Swipe right to apply</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={["#2A0845", "#6441A5"]} style={styles.container}>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF69B4" />
            <Text style={styles.loadingText}>Loading jobs...</Text>
          </View>
        ) : (
          renderCurrentJob()
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 20,
    width: "100%",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: "row",
    width: "90%",
    maxWidth: 500,
    alignItems: "center",
    justifyContent: "space-between",
  },
  searchInput: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 25,
    padding: 12,
    paddingHorizontal: 20,
    fontSize: 16,
    flex: 1,
    marginRight: 10,
    color: "#333",
  },
  searchButton: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  searchButtonText: {
    color: "#333",
    fontWeight: "bold",
  },
  jobCardContainer: {
    flex: 1,
    alignItems: "center",
    padding: 20,
  },
  jobCount: {
    fontSize: 14,
    color: "#fff",
    marginBottom: 5,
  },
  swipeInstruction: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 20,
  },
  jobCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    elevation: 3,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  overlayLabel: {
    position: "absolute",
    padding: 10,
    borderWidth: 2,
    borderRadius: 10,
    zIndex: 100,
  },
  applyLabel: {
    top: 10,
    right: 10,
    borderColor: "#4CAF50",
    transform: [{ rotate: "10deg" }],
  },
  rejectLabel: {
    top: 10,
    left: 10,
    borderColor: "#F44336",
    transform: [{ rotate: "-10deg" }],
  },
  saveLabel: {
    top: 10,
    alignSelf: "center",
    borderColor: "#2196F3",
  },
  applyLabelText: {
    color: "#4CAF50",
    fontSize: 24,
    fontWeight: "bold",
  },
  rejectLabelText: {
    color: "#F44336",
    fontSize: 24,
    fontWeight: "bold",
  },
  saveLabelText: {
    color: "#2196F3",
    fontSize: 24,
    fontWeight: "bold",
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 5,
  },
  companyName: {
    fontSize: 16,
    color: "#000",
    marginBottom: 5,
  },
  location: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
  },
  jobDescription: {
    marginTop: 10,
  },
  descriptionText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 400,
    marginTop: 20,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  skipButtonText: {
    color: "#fff",
    fontSize: 14,
  },
  applyButton: {
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  applyButtonText: {
    color: "#fff",
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateText: {
    fontSize: 16,
    color: "#fff",
    marginTop: 10,
    textAlign: "center",
  },
  refreshButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#FF69B4",
    borderRadius: 8,
  },
  refreshButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 10,
    fontSize: 16,
  },
  salaryContainer: {
    marginBottom: 15,
  },
  salaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  salaryAmount: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  scheduleContainer: {
    marginBottom: 15,
  },
  scheduleLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  scheduleType: {
    fontSize: 16,
    color: '#000',
  },
  benefitsContainer: {
    marginBottom: 15,
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 10,
  },
  benefitsLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  benefitsList: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
  skillsContainer: {
    marginBottom: 15,
  },
  skillsLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  skillsList: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
});

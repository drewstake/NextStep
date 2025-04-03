import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, PanResponder, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;

export default function JobDetailsScreen({ route, navigation }) {
  const { job } = route.params;
  const [currentIndex, setCurrentIndex] = useState(0);
  const position = new Animated.ValueXY();

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
    const item = job;
    direction === 'right' ? handleApply(item) : 
    direction === 'left' ? handleReject(item) : 
    handleIgnore(item);

    position.setValue({ x: 0, y: 0 });
    setCurrentIndex(currentIndex + 1);
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false
    }).start();
  };

  const handleApply = (job) => {
    Alert.alert('Applied!', `You have applied for ${job.title} at ${job.company}`);
  };

  const handleReject = (job) => {
    Alert.alert('Rejected', `You have rejected ${job.title} at ${job.company}`);
  };

  const handleIgnore = (job) => {
    Alert.alert('Ignored', `You have ignored ${job.title} at ${job.company}`);
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

      <Animated.View 
        style={[styles.card, getCardStyle()]} 
        {...panResponder.panHandlers}
      >
        <Text style={styles.jobTitle}>{job.title}</Text>
        <Text style={styles.companyName}>{job.company}</Text>
        <Text style={styles.location}>{job.location}</Text>
        
        <View style={styles.salaryContainer}>
          <Text style={styles.salaryLabel}>Salary Range</Text>
          <Text style={styles.salaryAmount}>{job.salary}</Text>
        </View>

        <View style={styles.scheduleContainer}>
          <Text style={styles.scheduleLabel}>Schedule</Text>
          <Text style={styles.scheduleType}>{job.type}</Text>
        </View>

        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsLabel}>Benefits</Text>
          <Text style={styles.benefitsList}>
            Home Office Setup, Stock Options, Vision Insurance, Remote Work,{'\n'}
            Annual Bonus, Gym Membership, Flexible Hours, Team Events
          </Text>
        </View>

        <View style={styles.summaryContainer}>
          <Text style={styles.summaryLabel}>Job Summary</Text>
          <Text style={styles.summaryText}>
            Join {job.company}'s engineering team as a {job.title} and help us shape the
            future of technology. You'll work on challenging problems, contribute to our architecture
            decisions, and help us maintain high code quality standards.
          </Text>
        </View>

        <View style={styles.skillsContainer}>
          <Text style={styles.skillsLabel}>Required Skills</Text>
          <Text style={styles.skillsList}>
            Security, Confluence, Machine Learning, React, Scrum, CI/CD, AWS, GCP, Git
          </Text>
        </View>
      </Animated.View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.backToJobsButton}>
          <Text style={styles.backToJobsText}>Back to Jobs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.applyNowButton}>
          <Text style={styles.applyNowText}>Apply Now</Text>
        </TouchableOpacity>
      </View>
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
}); 
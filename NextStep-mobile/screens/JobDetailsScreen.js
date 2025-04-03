import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, PanResponder, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
      </View>

      <Animated.View 
        style={[styles.card, getCardStyle()]} 
        {...panResponder.panHandlers}
      >
        <Text style={styles.jobTitle}>{job.title}</Text>
        <Text style={styles.companyName}>{job.company}</Text>
        
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <Text style={styles.detailText}>{job.location}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={20} color="#666" />
            <Text style={styles.detailText}>{job.salary}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={styles.detailText}>{job.type}</Text>
          </View>
        </View>

        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionTitle}>Job Description</Text>
          <Text style={styles.description}>
            We are looking for a talented {job.title} to join our team. 
            The ideal candidate will have strong experience in the field and 
            be passionate about their work.
          </Text>
        </View>

        <View style={styles.requirementsContainer}>
          <Text style={styles.requirementsTitle}>Requirements</Text>
          <Text style={styles.requirements}>
            • 3+ years of experience{'\n'}
            • Strong problem-solving skills{'\n'}
            • Excellent communication abilities{'\n'}
            • Bachelor's degree or equivalent
          </Text>
        </View>
      </Animated.View>

      <View style={styles.swipeInstructions}>
        <Text style={styles.instructionText}>Swipe right to apply</Text>
        <Text style={styles.instructionText}>Swipe left to reject</Text>
        <Text style={styles.instructionText}>Swipe up to ignore</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    marginTop: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    top: 370,
    backgroundColor: '#fff',
    borderRadius: 15,
    marginTop: 60,
    padding: 20,
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  companyName: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#666',
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  requirementsContainer: {
    marginBottom: 20,
  },
  requirementsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  requirements: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  swipeInstructions: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
}); 
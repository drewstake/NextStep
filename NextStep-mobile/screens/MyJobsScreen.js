import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getUserApplications } from '../api/services';
import { useFocusEffect } from '@react-navigation/native';

const getStatusColor = (status) => {
  switch (status) {
    case 'Pending':
      return '#FF69B4'; // Pink to match theme
    case 'Offered':
      return '#34C759'; // Keep green for success
    case 'Rejected':
      return '#F00'; // Keep red for rejection
    default:
      return '#666';
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'Pending':
      return 'time-outline';
    case 'Offered':
      return 'checkmark-circle-outline';
    case 'Rejected':
      return 'close-circle-outline';
    default:
      return 'help-circle-outline';
  }
};

export default function MyJobsScreen({ navigation }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      fetchApplications();
    }, [])
  );

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const data = await getUserApplications();
      setApplications(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError('Failed to load your applications. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const renderApplicationItem = ({ item }) => {
    // Format the date properly
    const formatDate = (dateString) => {
      if (!dateString) return 'Date not available';
      
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          //console.log('Invalid date string:', dateString);
          return 'Date not available';
        }
        return date.toLocaleDateString();
      } catch (error) {
        console.error('Error formatting date:', error);
        return 'Date not available';
      }
    };


    return (
      <TouchableOpacity 
        style={styles.applicationCard}
        onPress={() => navigation.navigate('JobDetails', { 
          job: item.jobDetails,
          jobId: item.job_id || item.jobDetails._id,
          source: 'MyJobs'
        })}
      >
        <View style={styles.applicationHeader}>
          <View>
            <Text style={styles.jobTitle}>{item.jobDetails.title}</Text>
            <Text style={styles.companyName}>{item.companyDetails.name}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Ionicons name={getStatusIcon(item.status)} size={16} color="#fff" />
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        <View style={styles.applicationFooter}>
          <Text style={styles.dateText}>Applied on {formatDate(item.date_applied)}</Text>
          <TouchableOpacity 
            style={styles.detailsButton}
            onPress={() => navigation.navigate('JobDetails', { 
              job: item.jobDetails,
              jobId: item.job_id || item.jobDetails._id,
              source: 'MyJobs'
            })}
          >
            <Text style={styles.detailsButtonText}>View Details</Text>
            <Ionicons name="chevron-forward" size={16} color="#FF69B4" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#2A0845', '#6441A5']}
        style={styles.container}
      >
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF69B4" />
          <Text style={styles.loadingText}>Loading your applications...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient
        colors={['#2A0845', '#6441A5']}
        style={styles.container}
      >
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={50} color="#FF69B4" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchApplications}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#2A0845', '#6441A5']}
      style={styles.container}
    >
      {applications.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="document-text-outline" size={50} color="#FF69B4" />
          <Text style={styles.emptyText}>You haven't applied to any jobs yet</Text>
        </View>
      ) : (
        <FlatList
          data={applications}
          renderItem={renderApplicationItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
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
  listContainer: {
    padding: 15,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  emptyText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#FF69B4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  applicationCard: {
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
  applicationHeader: {
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
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '500',
  },
  applicationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  dateText: {
    color: '#666',
    fontSize: 14,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsButtonText: {
    color: '#FF69B4',
    marginRight: 5,
    fontSize: 14,
    fontWeight: '500',
  },
}); 
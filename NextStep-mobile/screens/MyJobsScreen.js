import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const DUMMY_APPLICATIONS = [
  {
    id: '1',
    title: 'Senior Software Engineer',
    company: 'Tech Corp',
    status: 'Applied',
    date: '2024-03-15',
  },
  {
    id: '2',
    title: 'Product Manager',
    company: 'Innovation Labs',
    status: 'Offered',
    date: '2024-03-10',
  },
  {
    id: '3',
    title: 'UX Designer',
    company: 'Design Studio',
    status: 'Rejected',
    date: '2024-03-05',
  },
];

const getStatusColor = (status) => {
  switch (status) {
    case 'Applied':
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
    case 'Applied':
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
  const renderApplicationItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.applicationCard}
      onPress={() => navigation.navigate('JobDetails', { job: item })}
    >
      <View style={styles.applicationHeader}>
        <View>
          <Text style={styles.jobTitle}>{item.title}</Text>
          <Text style={styles.companyName}>{item.company}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Ionicons name={getStatusIcon(item.status)} size={16} color="#fff" />
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.applicationFooter}>
        <Text style={styles.dateText}>Applied on {item.date}</Text>
        <TouchableOpacity style={styles.detailsButton}>
          <Text style={styles.detailsButtonText}>View Details</Text>
          <Ionicons name="chevron-forward" size={16} color="#FF69B4" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={['#2A0845', '#6441A5']}
      style={styles.container}
    >
      <FlatList
        data={DUMMY_APPLICATIONS}
        renderItem={renderApplicationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
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
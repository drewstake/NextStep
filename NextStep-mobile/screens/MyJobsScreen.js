import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
      return '#007AFF';
    case 'Offered':
      return '#34C759';
    case 'Rejected':
      return '#FF3B30';
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
    <TouchableOpacity style={styles.applicationCard}>
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
          <Ionicons name="chevron-forward" size={16} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Applications</Text>
      </View>
      <FlatList
        data={DUMMY_APPLICATIONS}
        renderItem={renderApplicationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
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
    marginBottom: 5,
  },
  companyName: {
    fontSize: 16,
    color: '#666',
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
    color: '#007AFF',
    marginRight: 5,
    fontSize: 14,
  },
}); 
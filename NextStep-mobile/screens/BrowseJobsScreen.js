import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

const DUMMY_JOBS = [
  {
    id: '1',
    title: 'Senior Software Engineer',
    company: 'Tech Corp',
    location: 'New York, NY',
    salary: '$120,000 - $150,000',
    type: 'Full-time',
  },
  {
    id: '2',
    title: 'Product Manager',
    company: 'Innovation Labs',
    location: 'Remote',
    salary: '$100,000 - $130,000',
    type: 'Full-time',
  },
  {
    id: '3',
    title: 'UX Designer',
    company: 'Design Studio',
    location: 'San Francisco, CA',
    salary: '$90,000 - $120,000',
    type: 'Full-time',
  },
];

export default function BrowseJobsScreen() {
  const renderJobItem = ({ item }) => (
    <TouchableOpacity style={styles.jobCard}>
      <Text style={styles.jobTitle}>{item.title}</Text>
      <Text style={styles.companyName}>{item.company}</Text>
      <View style={styles.jobDetails}>
        <Text style={styles.detail}>{item.location}</Text>
        <Text style={styles.detail}>{item.salary}</Text>
        <Text style={styles.detail}>{item.type}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Available Jobs</Text>
      <FlatList
        data={DUMMY_JOBS}
        renderItem={renderJobItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 20,
    backgroundColor: '#f5f5f5',
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
  jobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  companyName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
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
}); 
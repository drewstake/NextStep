import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function AboutScreen() {
  return (
    <LinearGradient
      colors={['#2A0845', '#6441A5']}
      style={styles.container}
    >
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.brandName}>NEXT<Text style={styles.brandHighlight}>STEP</Text></Text>
          <Text style={styles.version}>Version 1.0.0</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Us</Text>
          <View style={styles.card}>
            <Text style={styles.description}>
              NextStep is your platform for finding the perfect job opportunity.
              We connect talented professionals with amazing companies, making the
              job search process seamless and efficient.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.card}>
            <View style={styles.featureItem}>
              <Ionicons name="search-outline" size={24} color="#FF69B4" />
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Smart Job Search</Text>
                <Text style={styles.featureDescription}>Find jobs that match your skills and preferences</Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="briefcase-outline" size={24} color="#FF69B4" />
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Application Tracking</Text>
                <Text style={styles.featureDescription}>Keep track of all your job applications in one place</Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="chatbubbles-outline" size={24} color="#FF69B4" />
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Direct Messaging</Text>
                <Text style={styles.featureDescription}>Communicate directly with employers</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <View style={styles.card}>
            <Text style={styles.contactText}>Email: support@nextstep.com</Text>
            <Text style={styles.contactText}>Website: www.nextstep.com</Text>
            <Text style={styles.contactText}>Phone: 1-800-NEXTSTEP</Text>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 30,
  },
  brandName: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
  },
  brandHighlight: {
    color: '#FF69B4',
  },
  version: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    marginTop: 5,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  featureText: {
    marginLeft: 15,
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  contactText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
}); 
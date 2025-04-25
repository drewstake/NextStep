import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import api from '../api/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../config';


// Create a cross-platform alert function
const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    location: '',
    title: '',
    skills: [],
    resume: null
  });
  const [newSkill, setNewSkill] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showAlert('Authentication Error', 'Please log in again');
        navigation.replace('Login');
        return;
      }

      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const response = await api.get('/profile');
      setProfile(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      if (error.response) {
        const { status } = error.response;
        if (status === 401) {
          showAlert('Session Expired', 'Please log in again');
          AsyncStorage.removeItem("userToken");
          navigation.replace('Login');
          return;
        }
      }
      showAlert('Error', 'Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    AsyncStorage.removeItem('userToken');
    navigation.replace('Login');
  };

  const handleResumeUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      });

      if (!result.canceled) {
        setIsAnalyzing(true);
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          showAlert('Authentication Error', 'Please log in again');
          navigation.replace('Login');
          return;
        }

        const formData = new FormData();
        
        if (Platform.OS === 'web') {
          // For web, we need to fetch the file and create a Blob
          const response = await fetch(result.assets[0].uri);
          const blob = await response.blob();
          formData.append('pdf', blob, result.assets[0].name);
        } else {
          // For mobile platforms
          const fileUri = Platform.OS === 'ios' 
            ? result.assets[0].uri.replace('file://', '') 
            : result.assets[0].uri;

          formData.append('pdf', {
            uri: fileUri,
            type: result.assets[0].mimeType || 'application/pdf',
            name: result.assets[0].name || 'resume.pdf'
          });
        }

        console.log('FormData entries:');
        for (let [key, value] of formData.entries()) {
          console.log(key, value);
        }

        const response = await axios({
          url: `${API_BASE_URL}/analyze-resume`,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          data: formData,
        });

        if (response.data) {
          const { skills: analyzedSkills } = response.data;
          setProfile(prev => ({
            ...prev,
            resume: result.assets[0],
            skills: analyzedSkills || prev.skills
          }));
          showAlert('Success', 'Resume analyzed successfully! Skills have been updated.');
        }
      } else {
        console.log('Document picker was canceled');
      }
    } catch (error) {
      console.error('Error analyzing resume:', error);
      if (error.response) {
        const { status } = error.response;
        if (status === 401) {
          showAlert('Session Expired', 'Please log in again');
          AsyncStorage.removeItem("userToken");
          navigation.replace('Login');
          return;
        }
        console.error('Server response:', error.response.data);
      }
      showAlert('Error', 'Failed to analyze resume. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        showAlert('Authentication Error', 'Please log in again');
        navigation.replace('Login');
        return;
      }

      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const formData = new FormData();
      formData.append('full_name', profile.full_name);
      formData.append('email', profile.email);
      formData.append('phone', profile.phone);
      formData.append('location', profile.location);
      formData.append('title', profile.title);
      formData.append('skills', JSON.stringify(profile.skills));
      
      if (profile.resume) {
        if (Platform.OS === 'web') {
          // For web, we need to fetch the file and create a Blob
          const response = await fetch(profile.resume.uri);
          const blob = await response.blob();
          formData.append('resume', blob, profile.resume.name);
        } else {
          // For mobile platforms
          const fileUri = Platform.OS === 'ios' 
            ? profile.resume.uri.replace('file://', '') 
            : profile.resume.uri;

          formData.append('resume', {
            uri: fileUri,
            type: profile.resume.mimeType || 'application/pdf',
            name: profile.resume.name || 'resume.pdf'
          });
        }
      }

      await api.post('/updateprofile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      showAlert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      if (error.response) {
        const { status } = error.response;
        if (status === 401) {
          showAlert('Session Expired', 'Please log in again');
          AsyncStorage.removeItem("userToken");
          navigation.replace('Login');
          return;
        }
      }
      showAlert('Error', 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
      setProfile({
        ...profile,
        skills: [...profile.skills, newSkill.trim()]
      });
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setProfile({
      ...profile,
      skills: profile.skills.filter(skill => skill !== skillToRemove)
    });
  };

  const handleViewResume = () => {
    try {
      if (!profile.resumeFile || !profile.resumeFile.buffer) {
        showAlert('Error', 'No resume data available');
        return;
      }

      // Create a blob from the base64 data
      const byteCharacters = atob(profile.resumeFile.buffer);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: profile.resumeFile.mimetype });
      
      // Create URL and open in new window
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error viewing resume:', error);
      showAlert('Error', 'Failed to view resume. Please try again.');
    }
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          onPress={handleSignOut}
          style={styles.headerButton}
        >
          <Ionicons name="log-out-outline" size={24} color="#FF69B4" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FF69B4" />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#2A0845', '#6441A5']}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {profile.full_name.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
          <TextInput
            style={styles.nameInput}
            value={profile.full_name}
            onChangeText={(text) => setProfile({ ...profile, full_name: text })}
            placeholder="Full Name"
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
          />
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={profile.email}
                onChangeText={(text) => setProfile({ ...profile, email: text })}
                placeholder="Email"
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={profile.phone}
                onChangeText={(text) => setProfile({ ...profile, phone: text })}
                placeholder="Phone Number"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={profile.location}
                onChangeText={(text) => setProfile({ ...profile, location: text })}
                placeholder="Location"
                placeholderTextColor="#666"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <View style={styles.infoCard}>
            <View style={styles.skillsInputContainer}>
              <TextInput
                style={[styles.input, styles.skillInput]}
                value={newSkill}
                onChangeText={setNewSkill}
                placeholder="Add a new skill"
                placeholderTextColor="#666"
                onSubmitEditing={handleAddSkill}
              />
              <TouchableOpacity 
                style={styles.addSkillButton}
                onPress={handleAddSkill}
              >
                <Ionicons name="add-circle-outline" size={24} color="#FF69B4" />
              </TouchableOpacity>
            </View>
            <View style={styles.skillsList}>
              {profile.skills.map((skill, index) => (
                <View key={index} style={styles.skillItem}>
                  <Text style={styles.skillText}>{skill}</Text>
                  <TouchableOpacity 
                    onPress={() => handleRemoveSkill(skill)}
                    style={styles.removeSkillButton}
                  >
                    <Ionicons name="close-circle-outline" size={20} color="#FF69B4" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resume</Text>
          <View style={styles.infoCard}>
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={handleResumeUpload}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <ActivityIndicator color="#FF69B4" />
              ) : (
                <>
                  <Ionicons name="document-attach-outline" size={24} color="#FF69B4" style={styles.uploadIcon} />
                  <Text style={styles.uploadButtonText}>
                    {profile.resume ? 'Update Resume' : 'Upload Resume'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {profile.resumeFile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Resume</Text>
            <View style={styles.infoCard}>
              <View style={styles.resumeContainer}>
                <View style={styles.resumeInfo}>
                  <Ionicons name="document-text-outline" size={24} color="#FF69B4" />
                  <Text style={styles.resumeName}>{profile.resumeFile.originalname}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.viewResumeButton}
                  onPress={handleViewResume}
                >
                  <Ionicons name="eye-outline" size={20} color="#FF69B4" />
                  <Text style={styles.viewResumeText}>View</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={24} color="#fff" style={styles.saveIcon} />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 30,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF69B4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  nameInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
    textAlign: 'center',
    width: '100%',
  },
  titleInput: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    width: '100%',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  infoCard: {
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  headerButton: {
    padding: 10,
    marginLeft: 10,
  },
  saveButton: {
    backgroundColor: '#FF69B4',
    borderRadius: 25,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveIcon: {
    marginRight: 10,
  },
  skillsInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  skillInput: {
    flex: 1,
    marginRight: 10,
  },
  addSkillButton: {
    padding: 10,
  },
  skillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  skillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: '-webkit-fill-available',
  },
  skillText: {
    fontSize: 14,
    color: '#333',
    marginRight: 5,
    maxWidth: '-webkit-fill-available',
  },
  removeSkillButton: {
    padding: 2,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 15,
    borderWidth: 2,
    borderColor: '#FF69B4',
    borderStyle: 'dashed',
  },
  uploadIcon: {
    marginRight: 10,
  },
  uploadButtonText: {
    color: '#FF69B4',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
  },
  resumeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  resumeName: {
    color: '#333',
    fontSize: 16,
    marginLeft: 10,
    flex: 1,
  },
  viewResumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF69B4',
    marginLeft: 10,
  },
  viewResumeText: {
    color: '#FF69B4',
    fontSize: 14,
    marginLeft: 5,
    fontWeight: '600',
  },
}); 
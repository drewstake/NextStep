import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/config';

const DUMMY_CONTACTS = [
  {
    id: '1',
    name: 'Sarah Johnson',
    lastMessage: 'Great! When can you start?',
    time: '2:30 PM',
    unreadCount: 2,
    avatar: 'SJ',
  },
  {
    id: '2',
    name: 'Mike Chen',
    lastMessage: 'Thank you for your application',
    time: '1:45 PM',
    unreadCount: 0,
    avatar: 'MC',
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    lastMessage: 'We would like to schedule an interview',
    time: '11:20 AM',
    unreadCount: 1,
    avatar: 'ER',
  },
];

const DUMMY_MESSAGES = {
  '1': [
    { id: '1', text: 'Hi, I saw your application for the Senior Software Engineer position', isMe: false },
    { id: '2', text: 'Hello! Yes, I\'m very interested in the role', isMe: true },
    { id: '3', text: 'Great! When can you start?', isMe: false },
  ],
  '2': [
    { id: '1', text: 'Thank you for your application', isMe: false },
    { id: '2', text: 'Thank you for considering me', isMe: true },
  ],
  '3': [
    { id: '1', text: 'We would like to schedule an interview', isMe: false },
    { id: '2', text: 'I\'m available next week', isMe: true },
  ],
};

// Create a cross-platform alert function
const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function MessagesScreen({ navigation }) {
  const [selectedContact, setSelectedContact] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  const messagesListRef = useRef(null);

  const fetchContacts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get the auth token from storage
      const token = await AsyncStorage.getItem('userToken');

      if (!token) {
        showAlert('Authentication Error', 'Please log in again');
        navigation.replace('Login');
        return;
      }

      // Set the authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Make the API call to get recent contacts
      const response = await api.get('/myRecentEmployerContacts');
      setContacts(response.data);
    } catch (error) {
      console.error('Error fetching contacts:', error);

      if (error.response) {
        // Server responded with an error
        const { status, data } = error.response;

        if (status === 401) {
          // Unauthorized - token expired or invalid
          showAlert('Session Expired', 'Please log in again');
          AsyncStorage.removeItem("userToken");
          navigation.replace('Login');
        } else if (status === 403) {
          // Forbidden - user doesn't have permission
          showAlert('Access Denied', 'You do not have permission to view contacts');
        } else {
          // Other server errors
          setError(data.error || 'Failed to load contacts. Please try again later.');
        }
      } else if (error.request) {
        // Request was made but no response received
        setError('Network error. Please check your internet connection.');
      } else {
        // Something else happened
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (companyId) => {
    try {
      setIsLoadingMessages(true);
      setError(null);

      // Get the auth token from storage
      const token = await AsyncStorage.getItem('userToken');

      if (!token) {
        showAlert('Authentication Error', 'Please log in again');
        navigation.replace('Login');
        return;
      }

      // Set the authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Make the API call to get messages
      const response = await api.get(`/messages?companyId=${companyId}`);

      // Sort messages by createdAt in ascending order
      const sortedMessages = response.data.sort((a, b) =>
        new Date(a.createdAt) - new Date(b.createdAt)
      );

      setMessages(sortedMessages);
      
      // Scroll to bottom after messages are updated
      setTimeout(() => {
        messagesListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error fetching messages:', error);

      if (error.response) {
        const { status, data } = error.response;

        if (status === 401) {
          showAlert('Session Expired', 'Please log in again');
          AsyncStorage.removeItem("userToken");
          navigation.replace('Login');
        } else {
          setError(data.error || 'Failed to load messages. Please try again later.');
        }
      } else if (error.request) {
        setError('Network error. Please check your internet connection.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleContactSelect = async (contact) => {
    // Clear any existing polling interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }

    setSelectedContact(contact);
    await fetchMessages(contact._id);

    // Start polling for new messages
    const interval = setInterval(() => {
      if (contact._id) {
        fetchMessages(contact._id);
      }
    }, 5000);

    setPollingInterval(interval);
  };

  // Clean up polling interval when component unmounts or contact changes
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Initial load
  useEffect(() => {
    fetchContacts();
  }, []);

  // Refresh contacts when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchContacts();
    }, [])
  );

  const renderContactItem = ({ item }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => handleContactSelect(item)}
    >
      <View style={[styles.avatarContainer, { backgroundColor: '#FF69B4' }]}>
        <Text style={styles.avatarText}>{item.companyName.charAt(0)}</Text>
      </View>
      <View style={styles.contactInfo}>
        <View style={styles.contactHeader}>
          <Text style={styles.contactName}>{item.companyName}</Text>
          <Text style={styles.messageTime}>{item.time}</Text>
        </View>
        <View style={styles.messagePreview}>
          <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
          {item.countOfUnreadMessages > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: '#FF69B4' }]}>
              <Text style={styles.unreadCount}>{item.countOfUnreadMessages}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderMessageItem = ({ item }) => (
    <View style={[
      styles.messageContainer,
      !item.receiverId ? styles.myMessage : styles.theirMessage
    ]}>
      <Text style={[
        styles.messageText,
        !item.receiverId ? styles.myMessageText : styles.theirMessageText
      ]}>{item.content}</Text>
    </View>
  );

  const handleSendMessage = async () => {
    if (messageText.trim()) {
      try {
        // Get the auth token from storage
        const token = await AsyncStorage.getItem('userToken');

        if (!token) {
          showAlert('Authentication Error', 'Please log in again');
          navigation.replace('Login');
          return;
        }

        // Set the authorization header
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Send the message
        await api.post('/messages/company', {
          companyId: selectedContact._id,
          content: messageText.trim()
        });

        // Clear the input field
        setMessageText('');

        // Fetch the latest messages
        await fetchMessages(selectedContact._id);
      } catch (error) {
        console.error('Error sending message:', error);

        if (error.response) {
          const { status, data } = error.response;

          if (status === 401) {
            showAlert('Session Expired', 'Please log in again');
            AsyncStorage.removeItem("userToken");
            navigation.replace('Login');
          } else {
            showAlert('Error', data.error || 'Failed to send message. Please try again.');
          }
        } else {
          showAlert('Error', 'Network error. Please check your internet connection.');
        }
      }
    }
  };

  if (selectedContact) {
    return (
      <LinearGradient
        colors={['#2A0845', '#6441A5']}
        style={styles.chatContainer}
      >
        <View style={styles.chatHeader}>
          <TouchableOpacity
            onPress={() => setSelectedContact(null)}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderName}>{selectedContact.companyName}</Text>
            <Text style={styles.chatHeaderStatus}>Online</Text>
          </View>
        </View>

        <FlatList
          ref={messagesListRef}
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => messagesListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.messageInputContainer}>
          <TextInput
            style={styles.messageInput}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            placeholderTextColor="#666"
            multiline
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSendMessage}
          >
            <Ionicons name="send" size={24} color="#FF69B4" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#2A0845', '#6441A5']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF69B4" />
          <Text style={styles.loadingText}>Loading contacts...</Text>
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
          <TouchableOpacity style={styles.retryButton} onPress={fetchContacts}>
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
      <FlatList
        data={contacts}
        renderItem={renderContactItem}
        keyExtractor={(item) => item._id}
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
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  contactInfo: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  messageTime: {
    fontSize: 14,
    color: '#666',
  },
  messagePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 10,
  },
  unreadBadge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 5,
    marginRight: 10,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  chatHeaderStatus: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messagesList: {
    padding: 15,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 15,
    marginBottom: 10,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#FF69B4',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  messageText: {
    fontSize: 16,
  },
  myMessageText: {
    color: '#fff',
  },
  theirMessageText: {
    color: '#000',
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    color: '#333',
  },
  sendButton: {
    padding: 5,
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
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
}); 
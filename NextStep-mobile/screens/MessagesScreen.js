import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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

export default function MessagesScreen({ navigation }) {
  const [selectedContact, setSelectedContact] = useState(null);
  const [messageText, setMessageText] = useState('');

  const renderContactItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.contactItem}
      onPress={() => setSelectedContact(item)}
    >
      <View style={[styles.avatarContainer, { backgroundColor: '#FF69B4' }]}>
        <Text style={styles.avatarText}>{item.avatar}</Text>
      </View>
      <View style={styles.contactInfo}>
        <View style={styles.contactHeader}>
          <Text style={styles.contactName}>{item.name}</Text>
          <Text style={styles.messageTime}>{item.time}</Text>
        </View>
        <View style={styles.messagePreview}>
          <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
          {item.unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: '#FF69B4' }]}>
              <Text style={styles.unreadCount}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderMessageItem = ({ item }) => (
    <View style={[
      styles.messageContainer,
      item.isMe ? styles.myMessage : styles.theirMessage
    ]}>
      <Text style={[
        styles.messageText,
        item.isMe ? styles.myMessageText : styles.theirMessageText
      ]}>{item.text}</Text>
    </View>
  );

  const handleSendMessage = () => {
    if (messageText.trim()) {
      // TODO: Implement actual message sending
      setMessageText('');
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
            <Text style={styles.chatHeaderName}>{selectedContact.name}</Text>
            <Text style={styles.chatHeaderStatus}>Online</Text>
          </View>
        </View>

        <FlatList
          data={DUMMY_MESSAGES[selectedContact.id]}
          renderItem={renderMessageItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
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

  return (
    <LinearGradient
      colors={['#2A0845', '#6441A5']}
      style={styles.container}
    >
      <FlatList
        data={DUMMY_CONTACTS}
        renderItem={renderContactItem}
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
}); 
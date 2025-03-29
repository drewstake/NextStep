import React, { useState, useEffect, useContext, useCallback } from 'react';
import { TokenContext } from '../components/TokenContext';
import jwt_decode from 'jwt-decode';
import axiosInstance from '../utils/axiosConfig';
import { useNavigate } from 'react-router-dom';
import '../styles/Messenger.css';

const Messenger = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [newContact, setNewContact] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedContact, setSelectedContact] = useState('');
  const [showNewMessagePanel, setShowNewMessagePanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { token } = useContext(TokenContext);
  const decoded = token ? jwt_decode(token) : null;
  const currentUserId = decoded?.id;

  const fetchMyExchanges = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axiosInstance.get('/messages');
      //console.log("Fetching messages");
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [token]);

  const refreshMessages = useCallback(async () => {
    console.log("Refreshing messages");
    fetchMyExchanges();
    fetchRecentContactsAndUnreadCounts();
    if (selectedContact?.contactId) {
      // Find the current contact in contacts array to check unread count
       const currentContact = contacts.find(c => c.contactId === selectedContact.contactId);
      if (currentContact?.countOfUnreadMessages > 0) {
        console.log("Refreshed messages");
        setTimeout(() => {
          markMessagesAsRead(selectedContact.contactId);
        }, 1000);
      }
     }
     console.log("Exiting refreshMessages");
    }, [fetchMyExchanges, selectedContact, contacts]);

  useEffect(() => {
    console.log("Messenger useEffect");
    if (!token) return;

    fetchMyExchanges();
    fetchRecentContactsAndUnreadCounts();
    fetchAllUsers();

    const interval = setInterval(refreshMessages, 2000);
    return () => clearInterval(interval);
  }, [token, fetchMyExchanges, refreshMessages]);

  const setSelectedContactForNewMessage = async (pickedUser) => {
    setNewContact(pickedUser);
    setSelectedContact(pickedUser);
  };

  const fetchRecentContactsAndUnreadCounts = async () => {
    try {
      const response = await axiosInstance.get('/myRecentContacts');
      setContacts(response.data);
     // console.log("Fetching recent contacts");
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleUserSelected = (user) => {
    setSelectedContact(user);
    //    fetchMyExchanges();
    console.log("User selected");
    markMessagesAsRead(user.contactId);
    fetchRecentContactsAndUnreadCounts();
  };

  const markMessagesAsRead = async (contactId) => {
    try {
      await axiosInstance.put(`/messages/read/${contactId}`);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await axiosInstance.get('/users');
      setAllUsers(response.data);
    } catch (error) {
      console.error('Error fetching all users:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!selectedContact?.contactId || !newMessage || !token) return;

    try {
      await axiosInstance.post('/messages', {
        receiverId: selectedContact.contactId,
        content: newMessage?.trim()
      });

      setNewMessage('');
      setNewContact('');
      refreshMessages(); // Refresh messages after sending
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Filter users based on search query
  const filteredUsers = allUsers.filter(user =>
    (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())) &&
    user._id !== currentUserId
  );

  // Find the selected user's name from the most recent message
  const selectedUserName = messages.find(msg =>
    (msg.senderId === selectedContact.contactId && msg.receiverId === currentUserId) ||
    (msg.receiverId === selectedContact.contactId && msg.senderId === currentUserId)
  )?.senderId === selectedContact?.contactId ?
    messages.find(msg => msg.senderId === selectedContact.contactId)?.senderName :
    messages.find(msg => msg.receiverId === selectedContact.contactId)?.receiverName || '';

  if (!token) {
    navigate('/login');
  }

  return (
    <div className="messenger-container">
      <div className="messenger-sidebar">
        <div className="sidebar-header">
          <h2>Contacts</h2>
          <button
            className="new-message-btn"
            onClick={() => setShowNewMessagePanel(true)}
          >
            New
          </button>
        </div>

        {/* Contacts list */}
        <div className="users-list">
          {contacts.map(contact => (
            <div
              key={contact.contactId}
              className={`user-item ${selectedContact?.contactId === contact.contactId ? 'selected' : ''}`}
              onClick={() => handleUserSelected(contact)}
            >
              <div className="user-item-name">
                <div className="contact-name">
                  {contact.contactName}
                  {contact.countOfUnreadMessages > 0 && (
                    <span className="unread-badge">{contact.countOfUnreadMessages}</span>
                  )}
                </div>
                <div className="contact-email">{contact.email}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New message panel */}
      {showNewMessagePanel && (
        <div className="new-message-panel">
          <div className="new-message-content">
            <div className="new-message-header">
              <h3>Select a Contact</h3>
              <button
                className="close-btn"
                onClick={() => setShowNewMessagePanel(false)}
              >
                ×
              </button>
            </div>
            <div className="search-box">
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="all-users-list">
              {filteredUsers.map(user => (
                <div
                  key={user._id}
                  className="user-item"
                  onClick={() => {
                    setSelectedContactForNewMessage(user);
                    setShowNewMessagePanel(false);
                  }}
                >
                  <div className="user-item-name">{user.full_name || user.email}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Messages Panel */}
      <div className="messenger-main">
        {selectedContact?.contactId ? (
          <>
            <div className="messenger-header">
              <h3>{newContact ? newContact.full_name : selectedUserName}</h3>
            </div>
            <div className="messages-container">
              {messages
                .filter(msg =>
                  (msg.senderId === selectedContact?.contactId && msg.receiverId === currentUserId) ||
                  (msg.receiverId === selectedContact?.contactId && msg.senderId === currentUserId)
                )
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                .map(message => (
                  <div
                    key={message._id}
                    className={`message ${message.senderId === selectedContact?.contactId ? 'received' : 'sent'}`}
                  >
                    <div className="message-content">{message.content}</div>
                    <div className="message-time">
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
            </div>
            <form onSubmit={sendMessage} className="message-form">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="message-input"
              />
              <button
                type="submit"
                className="send-button"
                disabled={!newMessage?.trim()}
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="no-chat-selected">
            <p>Select a user to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messenger; 
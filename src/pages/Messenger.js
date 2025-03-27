import React, { useState, useEffect, useContext } from 'react';
import { TokenContext } from '../components/TokenContext';
import jwt_decode from 'jwt-decode';
import '../styles/Messenger.css';

const Messenger = () => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [showNewMessagePanel, setShowNewMessagePanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { token } = useContext(TokenContext);
  const decoded = token ? jwt_decode(token) : null;
  const currentUserId = decoded?.id;

  useEffect(() => {
    if (!token) return;
    
    fetchMessages();
    fetchUsers();
    fetchAllUsers();

    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [selectedUser, token]);

  const fetchMessages = async () => {
    if (!token) return;
    try {
      const response = await fetch('http://localhost:4000/messages', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchUsers = async () => {
    if (!token) return;
    try {
      const response = await fetch('http://localhost:4000/myRecentContacts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAllUsers = async () => {
    if (!token) return;
    try {
      const response = await fetch('http://localhost:4000/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setAllUsers(data);
    } catch (error) {
      console.error('Error fetching all users:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!selectedUser || !newMessage.trim() || !token) return;

    try {
      const response = await fetch('http://localhost:4000/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId: selectedUser,
          content: newMessage.trim()
        })
      });

      if (!response.ok) throw new Error('Failed to send message');
      
      setNewMessage('');
      fetchMessages(); // Refresh messages after sending
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const filteredUsers = allUsers.filter(user => 
    (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())) &&
    user._id !== currentUserId
  );

  // Find the selected user's name from the most recent message
  const selectedUserName = messages
    .find(msg => 
      (msg.senderId === selectedUser && msg.receiverId === currentUserId) || 
      (msg.receiverId === selectedUser && msg.senderId === currentUserId)
    )?.senderId === selectedUser ? 
      messages.find(msg => msg.senderId === selectedUser)?.senderName :
      messages.find(msg => msg.receiverId === selectedUser)?.receiverName || '';

  if (!token) {
    return (
      <div className="messenger-container">
        <div className="no-chat-selected">
          <p>Please log in to use the messenger</p>
        </div>
      </div>
    );
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
            New Message
          </button>
        </div>
        
        <div className="users-list">
          {users.map(user => (
            <div
              key={user._id}
              className={`user-item ${selectedUser === user._id ? 'selected' : ''}`}
              onClick={() => setSelectedUser(user._id)}
            >
              <div className="user-item-name">{user.full_name || user.email}</div>
            </div>
          ))}
        </div>
      </div>
      
      {showNewMessagePanel && (
        <div className="new-message-panel">
          <div className="new-message-content">
            <div className="new-message-header">
              <h3>New Message</h3>
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
                    setSelectedUser(user._id);
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
      
      <div className="messenger-main">
        {selectedUser ? (
          <>
            <div className="messenger-header">
            </div>
            <div className="messages-container">
              {messages
                .filter(msg => 
                  (msg.senderId === selectedUser && msg.receiverId === currentUserId) || 
                  (msg.receiverId === selectedUser && msg.senderId === currentUserId)
                )
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                .map(message => (
                  <div
                    key={message._id}
                    className={`message ${message.senderId === selectedUser ? 'received' : 'sent'}`}
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
                disabled={!newMessage.trim()}
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
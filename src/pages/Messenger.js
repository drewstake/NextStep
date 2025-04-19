// used only for applicant to employer messaging
import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
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
  const [employers, setEmployers] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedContact, setSelectedContact] = useState('');
  const [showNewMessagePanel, setShowNewMessagePanel] = useState(false);
  const { token } = useContext(TokenContext);
  const decoded = token ? jwt_decode(token) : null;
  const currentUserId = decoded?.id;
  const isEmployer = decoded?.employerFlag || false;
  const messagesEndRef = useRef(null);

  // Redirect if user is an employer
  useEffect(() => {
    if (isEmployer) {
      navigate('/employer-dashboard');
    }
  }, [isEmployer, navigate]);

  const fetchMyExchanges = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axiosInstance.get('/messages');
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [token]);

  const refreshMessages = useCallback(async () => {
    fetchMyExchanges();
    if (selectedContact?._id) {
      const currentContact = contacts.find(c => c._id === selectedContact._id);
      if (currentContact?.countOfUnreadMessages > 0) {
        setTimeout(() => {
          markMessagesAsRead(selectedContact._id);
        }, 2000);
      }
    }
    scrollToBottom(); // Scroll to bottom only when there are unread messages

  }, [fetchMyExchanges, selectedContact, contacts]);

  const fetchEmployersFromApplications = async () => {
    try {
      const response = await axiosInstance.get('/employersFromApplications');
      setEmployers(response.data);
    } catch (error) {
      console.error('Error fetching employers from applications:', error);
    }
  };

  const fetchEmployerContacts = async () => {
    try {
      const response = await axiosInstance.get('/myRecentEmployerContacts');
      setContacts(response.data);
    } catch (error) {
      console.error('Error fetching employer contacts:', error);
    }
  };

  useEffect(() => {
    if (!token) return;

    fetchMyExchanges();
    fetchEmployerContacts();
    fetchEmployersFromApplications();

    const interval = setInterval(() => {
      fetchMyExchanges();
      fetchEmployerContacts();
    }, 2000);

    return () => clearInterval(interval);
  }, [token, fetchMyExchanges]);

  // Separate effect for handling unread messages
  useEffect(() => {
    if (selectedContact?._id) {
      const currentContact = contacts.find(c => c._id === selectedContact._id);
      if (currentContact?.countOfUnreadMessages > 0) {
        setTimeout(() => {
          markMessagesAsRead(selectedContact._id);
        }, 2000);
      }
    }
  }, [selectedContact, contacts]);

  const setSelectedContactForNewMessage = async (pickedEmployer) => {
    setNewContact(pickedEmployer);
    setSelectedContact(pickedEmployer);
    scrollToBottom(); // Scroll to bottom only when there are unread messages

  };

  const handleUserSelected = (user) => {
    setSelectedContact(user);
    // Mark messages as read if there are unread messages
    if (user.countOfUnreadMessages > 0) {
      markMessagesAsRead(user._id);
    }

    // Refresh contacts after selection
    fetchEmployerContacts();
    scrollToBottom(); // Scroll to bottom only when there are unread messages

  };

  const markMessagesAsRead = async (contactId) => {
    try {
      await axiosInstance.put(`/messages/read/company/${contactId}`);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!selectedContact?._id || !newMessage || !token) return;

    try {
      // Sending to a company
      await axiosInstance.post('/messages/company', {
        companyId: selectedContact._id,
        content: newMessage?.trim()
      });

      setNewMessage('');
      setNewContact('');
      refreshMessages(); // Refresh messages after sending
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Find the selected company's name from the most recent message
  let selectedCompanyName = messages.find(msg =>
    (msg.companyId === selectedContact._id && msg.senderId === currentUserId) ||
    (msg.companyId === selectedContact._id && msg.receiverId === currentUserId)
  )?.companyName || '';

  if (!selectedCompanyName && newContact) {
    selectedCompanyName = newContact.companyName || newContact.companyDetails?.name || '';
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (!token) {
    navigate('/login');
  }

  return (
    <div className="messenger-container">
      <div className="messenger-sidebar">
        <div className="sidebar-header">
          <h2>Employer Contacts</h2>
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
              key={contact._id}
              className={`user-item ${selectedContact?._id === contact._id ? 'selected' : ''}`}
              onClick={() => handleUserSelected(contact)}
            >
              <div className="user-item-name">
                <div className="contact-name">
                  {contact.companyName}
                  {contact.countOfUnreadMessages > 0 && (
                    <span className="unread-badge">{contact.countOfUnreadMessages}</span>
                  )}
                </div>
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
              <h3>Select a Company</h3>
              <button
                className="close-btn"
                onClick={() => setShowNewMessagePanel(false)}
              >
                ×
              </button>
            </div>
            <div className="all-users-list">
              {employers && employers.length > 0 ? (
                employers.map(employer => (
                  <div
                    key={employer._id}
                    className="user-item"
                    onClick={() => {
                      setSelectedContactForNewMessage(employer);
                      setShowNewMessagePanel(false);
                    }}
                  >
                    <div className="user-item-name">{employer.companyDetails.name}</div>
                  </div>
                ))
              ) : (
                <div className="no-results">No companies found</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages Panel */}
      <div className="messenger-main">
        {selectedContact?._id || newContact ? (
          <>
            <div className="messenger-header">
              <h3>{newContact ? newContact.companyName : selectedCompanyName}</h3>
            </div>
            <div className="messages-container">
              {messages
                .filter(msg =>
                  (msg.companyId === selectedContact._id && msg.senderId === currentUserId) ||
                  (msg.companyId === selectedContact._id && msg.receiverId === currentUserId)
                )
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                .map(message => (
                  <div
                    key={message._id}
                    className={`message ${message.senderId === currentUserId ? 'sent' : 'received'}`}
                  >
                    <div className="message-content">{message.content}</div>
                    <div className="message-time">
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              <div ref={messagesEndRef} />
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
            <p>Select a company to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messenger; 
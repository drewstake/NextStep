import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { TokenContext } from '../components/TokenContext';
import jwt_decode from 'jwt-decode';
import axiosInstance from '../utils/axiosConfig';
import { useNavigate } from 'react-router-dom';
import '../styles/Messenger.css';

const EmployerMessenger = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedContact, setSelectedContact] = useState('');
  const [showNewMessagePanel, setShowNewMessagePanel] = useState(false);
  const { token } = useContext(TokenContext);
  const decoded = token ? jwt_decode(token) : null;
  const currentUserId = decoded?.id;
  const isEmployer = decoded?.employerFlag || false;
  const messagesEndRef = useRef(null);
  const timedDelay = 5000;

  const scrollToBottom = () => {
//console.log('scrollToBottom');
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Redirect if user is not an employer
  useEffect(() => {
    if (!isEmployer) {
      navigate('/messenger');
    }
  }, [isEmployer, navigate]);

  const fetchEmployerMessages = useCallback(async () => {
//console.log('fetchEmployerMessages');
    if (!token) return;
    try {
      const response = await axiosInstance.get('/employer/messages');
//console.log('fetchEmployerMessages response', response.data.length);
      if (response.data.length > 0) {
        setMessages(response.data);
      }
      console.log('messages', response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [token]);

  const refreshMessages = useCallback(async () => {
//console.log('refreshMessages');
    await fetchEmployerMessages();
    if (selectedContact?._id) {
      const currentContact = contacts.find(c => c._id === selectedContact._id);
      if (currentContact?.countOfUnreadMessages > 0) {
        setTimeout(() => {
          markMessagesAsRead(selectedContact._id);
        }, timedDelay);
      }
    }
  }, [fetchEmployerMessages, selectedContact, contacts]);

  const fetchApplicantsFromJobs = async () => {
//console.log('fetchApplicantsFromJobs');
    try {
      const response = await axiosInstance.get('/employer/applicants');
      setApplicants(response.data);
    } catch (error) {
      console.error('Error fetching applicants:', error);
    }
  };

  const fetchApplicantContacts = async () => {
//console.log('fetchApplicantContacts');
    try {
      const response = await axiosInstance.get('/employer/recent-applicant-contacts');
//console.log('fetchApplicantContacts response', response.data.length);
      setContacts(response.data);
    } catch (error) {
      console.error('Error fetching applicant contacts:', error);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    fetchEmployerMessages();
    fetchApplicantContacts();
    fetchApplicantsFromJobs();

    const interval = setInterval(() => {
      fetchEmployerMessages();
      fetchApplicantContacts();
    }, timedDelay);

    return () => clearInterval(interval);
  }, [token, fetchEmployerMessages, navigate]);

  useEffect(() => {

    if (selectedContact?._id) {
      const currentContact = contacts.find(c => c._id === selectedContact._id);
      if (currentContact?.countOfUnreadMessages > 0) {
        setTimeout(() => {
          markMessagesAsRead(selectedContact._id);
        }, timedDelay);
      }
    }
  }, [selectedContact, contacts]);

  const handleUserSelected = (user) => {
//console.log('handleUserSelected');
    setSelectedContact(user);
    markMessagesAsRead(user._id);
  };

  const markMessagesAsRead = async (contactId) => {
//console.log('markMessagesAsRead');
    try {
      const response = await axiosInstance.put(`/employer/messages/read/${contactId}`);
      setMessages(response.data.messages);
//console.log('markMessagesAsRead response', response.data.messages.length);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async (e) => {
//console.log('sendMessage');
    e.preventDefault();
    if (!selectedContact?._id || !newMessage || !token) return;

    try {
      await axiosInstance.post('/employer/messages', {
        applicantId: selectedContact._id,
        content: newMessage?.trim()
      });

      setNewMessage('');
      //refreshMessages();
      markMessagesAsRead(selectedContact._id);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  let selectedApplicantName = messages.find(msg =>
    (msg.applicantId === selectedContact._id && msg.senderId === currentUserId) ||
    (msg.applicantId === selectedContact._id && msg.receiverId === currentUserId)
  )?.applicantName || '';

  //console.log("Recomputation triggered");

  return (
    <div className="messenger-container">
      <div className="messenger-sidebar">
        <div className="sidebar-header">
          <h2>Applicant Contacts</h2>
          <button
            className="new-message-btn"
            onClick={() => setShowNewMessagePanel(true)}
          >
            New
          </button>
        </div>

        <div className="users-list">
          {contacts.map(contact => (
            <div
              key={contact._id}
              className={`user-item ${selectedContact?._id === contact._id ? 'selected' : ''}`}
              onClick={() => handleUserSelected(contact)}
            >
              <div className="user-item-header">
                <div className="contact-name">
                  {contact.name}
                  {contact.countOfUnreadMessages > 0 && (
                    <span className="unread-badge">{contact.countOfUnreadMessages}</span>
                  )}
                </div>
                {contact.lastMessageTimestamp && (
                  <div className="contact-timestamp" style={{ fontSize: '0.8em', color: '#666' }}>
                    {new Date(contact.lastMessageTimestamp).toLocaleString('en-US', {
                      month: 'short',
                      day: '2-digit'
                    })}
                  </div>
                )}
              </div>
              <div className="contact-email">{contact.email}</div>
              <div className="contact-phone">{contact.phone}</div>
            </div>
          ))}
        </div>
      </div>

      {showNewMessagePanel && (
        <div className="new-message-panel">
          <div className="new-message-content">
            <div className="new-message-header">
              <h3>Select an Applicant</h3>
              <button
                className="close-btn"
                onClick={() => setShowNewMessagePanel(false)}
              >
                ×
              </button>
            </div>
            <div className="all-users-list">
              {applicants && applicants.length > 0 ? (
                applicants.map(applicant => (
                  <div
                    key={applicant._id}
                    className="user-item"
                    onClick={() => {
                      setSelectedContact(applicant);
                      setShowNewMessagePanel(false);
                    }}
                  >
                    <div className="user-item-name">{applicant.name}</div>
                  </div>
                ))
              ) : (
                <div className="no-results">No applicants found</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="messenger-main">
        {selectedContact?._id ? (
          <>
            <div className="messenger-header">
              <h3>{selectedApplicantName}</h3>
            </div>
            <div className="messages-container">
              {messages
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                .map(message => (
                  <div
                    key={message._id}
                    className={`message ${message.senderId === currentUserId ? 'sent' : 'received'}`}
                  >
                    <div className="message-content">{message.content}</div>
                    <div className="message-time">
                      {new Date(message.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
              <button type="submit" className="send-button">
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="no-conversation-selected">
            <p>Select a conversation or start a new one</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployerMessenger; 
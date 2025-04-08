// src/components/ChatWidget.js

import React, { useState, useEffect, useRef } from "react";
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from "react-markdown";
import "../styles/ChatWidget.css";

// Initialize the AI client with your API key.
// IMPORTANT: For production, secure your API key in environment variables.
const ai = new GoogleGenAI({ apiKey: "AIzaSyAVuQ5LDp8CFQ0gzHiWf7rjkrlHxsZQxvs" });

const ChatWidget = () => {
  // State for chat display and memory
  const [isMinimized, setIsMinimized] = useState(false); // Toggles chatbox display
  const [messages, setMessages] = useState([]);           // Chat history
  const [initialized, setInitialized] = useState(false);   // Flag to add welcome message only once
  const [input, setInput] = useState("");                  // User input text
  const [loading, setLoading] = useState(false);           // Loading state for AI response
  const [userName, setUserName] = useState("");            // Stores user's name if provided

  // Ref for auto-scrolling the messages view to the bottom when new messages are added.
  const messagesEndRef = useRef(null);

  // Auto-scroll when messages update.
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [messages]);

  // On initial open, display the welcome message (tagged so it can be filtered out from the context).
  useEffect(() => {
    if (!isMinimized && !initialized) {
      setMessages([
        {
          text:
            "Welcome to **NextStep Help Chat!**\n\nAsk me anything about NextStep.",
          sender: "bot",
          isWelcome: true,
        },
      ]);
      setInitialized(true);
    }
  }, [isMinimized, initialized]);

  // Toggle the minimized state when header is clicked.
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // Handle a message submission.
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userInput = input.trim();

    // Look for user-provided name (e.g., "my name is Andrew").
    const nameRegex = /my name is\s+([A-Za-z]+)/i;
    const nameMatch = userInput.match(nameRegex);
    if (nameMatch && nameMatch[1]) {
      setUserName(nameMatch[1]);
    }

    // Special case: When the user asks for their name, answer immediately.
    const askingNameRegex = /^(what's|what is)\s+my\s+name\??$/i;
    if (askingNameRegex.test(userInput)) {
      let replyText = "";
      if (userName) {
        replyText = `Your name is ${userName}.`;
      } else {
        replyText = "I don't have any record of your name. Please tell me your name.";
      }
      // Append both the user query and the immediate response.
      setMessages((prev) => [
        ...prev,
        { text: userInput, sender: "user" },
        { text: replyText, sender: "bot" },
      ]);
      setInput("");
      return;
    }

    // Append the user's message to the conversation.
    const userMessage = { text: userInput, sender: "user" };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    // Build conversation history (memory) for the prompt.
    // The welcome message is filtered out so it is not re-sent repeatedly.
    const conversationHistory = updatedMessages
      .filter((msg) => !msg.isWelcome)
      .map((msg) =>
        msg.sender === "user" ? `User: ${msg.text}` : `Bot: ${msg.text}`
      )
      .join("\n");

    // Context instructions restrict answers only to NextStep topics.
    const context =
      "You are an AI assistant for NextStep Help Chat, a job matching platform. Only answer questions about NextStep (job matching, swipe-based job discovery, application tracking, employer dashboard, etc.). Do not answer questions about coding, recipes, or other unrelated topics.";
    const fullPrompt = `${context}\n\n${conversationHistory}\nBot: `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: fullPrompt,
      });
      console.log("AI response:", response);

      // Extract the text from the AI candidate response.
      const candidate = response.candidates && response.candidates[0];
      let botText = "No response";
      if (candidate && candidate.content) {
        if (Array.isArray(candidate.content.parts)) {
          botText = candidate.content.parts.map((part) => part.text).join(" ");
        } else if (typeof candidate.content === "string") {
          botText = candidate.content;
        } else if (candidate.content.text) {
          botText = candidate.content.text;
        }
      } else if (response.text) {
        botText = response.text;
      }
      
      // Append the AI's reply to the messages.
      const botMessage = { text: botText, sender: "bot" };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error fetching AI response", error);
      const errorMessage = { text: "Error: Unable to fetch response", sender: "bot" };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${isMinimized ? "chat-widget-hide" : "chat-widget"}`}>
      <div className="chat-widget-header" onClick={toggleMinimize}>
        <span className="chat-title">Chat</span>
      </div>
      {!isMinimized && (
        <div className="chat-widget-body">
          <div className="chat-widget-messages" ref={messagesEndRef}>
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                {msg.sender === "bot" ? (
                  <div className="bot-message">
                    <img
                      src="https://i.pravatar.cc/40?img=3"
                      alt="NextStep Bot"
                      className="bot-avatar"
                    />
                    <div className="bot-content">
                      <div className="bot-name">NextStep Bot</div>
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                )}
              </div>
            ))}
            {loading && (
              <div className="message bot">
                <div className="bot-message">
                  <img
                    src="https://i.pravatar.cc/40?img=3"
                    alt="NextStep Bot"
                    className="bot-avatar"
                  />
                  <div className="bot-content">
                    <div className="bot-name">NextStep Bot</div>
                    Typing...
                  </div>
                </div>
              </div>
            )}
          </div>
          <form onSubmit={handleSubmit} className="chat-widget-form">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
            />
            <button type="submit">Send</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;

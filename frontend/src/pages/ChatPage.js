import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';
import io from 'socket.io-client';

const ChatPage = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socket, setSocket] = useState(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [searchUsers, setSearchUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    setSocket(newSocket);

    // Socket event listeners
    newSocket.on('connect', () => {
      console.log('Connected to chat server');
    });

    newSocket.on('receiveMessage', (message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('onlineUsers', (users) => {
      setOnlineUsers(users);
    });

    newSocket.on('conversationUpdate', (conversation) => {
      setConversations(prev => {
        const index = prev.findIndex(c => c._id === conversation._id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = conversation;
          return updated;
        }
        return [conversation, ...prev];
      });
    });

    loadConversations();

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const loadConversations = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/chat/conversations`);
      setConversations(response.data.data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/chat/conversations/${conversationId}/messages`);
      setMessages(response.data.data || []);
      
      // Join the conversation room
      if (socket) {
        socket.emit('joinConversation', conversationId);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const handleSelectChat = (conversation) => {
    setActiveChat(conversation);
    loadMessages(conversation._id);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !activeChat) return;

    const messageData = {
      conversationId: activeChat._id,
      content: newMessage.trim(),
      type: 'text'
    };

    try {
      // Send via socket for real-time delivery
      socket.emit('sendMessage', messageData);
      
      // Also send to API for persistence
      await axios.post(`${process.env.REACT_APP_API_URL}/chat/messages`, messageData);
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const searchForUsers = async (query) => {
    if (!query.trim()) {
      setSearchUsers([]);
      return;
    }

    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/users/search?query=${query}&role=${getRoleFilter()}`);
      setSearchUsers(response.data.data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const getRoleFilter = () => {
    // Define who can chat with whom based on role
    switch (user?.role) {
      case 'student':
        return 'faculty,ta'; // Students can chat with faculty and TAs
      case 'faculty':
        return 'student,ta'; // Faculty can chat with students and TAs
      case 'ta':
        return 'student,faculty'; // TAs can chat with students and faculty
      case 'admin':
        return 'all'; // Admin can chat with everyone
      default:
        return 'all';
    }
  };

  const startNewConversation = async (selectedUser) => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/chat/conversations`, {
        participantId: selectedUser._id
      });
      
      const newConversation = response.data.data;
      setConversations(prev => [newConversation, ...prev]);
      setActiveChat(newConversation);
      setShowNewChatModal(false);
      setSearchQuery('');
      setSearchUsers([]);
      
      toast.success('New conversation started!');
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  const isUserOnline = (userId) => {
    return onlineUsers.some(u => u.userId === userId);
  };

  const getOtherParticipant = (conversation) => {
    return conversation.participants.find(p => p._id !== user._id);
  };

  if (loading) {
    return <div className="loading">Loading chat...</div>;
  }

  return (
    <div className="chat-page">
      <div className="chat-container">
        {/* Conversations Sidebar */}
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">
            <h2>
              <i className="fas fa-comments"></i>
              Messages
            </h2>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => setShowNewChatModal(true)}
              title="Start new conversation"
            >
              <i className="fas fa-plus"></i>
            </button>
          </div>

          <div className="conversations-list">
            {conversations.length > 0 ? (
              conversations.map(conversation => {
                const otherUser = getOtherParticipant(conversation);
                const lastMessage = conversation.lastMessage;
                
                return (
                  <div 
                    key={conversation._id}
                    className={`conversation-item ${activeChat?._id === conversation._id ? 'active' : ''}`}
                    onClick={() => handleSelectChat(conversation)}
                  >
                    <div className="conversation-avatar">
                      {otherUser?.avatar ? (
                        <img src={otherUser.avatar} alt={otherUser.name} />
                      ) : (
                        <div className="avatar-placeholder">
                          {otherUser?.name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      {isUserOnline(otherUser?._id) && (
                        <div className="online-indicator"></div>
                      )}
                    </div>
                    
                    <div className="conversation-content">
                      <div className="conversation-header">
                        <span className="participant-name">{otherUser?.name}</span>
                        <span className={`role-badge ${otherUser?.role}`}>
                          {otherUser?.role}
                        </span>
                        {lastMessage && (
                          <span className="message-time">
                            {formatTime(lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      
                      {lastMessage && (
                        <div className="last-message">
                          <span className="message-preview">
                            {lastMessage.content.length > 50 
                              ? lastMessage.content.substring(0, 50) + '...'
                              : lastMessage.content}
                          </span>
                        </div>
                      )}
                      
                      {conversation.unreadCount > 0 && (
                        <div className="unread-badge">
                          {conversation.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="no-conversations">
                <i className="fas fa-comment-slash"></i>
                <p>No conversations yet</p>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowNewChatModal(true)}
                >
                  Start a conversation
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="chat-main">
          {activeChat ? (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <div className="chat-participant">
                  <div className="participant-avatar">
                    {getOtherParticipant(activeChat)?.avatar ? (
                      <img 
                        src={getOtherParticipant(activeChat).avatar} 
                        alt={getOtherParticipant(activeChat).name} 
                      />
                    ) : (
                      <div className="avatar-placeholder">
                        {getOtherParticipant(activeChat)?.name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                    {isUserOnline(getOtherParticipant(activeChat)?._id) && (
                      <div className="online-indicator"></div>
                    )}
                  </div>
                  <div className="participant-info">
                    <h3>{getOtherParticipant(activeChat)?.name}</h3>
                    <span className={`role-badge ${getOtherParticipant(activeChat)?.role}`}>
                      {getOtherParticipant(activeChat)?.role}
                    </span>
                    <span className="online-status">
                      {isUserOnline(getOtherParticipant(activeChat)?._id) ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
                
                <div className="chat-actions">
                  <button className="btn-icon" title="Video call">
                    <i className="fas fa-video"></i>
                  </button>
                  <button className="btn-icon" title="Voice call">
                    <i className="fas fa-phone"></i>
                  </button>
                  <button className="btn-icon" title="More options">
                    <i className="fas fa-ellipsis-v"></i>
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="chat-messages">
                {messages.map((message, index) => {
                  const isOwnMessage = message.sender._id === user._id;
                  const showDate = index === 0 || 
                    formatDate(message.createdAt) !== formatDate(messages[index - 1].createdAt);
                  
                  return (
                    <div key={message._id}>
                      {showDate && (
                        <div className="message-date">
                          {formatDate(message.createdAt)}
                        </div>
                      )}
                      
                      <div className={`message ${isOwnMessage ? 'own-message' : 'other-message'}`}>
                        {!isOwnMessage && (
                          <div className="message-avatar">
                            {message.sender.avatar ? (
                              <img src={message.sender.avatar} alt={message.sender.name} />
                            ) : (
                              <div className="avatar-placeholder small">
                                {message.sender.name?.charAt(0)?.toUpperCase()}
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="message-content">
                          <div className="message-bubble">
                            <p>{message.content}</p>
                          </div>
                          <div className="message-meta">
                            <span className="message-time">
                              {formatTime(message.createdAt)}
                            </span>
                            {isOwnMessage && message.isRead && (
                              <i className="fas fa-check-double read-indicator"></i>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Message Input */}
              <div className="chat-input">
                <form onSubmit={handleSendMessage} className="message-form">
                  <div className="input-group">
                    <button type="button" className="attachment-btn" title="Attach file">
                      <i className="fas fa-paperclip"></i>
                    </button>
                    
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="message-input"
                    />
                    
                    <button type="button" className="emoji-btn" title="Add emoji">
                      <i className="fas fa-smile"></i>
                    </button>
                    
                    <button 
                      type="submit" 
                      className="send-btn"
                      disabled={!newMessage.trim()}
                    >
                      <i className="fas fa-paper-plane"></i>
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="no-chat-selected">
              <i className="fas fa-comments"></i>
              <h3>Select a conversation</h3>
              <p>Choose a conversation from the sidebar to start chatting</p>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="modal-overlay" onClick={() => setShowNewChatModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Start New Conversation</h3>
              <button 
                className="modal-close"
                onClick={() => setShowNewChatModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="search-users">
                <input
                  type="text"
                  placeholder="Search for users..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchForUsers(e.target.value);
                  }}
                  className="search-input"
                />
              </div>

              <div className="users-list">
                {searchUsers.map(searchUser => (
                  <div 
                    key={searchUser._id}
                    className="user-item"
                    onClick={() => startNewConversation(searchUser)}
                  >
                    <div className="user-avatar">
                      {searchUser.avatar ? (
                        <img src={searchUser.avatar} alt={searchUser.name} />
                      ) : (
                        <div className="avatar-placeholder">
                          {searchUser.name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="user-info">
                      <span className="user-name">{searchUser.name}</span>
                      <span className={`role-badge ${searchUser.role}`}>
                        {searchUser.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
import React, { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';

const VideoPlayer = ({ video, onClose }) => {
  const { user } = useAuth();
  const playerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [selectedSubtitle, setSelectedSubtitle] = useState(null);
  const [comments, setComments] = useState(video?.comments || []);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(video?.likes?.length || 0);
  const [showAIChatModal, setShowAIChatModal] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState([]);
  const [aiChatInput, setAiChatInput] = useState('');

  useEffect(() => {
    // Check if user has already liked the video
    if (video?.likes) {
      setIsLiked(video.likes.some(like => like.user === user._id));
    }
    
    // Set default subtitle if available
    if (video?.subtitles && video.subtitles.length > 0) {
      setSelectedSubtitle(video.subtitles[0]);
    }
  }, [video, user]);

  const handleProgress = (state) => {
    setCurrentTime(state.playedSeconds);
  };

  const handleDuration = (duration) => {
    setDuration(duration);
  };

  const handleSeek = (seconds) => {
    playerRef.current?.seekTo(seconds);
    setCurrentTime(seconds);
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/videos/${video._id}/comments`, {
        comment: newComment,
        timestamp: currentTime
      });

      setComments(prev => [...prev, response.data.data]);
      setNewComment('');
      toast.success('Comment added!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const handleToggleLike = async () => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/videos/${video._id}/like`);
      setIsLiked(response.data.data.isLiked);
      setLikeCount(response.data.data.likes);
      toast.success(response.data.message);
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like status');
    }
  };

  const handleAskAI = async () => {
    if (!aiChatInput.trim()) return;

    const userMessage = {
      type: 'user',
      message: aiChatInput,
      timestamp: new Date()
    };

    setAiChatMessages(prev => [...prev, userMessage]);
    setAiChatInput('');

    try {
      // Simulate AI response - in production, integrate with actual AI service
      const aiResponse = {
        type: 'ai',
        message: `Based on the lecture "${video.title}", here's what I can help you with regarding: "${userMessage.message}". This is a simulated AI response. In production, this would connect to an AI service like OpenAI GPT or Google's Gemini API to provide contextual answers about the video content.`,
        timestamp: new Date()
      };

      setTimeout(() => {
        setAiChatMessages(prev => [...prev, aiResponse]);
      }, 1000);

    } catch (error) {
      console.error('Error getting AI response:', error);
      toast.error('Failed to get AI response');
    }
  };

  const jumpToCommentTime = (timestamp) => {
    handleSeek(timestamp);
    setPlaying(true);
  };

  return (
    <div className="video-player-container">
      <div className="video-player-header">
        <div className="video-info">
          <h2>{video.title}</h2>
          <div className="video-meta">
            <span className="course-name">{video.course?.name}</span>
            <span className="upload-date">
              {new Date(video.createdAt).toLocaleDateString()}
            </span>
            <span className="instructor">
              by {video.uploadedBy?.name}
            </span>
          </div>
        </div>
        
        <div className="video-actions">
          <button 
            className={`action-btn ${isLiked ? 'liked' : ''}`}
            onClick={handleToggleLike}
          >
            <i className={`fas fa-heart ${isLiked ? 'liked' : ''}`}></i>
            {likeCount}
          </button>
          
          <button 
            className="action-btn"
            onClick={() => setShowAIChatModal(true)}
          >
            <i className="fas fa-robot"></i>
            Ask AI
          </button>
          
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>

      <div className="video-player-content">
        <div className="video-main">
          <div className="video-wrapper">
            <ReactPlayer
              ref={playerRef}
              url={`${process.env.REACT_APP_API_URL}${video.videoUrl}`}
              width="100%"
              height="100%"
              playing={playing}
              volume={volume}
              playbackRate={playbackRate}
              onProgress={handleProgress}
              onDuration={handleDuration}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              controls={false}
            />
            
            {/* Custom Controls */}
            <div className="video-controls">
              <div className="progress-bar">
                <input
                  type="range"
                  min="0"
                  max={duration}
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="progress-slider"
                />
                <div className="time-display">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>
              
              <div className="control-buttons">
                <button 
                  className="control-btn"
                  onClick={() => setPlaying(!playing)}
                >
                  <i className={`fas ${playing ? 'fa-pause' : 'fa-play'}`}></i>
                </button>
                
                <div className="volume-control">
                  <button className="control-btn">
                    <i className="fas fa-volume-up"></i>
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="volume-slider"
                  />
                </div>
                
                <select 
                  value={playbackRate}
                  onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                  className="playback-rate-select"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>
                
                {video.subtitles && video.subtitles.length > 0 && (
                  <div className="subtitle-controls">
                    <button 
                      className={`control-btn ${showSubtitles ? 'active' : ''}`}
                      onClick={() => setShowSubtitles(!showSubtitles)}
                    >
                      <i className="fas fa-closed-captioning"></i>
                    </button>
                    <select
                      value={selectedSubtitle?.language || ''}
                      onChange={(e) => {
                        const subtitle = video.subtitles.find(s => s.language === e.target.value);
                        setSelectedSubtitle(subtitle);
                      }}
                      className="subtitle-select"
                    >
                      <option value="">No subtitles</option>
                      {video.subtitles.map((subtitle, index) => (
                        <option key={index} value={subtitle.language}>
                          {subtitle.language} {subtitle.isAuto && '(Auto)'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Video Description */}
          <div className="video-description">
            <h3>About this lecture</h3>
            <p>{video.description}</p>
          </div>

          {/* Attachments */}
          {video.attachments && video.attachments.length > 0 && (
            <div className="video-attachments">
              <h3>Course Materials</h3>
              <div className="attachments-list">
                {video.attachments.map((attachment, index) => (
                  <div key={index} className="attachment-item">
                    <div className="attachment-info">
                      <i className={`fas ${getAttachmentIcon(attachment.type)}`}></i>
                      <span className="attachment-name">{attachment.name}</span>
                      <span className="attachment-type">{attachment.type}</span>
                    </div>
                    <a 
                      href={`${process.env.REACT_APP_API_URL}${attachment.url}`}
                      download
                      className="download-btn"
                    >
                      <i className="fas fa-download"></i>
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Comments Sidebar */}
        <div className={`comments-sidebar ${showComments ? 'open' : ''}`}>
          <div className="comments-header">
            <h3>Comments ({comments.length})</h3>
            <button 
              className="toggle-comments-btn"
              onClick={() => setShowComments(!showComments)}
            >
              <i className={`fas ${showComments ? 'fa-times' : 'fa-comments'}`}></i>
            </button>
          </div>

          {showComments && (
            <>
              <div className="add-comment-form">
                <form onSubmit={handleAddComment}>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment about this lecture..."
                    rows="3"
                  />
                  <div className="comment-form-actions">
                    <span className="timestamp-info">
                      At {formatTime(currentTime)}
                    </span>
                    <button type="submit" className="btn btn-primary btn-sm">
                      Post Comment
                    </button>
                  </div>
                </form>
              </div>

              <div className="comments-list">
                {comments.map((comment, index) => (
                  <div key={index} className="comment-item">
                    <div className="comment-header">
                      <div className="comment-author">
                        <div className="author-avatar">
                          {comment.user?.avatar ? (
                            <img src={comment.user.avatar} alt={comment.user.name} />
                          ) : (
                            <div className="avatar-placeholder">
                              {comment.user?.name?.charAt(0)?.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="author-info">
                          <span className="author-name">{comment.user?.name}</span>
                          <span className={`role-badge ${comment.user?.role}`}>
                            {comment.user?.role}
                          </span>
                        </div>
                      </div>
                      <button 
                        className="timestamp-btn"
                        onClick={() => jumpToCommentTime(comment.timestamp || 0)}
                        title="Jump to this time"
                      >
                        {formatTime(comment.timestamp || 0)}
                      </button>
                    </div>
                    <div className="comment-content">
                      <p>{comment.comment}</p>
                    </div>
                    <div className="comment-date">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* AI Chat Modal */}
      {showAIChatModal && (
        <div className="modal-overlay" onClick={() => setShowAIChatModal(false)}>
          <div className="modal-content ai-chat-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-robot"></i>
                Ask AI about this lecture
              </h3>
              <button 
                className="modal-close"
                onClick={() => setShowAIChatModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="ai-chat-messages">
                {aiChatMessages.length === 0 ? (
                  <div className="ai-welcome">
                    <i className="fas fa-robot"></i>
                    <p>Hi! I'm your AI assistant. Ask me anything about this lecture!</p>
                    <div className="suggested-questions">
                      <button onClick={() => setAiChatInput('Can you summarize the main points of this lecture?')}>
                        Summarize main points
                      </button>
                      <button onClick={() => setAiChatInput('What are the key concepts discussed?')}>
                        Key concepts
                      </button>
                      <button onClick={() => setAiChatInput('Can you explain this topic in simpler terms?')}>
                        Explain simply
                      </button>
                    </div>
                  </div>
                ) : (
                  aiChatMessages.map((message, index) => (
                    <div key={index} className={`ai-message ${message.type}`}>
                      <div className="message-avatar">
                        {message.type === 'user' ? (
                          <div className="user-avatar">
                            {user.name?.charAt(0)?.toUpperCase()}
                          </div>
                        ) : (
                          <div className="ai-avatar">
                            <i className="fas fa-robot"></i>
                          </div>
                        )}
                      </div>
                      <div className="message-content">
                        <p>{message.message}</p>
                        <span className="message-time">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="ai-chat-input">
                <form onSubmit={(e) => { e.preventDefault(); handleAskAI(); }}>
                  <input
                    type="text"
                    value={aiChatInput}
                    onChange={(e) => setAiChatInput(e.target.value)}
                    placeholder="Ask a question about this lecture..."
                  />
                  <button type="submit" disabled={!aiChatInput.trim()}>
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to get attachment icon
const getAttachmentIcon = (type) => {
  switch (type) {
    case 'document': return 'fa-file-alt';
    case 'presentation': return 'fa-file-powerpoint';
    case 'notes': return 'fa-sticky-note';
    default: return 'fa-file';
  }
};

export default VideoPlayer;
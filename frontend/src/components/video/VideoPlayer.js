import React, { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';

const VideoPlayer = ({ video, onClose }) => {
  const { user } = useAuth();
  const playerRef = useRef(null);
  const fallbackVideoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [comments, setComments] = useState(video?.comments || []);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(video?.likes?.length || 0);
  const [showAIChatModal, setShowAIChatModal] = useState(false);
  const [useReactPlayer, setUseReactPlayer] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState([]);
  const [aiChatInput, setAiChatInput] = useState('');
  const [watchTime, setWatchTime] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');

  useEffect(() => {
    // Check if user has already liked the video
    if (video?.likes) {
      setIsLiked(video.likes.some(like => like.user === user._id));
    }

    // Check if student has completed this video
    if (user?.role === 'student' && video?.completions) {
      const completion = video.completions.find(c => c.student === user._id);
      setIsCompleted(completion?.isCompleted || false);
      setWatchTime(completion?.watchTime || 0);
    }

    // Set video and thumbnail URLs
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    setVideoUrl(`${baseUrl}${video.videoUrl}`);
    setThumbnailUrl(video.thumbnailUrl ? `${baseUrl}${video.thumbnailUrl}` : '/default-thumbnail.jpg');
  }, [video, user]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Cleanup when component unmounts
      if (playerRef.current) {
        try {
          playerRef.current = null;
        } catch (error) {
          console.warn('Error cleaning up player ref:', error);
        }
      }
      if (fallbackVideoRef.current) {
        try {
          fallbackVideoRef.current.pause();
          fallbackVideoRef.current = null;
        } catch (error) {
          console.warn('Error cleaning up video ref:', error);
        }
      }
      setPlaying(false);
    };
  }, []);

  // Handle close button click
  const handleClose = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Stop video before closing
    setPlaying(false);

    // Call the onClose prop
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
  };

  const handleProgress = (state) => {
    
    // Update watch time for students
    if (user?.role === 'student') {
      setWatchTime(Math.max(watchTime, state.playedSeconds));
      
      // Auto-mark as completed if watched 90% of the video
      if (duration > 0 && state.playedSeconds / duration >= 0.9 && !isCompleted) {
        handleMarkComplete();
      }
    }
  };

  const handleSeek = (time) => {
    if (playerRef.current) {
      playerRef.current.seekTo(time);
      setCurrentTime(time);
    }
  };

  const handleMarkComplete = async () => {
    if (user?.role !== 'student') return;

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/videos/${video._id}/complete`, {
        watchTime: Math.max(watchTime, currentTime)
      });
      
      setIsCompleted(true);
      toast.success('Video marked as completed!');
    } catch (error) {
      console.error('Error marking video complete:', error);
      toast.error('Failed to mark video as complete');
    }
  };

  const handleLike = async () => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/videos/${video._id}/like`);
      setIsLiked(!isLiked);
      setLikeCount(response.data.data.likes.length);
      toast.success(isLiked ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      console.error('Error liking video:', error);
      toast.error('Failed to update like status');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/videos/${video._id}/comment`, {
        content: newComment,
        timestamp: currentTime
      });
      
      setComments([...comments, response.data.data]);
      setNewComment('');
      toast.success('Comment added successfully');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const handleViewAttachment = (attachment) => {
    setSelectedAttachment(attachment);
    setShowAttachmentModal(true);
  };

  const handleDownloadAttachment = (attachment) => {
    const link = document.createElement('a');
    link.href = `${process.env.REACT_APP_API_URL}${attachment.url}`;
    link.download = attachment.name;
    link.click();
  };

  const handleAskAI = async () => {
    if (!aiChatInput.trim()) return;

    try {
      // Add user message to chat
      const userMessage = { role: 'user', content: aiChatInput };
      setAiChatMessages(prev => [...prev, userMessage]);
      
      // Simulate AI response (you can integrate with actual AI service)
      const aiResponse = {
        role: 'assistant',
        content: `I understand you're asking about "${aiChatInput}". This is a simulated AI response. You can integrate with actual AI services like OpenAI, Google AI, etc.`
      };
      
      setTimeout(() => {
        setAiChatMessages(prev => [...prev, aiResponse]);
      }, 1000);
      
      setAiChatInput('');
    } catch (error) {
      console.error('Error with AI chat:', error);
      toast.error('Failed to get AI response');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAttachmentIcon = (type) => {
    switch (type) {
      case 'document': return 'fa-file-alt';
      case 'presentation': return 'fa-file-powerpoint';
      case 'notes': return 'fa-sticky-note';
      default: return 'fa-file';
    }
  };

  if (!video) {
    return (
      <div className="video-player-modal">
        <div className="video-player-content">
          <div className="error-message">
            <i className="fas fa-exclamation-triangle"></i>
            <p>Video not found or failed to load</p>
            <button onClick={onClose} className="btn btn-primary">Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="video-player-modal" onClick={(e) => {
      // Prevent modal from closing when clicking on video area
      if (e.target === e.currentTarget) {
        handleClose(e);
      }
    }}>
      <div className="video-player-content">
        <div className="video-header">
          <h2>{video.title}</h2>
          <button className="close-btn" onClick={handleClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="video-main">
          <div className="video-wrapper">
            {useReactPlayer && !videoError ? (
              <ReactPlayer
                ref={playerRef}
                url={videoUrl}
                width="100%"
                height="500px"
                playing={playing}
                volume={volume}
                playbackRate={playbackRate}
                onProgress={handleProgress}
                onDuration={setDuration}
                onPlay={() => {
                  console.log('▶️ Video playing');
                  setPlaying(true);
                }}
                onPause={() => {
                  console.log('⏸️ Video paused');
                  setPlaying(false);
                }}
                onReady={() => {
                  console.log('✅ Video ready to play');
                  console.log('🎥 Video URL:', videoUrl);
                }}
                onError={(error) => {
                  console.error('❌ ReactPlayer failed:', error);
                  console.log('🔄 Switching to HTML5 video player...');
                  setVideoError(true);
                  setUseReactPlayer(false);
                  toast.info('Switching to alternative video player...');
                }}
                controls={true}
                light={false}
                pip={true}
                stopOnUnmount={true}
                config={{
                  file: {
                    attributes: {
                      crossOrigin: 'anonymous',
                      controlsList: 'nodownload',
                      preload: 'metadata'
                    },
                    forceVideo: true,
                    hlsOptions: {
                      enableWorker: false,
                    },
                    dashOptions: {
                      enableWorker: false,
                    }
                  }
                }}
              />
            ) : (
              <video
                ref={fallbackVideoRef}
                width="100%"
                height="500px"
                controls
                preload="metadata"
                onLoadedMetadata={(e) => {
                  console.log('✅ HTML5 video loaded');
                  if (fallbackVideoRef.current && fallbackVideoRef.current.duration) {
                    setDuration(fallbackVideoRef.current.duration);
                  }
                }}
                onTimeUpdate={(e) => {
                  if (fallbackVideoRef.current && !isNaN(fallbackVideoRef.current.currentTime)) {
                    const currentTime = fallbackVideoRef.current.currentTime;
                    setCurrentTime(currentTime);
                    handleProgress({
                      playedSeconds: currentTime,
                      played: currentTime / (fallbackVideoRef.current.duration || 1)
                    });
                  }
                }}
                onPlay={() => {
                  console.log('▶️ HTML5 video playing');
                  setPlaying(true);
                }}
                onPause={() => {
                  console.log('⏸️ HTML5 video paused');
                  setPlaying(false);
                }}
                onError={(error) => {
                  console.error('❌ HTML5 video error:', error);
                  toast.error('Video file cannot be played. Please check the file format.');
                }}
                style={{
                  borderRadius: '8px',
                  backgroundColor: '#000'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <source 
                  src={videoUrl} 
                  type="video/mp4" 
                />
                <source 
                  src={videoUrl} 
                  type="video/webm" 
                />
                <source 
                  src={videoUrl} 
                  type="video/ogg" 
                />
                Your browser does not support the video tag.
              </video>
            )}
          </div>

          {/* Custom Video Controls */}
          <div className="custom-video-controls">
            <div className="playback-controls">
              <button 
                className="control-btn play-pause"
                onClick={() => setPlaying(!playing)}
              >
                <i className={`fas ${playing ? 'fa-pause' : 'fa-play'}`}></i>
              </button>
              
              <div className="volume-control">
                <i className="fas fa-volume-up"></i>
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
              
              <div className="playback-rate">
                <select 
                  value={playbackRate} 
                  onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                  className="speed-select"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>
              </div>
              
              <div className="progress-control">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="progress-slider"
                />
                <div className="time-display">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>
            </div>
          </div>

          {/* Video Info */}
          <div className="video-info">
            <div className="video-actions">
              <button 
                className={`action-btn ${isLiked ? 'liked' : ''}`}
                onClick={handleLike}
              >
                <i className={`fas fa-heart`}></i>
                {likeCount}
              </button>
              
              {user?.role === 'student' && (
                <button 
                  className={`action-btn ${isCompleted ? 'completed' : ''}`}
                  onClick={handleMarkComplete}
                  disabled={isCompleted}
                >
                  <i className={`fas ${isCompleted ? 'fa-check-circle' : 'fa-circle'}`}></i>
                  {isCompleted ? 'Completed' : 'Mark Complete'}
                </button>
              )}
              
              <button 
                className="action-btn"
                onClick={() => setShowComments(!showComments)}
              >
                <i className="fas fa-comments"></i>
                Comments ({comments.length})
              </button>
              
              <button 
                className="action-btn"
                onClick={() => setShowAIChatModal(true)}
              >
                <i className="fas fa-robot"></i>
                Ask AI
              </button>
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
                        <span className="attachment-size">({(attachment.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                      <div className="attachment-actions">
                        <button 
                          className="view-btn"
                          onClick={() => handleViewAttachment(attachment)}
                          title="View attachment"
                        >
                          <i className="fas fa-eye"></i>
                          View
                        </button>
                        <button 
                          className="download-btn"
                          onClick={() => handleDownloadAttachment(attachment)}
                          title="Download attachment"
                        >
                          <i className="fas fa-download"></i>
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
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
                      <i className="fas fa-paper-plane"></i>
                      Comment
                    </button>
                  </div>
                </form>
              </div>

              <div className="comments-list">
                {comments.map((comment, index) => (
                  <div key={index} className="comment-item">
                    <div className="comment-header">
                      <span className="comment-author">{comment.author?.name}</span>
                      <span className="comment-time">
                        {comment.timestamp && formatTime(comment.timestamp)}
                      </span>
                    </div>
                    <div className="comment-content">
                      {comment.content}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
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

              <div className="ai-chat-messages">
                {aiChatMessages.map((message, index) => (
                  <div key={index} className={`ai-message ${message.role}`}>
                    <div className="message-content">
                      {message.content}
                    </div>
                  </div>
                ))}
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
        )}

        {/* Attachment Viewer Modal */}
        {showAttachmentModal && selectedAttachment && (
          <div className="modal-overlay" onClick={() => setShowAttachmentModal(false)}>
            <div className="modal-content attachment-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>
                  <i className={`fas ${getAttachmentIcon(selectedAttachment.type)}`}></i>
                  {selectedAttachment.name}
                </h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowAttachmentModal(false)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="modal-body">
                <div className="attachment-viewer">
                  {selectedAttachment.type === 'document' && selectedAttachment.name.toLowerCase().endsWith('.pdf') ? (
                    <iframe
                      src={`${process.env.REACT_APP_API_URL}${selectedAttachment.url}`}
                      width="100%"
                      height="600px"
                      title={selectedAttachment.name}
                    />
                  ) : selectedAttachment.type === 'presentation' ? (
                    <div className="presentation-viewer">
                      <iframe
                        src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(window.location.origin + process.env.REACT_APP_API_URL + selectedAttachment.url)}`}
                        width="100%"
                        height="600px"
                        title={selectedAttachment.name}
                      />
                    </div>
                  ) : (
                    <div className="text-viewer">
                      <p>This file type cannot be previewed. Please download to view.</p>
                      <button 
                        className="btn btn-primary"
                        onClick={() => handleDownloadAttachment(selectedAttachment)}
                      >
                        <i className="fas fa-download"></i>
                        Download {selectedAttachment.name}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowAttachmentModal(false)}
                >
                  Close
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => handleDownloadAttachment(selectedAttachment)}
                >
                  <i className="fas fa-download"></i>
                  Download
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';

const ForumDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [forum, setForum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);

  useEffect(() => {
    loadForum();
  }, [id]);

  const loadForum = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/forums/${id}`);
      setForum(response.data.data);
    } catch (error) {
      console.error('Error loading forum:', error);
      if (error.response?.status === 404) {
        toast.error('Forum not found');
        navigate('/forums');
      } else {
        toast.error('Failed to load forum');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    
    if (!replyText.trim()) {
      toast.error('Please enter your reply');
      return;
    }

    setSubmitting(true);

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/forums/${id}/posts`, {
        content: replyText
      });

      toast.success('Reply posted successfully!');
      setReplyText('');
      setShowReplyForm(false);
      loadForum(); // Reload to show new reply

    } catch (error) {
      console.error('Error posting reply:', error);
      toast.error('Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePinForum = async () => {
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/forums/${id}/pin`);
      setForum(prev => ({ ...prev, isPinned: !prev.isPinned }));
      toast.success(forum.isPinned ? 'Forum unpinned' : 'Forum pinned');
    } catch (error) {
      console.error('Error pinning forum:', error);
      toast.error('Failed to update forum');
    }
  };

  const handleLockForum = async () => {
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/forums/${id}/lock`);
      setForum(prev => ({ ...prev, isLocked: !prev.isLocked }));
      toast.success(forum.isLocked ? 'Forum unlocked' : 'Forum locked');
    } catch (error) {
      console.error('Error locking forum:', error);
      toast.error('Failed to update forum');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  const canModerate = ['faculty', 'admin', 'ta'].includes(user?.role);
  const canReply = ['faculty', 'ta', 'admin'].includes(user?.role) && !forum?.isLocked;

  if (loading) {
    return <div className="loading">Loading forum...</div>;
  }

  if (!forum) {
    return (
      <div className="error-state">
        <h2>Forum not found</h2>
        <button onClick={() => navigate('/forums')} className="btn btn-primary">
          Back to Forums
        </button>
      </div>
    );
  }

  return (
    <div className="forum-detail-page">
      <div className="forum-detail-header">
        <button 
          onClick={() => navigate('/forums')} 
          className="back-btn"
        >
          <i className="fas fa-arrow-left"></i>
          Back to Forums
        </button>

        {canModerate && (
          <div className="moderator-actions">
            <button 
              className={`btn-icon ${forum.isPinned ? 'active' : ''}`}
              onClick={handlePinForum}
              title="Pin Forum"
            >
              <i className="fas fa-thumbtack"></i>
            </button>
            <button 
              className={`btn-icon ${forum.isLocked ? 'active' : ''}`}
              onClick={handleLockForum}
              title="Lock Forum"
            >
              <i className="fas fa-lock"></i>
            </button>
          </div>
        )}
      </div>

      <div className="forum-detail-content">
        {/* Forum Header */}
        <div className="forum-header-section">
          <div className="forum-badges">
            {forum.isPinned && (
              <span className="badge pinned">
                <i className="fas fa-thumbtack"></i> Pinned
              </span>
            )}
            {forum.isLocked && (
              <span className="badge locked">
                <i className="fas fa-lock"></i> Locked
              </span>
            )}
            <span className={`category-badge ${forum.category}`}>
              {forum.category.replace('-', ' ')}
            </span>
          </div>

          <h1 className="forum-title">{forum.title}</h1>
          
          <div className="forum-meta">
            <div className="author-info">
              <div className="author-avatar">
                {forum.author?.avatar ? (
                  <img src={forum.author.avatar} alt={forum.author.name} />
                ) : (
                  <div className="avatar-placeholder">
                    {forum.author?.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="author-details">
                <span className="author-name">{forum.author?.name}</span>
                <span className={`role-badge ${forum.author?.role}`}>
                  {forum.author?.role}
                </span>
              </div>
            </div>
            
            <div className="forum-stats">
              <span className="stat">
                <i className="fas fa-book"></i>
                {forum.course?.name}
              </span>
              <span className="stat">
                <i className="fas fa-calendar"></i>
                {formatDate(forum.createdAt)}
              </span>
              <span className="stat">
                <i className="fas fa-eye"></i>
                {forum.viewCount} views
              </span>
            </div>
          </div>

          <div className="forum-description">
            <p>{forum.description}</p>
          </div>

          {forum.tags && forum.tags.length > 0 && (
            <div className="forum-tags">
              {forum.tags.map((tag, index) => (
                <span key={index} className="tag">#{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Posts Section */}
        <div className="forum-posts-section">
          <div className="posts-header">
            <h2>
              <i className="fas fa-comments"></i>
              Responses ({forum.posts?.length || 0})
            </h2>
            
            {canReply && (
              <button 
                className="btn btn-primary"
                onClick={() => setShowReplyForm(!showReplyForm)}
              >
                <i className="fas fa-reply"></i>
                Reply
              </button>
            )}
          </div>

          {/* Reply Form */}
          {showReplyForm && canReply && (
            <div className="reply-form-section">
              <form onSubmit={handleReply} className="reply-form">
                <div className="form-group">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write your reply..."
                    rows="4"
                    required
                  />
                </div>
                <div className="form-actions">
                  <button 
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowReplyForm(false);
                      setReplyText('');
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Posting...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane"></i>
                        Post Reply
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Posts List */}
          <div className="posts-list">
            {forum.posts && forum.posts.length > 0 ? (
              forum.posts.map((post, index) => (
                <div key={post._id || index} className="post-item">
                  <div className="post-author">
                    <div className="author-avatar">
                      {post.author?.avatar ? (
                        <img src={post.author.avatar} alt={post.author.name} />
                      ) : (
                        <div className="avatar-placeholder">
                          {post.author?.name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="author-info">
                      <span className="author-name">{post.author?.name}</span>
                      <span className={`role-badge ${post.author?.role}`}>
                        {post.author?.role}
                      </span>
                      <span className="post-date">
                        {formatDate(post.createdAt)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="post-content">
                    <p>{post.content}</p>
                  </div>

                  {/* Replies to this post */}
                  {post.replies && post.replies.length > 0 && (
                    <div className="post-replies">
                      <h4>Replies ({post.replies.length})</h4>
                      {post.replies.map((reply, replyIndex) => (
                        <div key={reply._id || replyIndex} className="reply-item">
                          <div className="reply-author">
                            <div className="author-avatar small">
                              {reply.author?.avatar ? (
                                <img src={reply.author.avatar} alt={reply.author.name} />
                              ) : (
                                <div className="avatar-placeholder">
                                  {reply.author?.name?.charAt(0)?.toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="author-info">
                              <span className="author-name">{reply.author?.name}</span>
                              <span className={`role-badge ${reply.author?.role}`}>
                                {reply.author?.role}
                              </span>
                              <span className="reply-date">
                                {formatDate(reply.createdAt)}
                              </span>
                            </div>
                          </div>
                          <div className="reply-content">
                            <p>{reply.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="no-posts">
                <i className="fas fa-comments"></i>
                <p>No responses yet.</p>
                {canReply && (
                  <p>Be the first to respond to this discussion!</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForumDetailPage;
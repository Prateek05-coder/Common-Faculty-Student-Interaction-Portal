import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import VideoPlayer from '../components/video/VideoPlayer';
import VideoUploadModal from '../components/video/VideoUploadModal';
import VideoEditModal from '../components/video/VideoEditModal';
import axios from 'axios';
import toast from 'react-hot-toast';
import '../styles/video.css';

const VideoLecturesPage = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);

  const loadVideos = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/videos`);
      setVideos(response.data.data || []);
    } catch (error) {
      console.error('Error loading videos:', error);
      toast.error('Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const canUploadVideos = ['faculty', 'ta', 'admin'].includes(user?.role);

  const handleVideoUploaded = (newVideo) => {
    setVideos(prev => [newVideo, ...prev]);
    loadVideos(); // Refresh the list
  };

  const handleEditVideo = (video) => {
    setEditingVideo(video);
    setShowEditModal(true);
  };

  const handleDeleteVideo = async (video) => {
    if (window.confirm(`Are you sure you want to delete "${video.title}"? This action cannot be undone.`)) {
      try {
        await axios.delete(`${process.env.REACT_APP_API_URL}/videos/${video._id}`);
        toast.success('Video deleted successfully');
        loadVideos(); // Reload videos
      } catch (error) {
        console.error('Error deleting video:', error);
        toast.error('Failed to delete video');
      }
    }
  };

  const handleUpdateVideo = async (updatedData) => {
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/videos/${editingVideo._id}`, updatedData);
      toast.success('Video updated successfully');
      setShowEditModal(false);
      setEditingVideo(null);
      loadVideos(); // Reload videos
    } catch (error) {
      console.error('Error updating video:', error);
      toast.error('Failed to update video');
    }
  };

  if (loading) {
    return <div className="loading">Loading videos...</div>;
  }

  return (
    <div className="video-lectures-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-info">
            <h1>Video Lectures</h1>
            <p>Watch course lectures and learning materials</p>
          </div>
          
          {canUploadVideos && (
            <button 
              className="btn btn-primary"
              onClick={() => setShowUploadModal(true)}
            >
              <i className="fas fa-upload"></i>
              Upload Video
            </button>
          )}
        </div>
      </div>

      {selectedVideo ? (
        <VideoPlayer 
          video={selectedVideo} 
          onClose={() => setSelectedVideo(null)}
        />
      ) : (
        <div className="videos-grid">
          {videos.length > 0 ? (
            videos.map(video => (
              <div key={video._id} className="video-card">
                <div className="video-thumbnail">
                  <img 
                    src={video.thumbnailUrl ? `${process.env.REACT_APP_API_URL}${video.thumbnailUrl}` : '/default-thumbnail.jpg'} 
                    alt={video.title}
                    onClick={() => setSelectedVideo(video)}
                    className="thumbnail-image"
                  />
                  <div className="video-duration">
                    {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                  </div>
                  <div className="play-overlay">
                    <i className="fas fa-play"></i>
                  </div>
                </div>
                
                <div className="video-info">
                  <h3 className="video-title">{video.title}</h3>
                  <p className="video-description">{video.description}</p>
                  
                  <div className="video-meta">
                    <span className="course-name">
                      <i className="fas fa-book"></i>
                      {video.course.name}
                    </span>
                    <span className="upload-date">
                      <i className="fas fa-calendar"></i>
                      {new Date(video.createdAt).toLocaleDateString()}
                    </span>
                    <span className="view-count">
                      <i className="fas fa-eye"></i>
                      {video.viewCount} views
                    </span>
                  </div>

                  {video.attachments && video.attachments.length > 0 && (
                    <div className="video-attachments">
                      <span className="attachments-label">
                        <i className="fas fa-paperclip"></i>
                        {video.attachments.length} attachment(s)
                      </span>
                    </div>
                  )}

                  {/* Edit/Delete options for faculty and TA */}
                  {(['faculty', 'ta', 'admin'].includes(user?.role)) && (
                    <div className="video-actions">
                      <button 
                        className="action-btn edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditVideo(video);
                        }}
                        title="Edit Video"
                      >
                        <i className="fas fa-edit"></i>
                        Edit
                      </button>
                      <button 
                        className="action-btn delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteVideo(video);
                        }}
                        title="Delete Video"
                      >
                        <i className="fas fa-trash"></i>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <i className="fas fa-video"></i>
              <h3>No videos available</h3>
              <p>
                {canUploadVideos 
                  ? "Upload your first video lecture to get started!"
                  : "No video lectures have been uploaded yet."}
              </p>
              {canUploadVideos && (
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowUploadModal(true)}
                >
                  Upload First Video
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Video Upload Modal */}
      <VideoUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onVideoUploaded={handleVideoUploaded}
      />

      {/* Video Edit Modal */}
      <VideoEditModal
        video={editingVideo}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingVideo(null);
        }}
        onUpdate={handleUpdateVideo}
      />
    </div>
  );
};

export default VideoLecturesPage;

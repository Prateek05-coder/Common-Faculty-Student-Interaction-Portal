import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import VideoPlayer from '../components/video/VideoPlayer';
import axios from 'axios';
import toast from 'react-hot-toast';

const VideoLecturesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    loadVideos();
    loadCourses();
  }, []);

  const loadVideos = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/videos`);
      setVideos(response.data.data || []);
    } catch (error) {
      console.error('Error loading videos:', error);
      toast.error('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      let endpoint = '';
      switch (user?.role) {
        case 'student':
          endpoint = '/courses/enrolled';
          break;
        case 'faculty':
          endpoint = '/courses/teaching';
          break;
        case 'ta':
          endpoint = '/courses/assisting';
          break;
        default:
          endpoint = '/courses';
      }

      const response = await axios.get(`${process.env.REACT_APP_API_URL}${endpoint}`);
      setCourses(response.data.data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const canUploadVideos = ['faculty', 'ta', 'admin'].includes(user?.role);

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
                    src={video.thumbnailUrl || '/default-thumbnail.jpg'} 
                    alt={video.title}
                    onClick={() => setSelectedVideo(video)}
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
    </div>
  );
};

export default VideoLecturesPage;

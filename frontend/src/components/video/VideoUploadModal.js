import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

const VideoUploadModal = ({ isOpen, onClose, onVideoUploaded }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseId: ''
  });
  const [courses, setCourses] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const loadCourses = useCallback(async () => {
    try {
      let endpoint = '';
      switch (user?.role) {
        case 'faculty':
          endpoint = '/courses/teaching';
          break;
        case 'ta':
          endpoint = '/courses/assisting';
          break;
        case 'admin':
          endpoint = '/courses';
          break;
        default:
          return;
      }

      const response = await axios.get(`${process.env.REACT_APP_API_URL}${endpoint}`);
      setCourses(response.data.data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
      toast.error('Failed to load courses');
    }
  }, [user?.role]);

  useEffect(() => {
    if (isOpen) {
      loadCourses();
    }
  }, [isOpen, loadCourses]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleVideoFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select a valid video file (MP4, AVI, MOV, WMV, WebM)');
        return;
      }
      
      // Validate file size (500MB max)
      if (file.size > 500 * 1024 * 1024) {
        toast.error('Video file size must be less than 500MB');
        return;
      }
      
      setVideoFile(file);
    }
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select a valid image file (JPEG, PNG, WebP)');
        return;
      }
      
      setThumbnailFile(file);
    }
  };

  const handleAttachmentsChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 10) {
      toast.error('Maximum 10 attachments allowed');
      return;
    }
    
    setAttachments(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Please enter a video title');
      return;
    }
    
    if (!formData.courseId) {
      toast.error('Please select a course');
      return;
    }
    
    if (!videoFile) {
      toast.error('Please select a video file');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadData = new FormData();
      uploadData.append('title', formData.title.trim());
      uploadData.append('description', formData.description.trim());
      uploadData.append('courseId', formData.courseId);
      uploadData.append('video', videoFile);
      
      if (thumbnailFile) {
        uploadData.append('thumbnail', thumbnailFile);
      }
      
      // Add attachments
      attachments.forEach((file, index) => {
        uploadData.append('attachments', file);
      });

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/videos`,
        uploadData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(progress);
          },
        }
      );

      toast.success('Video uploaded successfully!');
      
      // Reset form
      setFormData({ title: '', description: '', courseId: '' });
      setVideoFile(null);
      setThumbnailFile(null);
      setAttachments([]);
      setUploadProgress(0);
      
      // Notify parent component
      if (onVideoUploaded) {
        onVideoUploaded(response.data.data);
      }
      
      onClose();
      
    } catch (error) {
      console.error('Video upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload video');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFormData({ title: '', description: '', courseId: '' });
      setVideoFile(null);
      setThumbnailFile(null);
      setAttachments([]);
      setUploadProgress(0);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content video-upload-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <i className="fas fa-video"></i>
            Upload Video Lecture
          </h2>
          {!uploading && (
            <button className="modal-close" onClick={handleClose}>
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="video-upload-form">
          <div className="form-group">
            <label htmlFor="title">Video Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter video title"
              required
              disabled={uploading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="courseId">Course *</label>
            <select
              id="courseId"
              name="courseId"
              value={formData.courseId}
              onChange={handleInputChange}
              required
              disabled={uploading}
            >
              <option value="">Select a course</option>
              {courses.map(course => (
                <option key={course._id} value={course._id}>
                  {course.code} - {course.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter video description (optional)"
              rows="3"
              disabled={uploading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="video">Video File *</label>
            <input
              type="file"
              id="video"
              accept="video/mp4,video/avi,video/mov,video/wmv,video/webm"
              onChange={handleVideoFileChange}
              required
              disabled={uploading}
            />
            {videoFile && (
              <div className="file-info">
                <i className="fas fa-video"></i>
                <span>{videoFile.name}</span>
                <span className="file-size">
                  ({(videoFile.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="thumbnail">Thumbnail (Optional)</label>
            <input
              type="file"
              id="thumbnail"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleThumbnailChange}
              disabled={uploading}
            />
            {thumbnailFile && (
              <div className="file-info">
                <i className="fas fa-image"></i>
                <span>{thumbnailFile.name}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="attachments">Attachments (Optional)</label>
            <input
              type="file"
              id="attachments"
              multiple
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
              onChange={handleAttachmentsChange}
              disabled={uploading}
            />
            {attachments.length > 0 && (
              <div className="attachments-list">
                {attachments.map((file, index) => (
                  <div key={index} className="file-info">
                    <i className="fas fa-paperclip"></i>
                    <span>{file.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {uploading && (
            <div className="upload-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <span className="progress-text">{uploadProgress}% uploaded</span>
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Uploading...
                </>
              ) : (
                <>
                  <i className="fas fa-upload"></i>
                  Upload Video
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VideoUploadModal;

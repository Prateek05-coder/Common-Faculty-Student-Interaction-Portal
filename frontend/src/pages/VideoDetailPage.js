import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import VideoPlayer from '../components/video/VideoPlayer';
import axios from 'axios';

const VideoDetailPage = () => {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVideo();
  }, [id]);

  const loadVideo = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/videos/${id}`);
      setVideo(response.data.data);
    } catch (error) {
      console.error('Error loading video:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading video...</div>;
  if (!video) return <div className="error">Video not found</div>;

  return (
    <div className="video-detail-page">
      <VideoPlayer video={video} onClose={() => window.history.back()} />
    </div>
  );
};

export default VideoDetailPage;

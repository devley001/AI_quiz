import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import dataService from '../services/dataService';
import './Posts.css';

const Posts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await dataService.getAllPosts();
        const postsData = response.posts || response.data?.posts || [];
        setPosts(postsData);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError('Failed to load posts. Showing sample data.');
        // Fallback to sample data if API fails
        const samplePosts = [
          {
            _id: 'sample-1',
            title: 'Welcome to AI Quiz App',
            content: 'This is a comprehensive AI-powered quiz application that combines machine learning with interactive learning experiences. Explore text analysis, quiz generation, and intelligent recommendations.',
            author: { name: 'AI Assistant', email: 'ai@app.com' },
            createdAt: new Date().toISOString(),
            views: 42,
            likes: []
          },
          {
            _id: 'sample-2',
            title: 'How to Use AI Text Analysis',
            content: 'Our AI service provides powerful text analysis capabilities including sentiment analysis, entity recognition, keyword extraction, and readability scoring. Learn how to leverage these features for your projects.',
            author: { name: 'System Admin', email: 'admin@app.com' },
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            views: 28,
            likes: []
          },
          {
            _id: 'sample-3',
            title: 'Quiz Generation with AI',
            content: 'Generate intelligent quizzes on any topic using our advanced AI algorithms. Customize difficulty levels, question types, and get instant feedback on your knowledge.',
            author: { name: 'Quiz Bot', email: 'quiz@app.com' },
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            views: 35,
            likes: []
          }
        ];
        setPosts(samplePosts);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) {
    return <div className="loading">Loading posts...</div>;
  }

  return (
    <div className="posts-page">
      <div className="container">
        <div className="posts-header">
          <h1>All Posts</h1>
          <Link to="/create-post" className="btn btn-primary">
            Create New Post
          </Link>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="posts-grid">
          {posts.map(post => (
            <div key={post._id} className="post-card">
              <h3>
                <Link to={`/posts/${post._id}`}>{post.title}</Link>
              </h3>
              <p className="post-excerpt">
                {post.content.substring(0, 150)}...
              </p>
              <div className="post-meta">
                <span>By {post.author?.name || 'Unknown'}</span>
                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Posts;
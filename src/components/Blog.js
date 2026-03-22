import React, { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import { collection, getDocs, query, orderBy, limit, startAfter } from 'firebase/firestore';
import { db } from '../firebase';
import { Helmet } from 'react-helmet-async';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import useModal from '../hooks/useModal';

const Section = styled.section`
  padding: 2rem 1rem;
  text-align: center;
  background: #0a0a0f;
  color: #e2e8f0;
  min-height: 80vh;

  @media (min-width: 768px) {
    padding: 4rem 2rem;
  }
`;

const Heading = styled.h1`
  font-size: 1.75rem;
  margin-bottom: 1.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #fff, #a5b4fc, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;

  @media (min-width: 768px) {
    font-size: 2.5rem;
    margin-bottom: 2rem;
  }
`;

const BlogContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  padding: 0 0.25rem;

  @media (min-width: 768px) {
    gap: 2rem;
    padding: 0;
  }
`;

const BlogCard = styled.div`
  background: rgba(15, 15, 25, 0.8);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 12px;
  padding: 1.25rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  text-align: left;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: transform 0.3s, border-color 0.3s;

  &:hover {
    transform: translateY(-5px);
    border-color: rgba(99, 102, 241, 0.4);
  }

  @media (min-width: 768px) {
    width: 300px;
    padding: 1.5rem;
  }
`;

const BlogImage = styled(LazyLoadImage)`
  width: 100%;
  height: auto;
  max-height: 200px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 1rem;
`;

const BlogTitle = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: #e2e8f0;
`;

const BlogDate = styled.p`
  font-size: 0.9rem;
  color: #64748b;
  margin-bottom: 0.5rem;
`;

const BlogAuthor = styled.p`
  font-size: 1rem;
  color: #94a3b8;
  margin-bottom: 1rem;
`;

const BlogDescription = styled.p`
  font-size: 1rem;
  color: #94a3b8;
  text-align: left;
  margin-bottom: 1rem;
`;

const ReadMoreLink = styled.span`
  color: #818cf8;
  text-decoration: none;
  cursor: pointer;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
    color: #a5b4fc;
  }
`;

const Modal = styled.div`
  display: ${(props) => (props.show ? 'block' : 'none')};
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  padding: 1rem;
  z-index: 1000;
  overflow-y: auto;

  @media (min-width: 768px) {
    padding: 2rem;
  }
`;

const ModalContent = styled.div`
  background: #0f0f19;
  border: 1px solid rgba(99, 102, 241, 0.2);
  padding: 1.25rem;
  border-radius: 12px;
  max-width: 90%;
  max-height: 90%;
  margin: auto;
  text-align: left;
  overflow-y: auto;
  color: #e2e8f0;

  @media (max-width: 600px) {
    max-width: 100%;
    margin: 0;
    border-radius: 12px 12px 0 0;
    max-height: 100%;
  }

  @media (min-width: 768px) {
    padding: 2rem;
  }
`;

const CloseButton = styled.button`
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  color: #fff;
  border: none;
  cursor: pointer;
  border-radius: 8px;
  float: right;
  font-weight: 500;

  &:hover {
    opacity: 0.9;
  }
`;

const ModalImage = styled(LazyLoadImage)`
  width: 100%;
  height: auto;
  max-height: 500px;
  object-fit: contain;
  border-radius: 8px;
  margin-bottom: 1rem;
`;

const Blog = () => {
  const [blogs, setBlogs] = useState([]);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const POSTS_PER_PAGE = 12;

  const handleCloseModal = useCallback(() => {
    setSelectedBlog(null);
  }, []);

  useModal(!!selectedBlog, handleCloseModal);

  const fetchBlogPosts = useCallback(async (loadMore = false) => {
    try {
      setLoading(true);
      let q;
      if (loadMore && lastDoc) {
        q = query(collection(db, 'blogPosts'), orderBy('date', 'desc'), startAfter(lastDoc), limit(POSTS_PER_PAGE));
      } else {
        q = query(collection(db, 'blogPosts'), orderBy('date', 'desc'), limit(POSTS_PER_PAGE));
      }
      const querySnapshot = await getDocs(q);
      const blogPosts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (querySnapshot.docs.length < POSTS_PER_PAGE) {
        setHasMore(false);
      }

      if (querySnapshot.docs.length > 0) {
        setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
      }

      if (loadMore) {
        setBlogs(prev => [...prev, ...blogPosts]);
      } else {
        setBlogs(blogPosts);
      }
    } catch (err) {
      console.error('Error fetching blog posts:', err);
      setError('Failed to load blog posts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [lastDoc]);

  useEffect(() => {
    fetchBlogPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBlogClick = (blog) => {
    setSelectedBlog(blog);
  };

  const truncateText = (text, length) => {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
  };

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <Helmet>
        <title>Blog - MarketPlaymaker</title>
        <meta name="description" content="Read the latest blog posts on trading, investing, and market insights. Stay updated with MarketPlaymaker." />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="Blog - MarketPlaymaker" />
        <meta property="og:description" content="Read the latest blog posts on trading, investing, and market insights." />
        <meta property="og:url" content={window.location.href} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Blog - MarketPlaymaker" />
        <meta name="twitter:description" content="Read the latest blog posts on trading, investing, and market insights." />
      </Helmet>

      <Section>
        <Heading>Blog</Heading>
        {error ? (
          <p role="alert" style={{ color: '#f87171' }}>{error}</p>
        ) : loading && blogs.length === 0 ? (
          <p>Loading blog posts...</p>
        ) : blogs.length === 0 ? (
          <p>No blog posts yet. Check back soon!</p>
        ) : (
          <>
            <BlogContainer>
              {blogs.map((post) => (
                <BlogCard key={post.id} onClick={() => handleBlogClick(post)} role="article">
                  <BlogImage src={post.image} alt={post.title || 'Blog post'} />
                  <BlogTitle>{post.title}</BlogTitle>
                  <BlogDate>{formatDate(post.date)}</BlogDate>
                  <BlogAuthor>{post.author}</BlogAuthor>
                  <BlogDescription>{truncateText(post.description, 100)}</BlogDescription>
                  <ReadMoreLink>Keep reading</ReadMoreLink>
                </BlogCard>
              ))}
            </BlogContainer>
            {hasMore && (
              <button
                onClick={() => fetchBlogPosts(true)}
                disabled={loading}
                style={{
                  padding: '0.75rem 2rem',
                  background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginTop: '2rem',
                  fontSize: '1rem',
                  fontWeight: 500,
                  opacity: loading ? 0.5 : 1,
                }}
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            )}
          </>
        )}

        {selectedBlog && (
          <Modal show={!!selectedBlog} role="dialog" aria-modal="true" aria-label={selectedBlog.title}>
            <ModalContent>
              <CloseButton onClick={handleCloseModal} aria-label="Close">Close</CloseButton>
              <ModalImage src={selectedBlog.image} alt={selectedBlog.title || 'Blog post'} />
              <BlogTitle>{selectedBlog.title}</BlogTitle>
              <BlogDate>{formatDate(selectedBlog.date)}</BlogDate>
              <BlogAuthor>{selectedBlog.author}</BlogAuthor>
              <BlogDescription>{selectedBlog.description}</BlogDescription>
            </ModalContent>
          </Modal>
        )}
      </Section>
    </>
  );
};

export default Blog;

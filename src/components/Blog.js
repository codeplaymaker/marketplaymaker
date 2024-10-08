import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { LazyLoadImage } from 'react-lazy-load-image-component';

const Section = styled.section`
  padding: 4rem 2rem;
  text-align: center;
  background-color: #f9f9f9;
`;

const Heading = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 2rem;
`;

const BlogContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2rem;
`;

const BlogCard = styled.div`
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  width: 300px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  text-align: left;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: transform 0.3s;

  &:hover {
    transform: translateY(-5px);
  }

  @media (max-width: 600px) {
    width: 100%;
    max-width: 400px;
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
  color: #000;
`;

const BlogDate = styled.p`
  font-size: 0.9rem;
  color: #888;
  margin-bottom: 0.5rem;
`;

const BlogAuthor = styled.p`
  font-size: 1rem;
  color: #555;
  margin-bottom: 1rem;
`;

const BlogDescription = styled.p`
  font-size: 1rem;
  color: #333;
  text-align: left;
  margin-bottom: 1rem;
`;

const ReadMoreLink = styled.span`
  color: #1e90ff;
  text-decoration: none;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
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
  padding: 2rem;
  z-index: 1000;
  overflow-y: auto; /* Allow scrolling if content overflows */
`;

const ModalContent = styled.div`
  background-color: #fff;
  padding: 2rem;
  border-radius: 8px;
  max-width: 90%;
  max-height: 90%;
  margin: auto;
  text-align: left;
  overflow-y: auto; /* Allow scrolling within the modal if needed */

  @media (max-width: 600px) {
    max-width: 100%;
    margin: 0;
  }
`;

const CloseButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #000;
  color: #fff;
  border: none;
  cursor: pointer;
  border-radius: 4px;
  float: right;

  &:hover {
    background-color: #333;
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

  useEffect(() => {
    const fetchBlogPosts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'blogPosts'));
        const blogPosts = [];
        querySnapshot.forEach((doc) => {
          blogPosts.push({ id: doc.id, ...doc.data() });
        });
        setBlogs(blogPosts);
      } catch (error) {
        console.error('Error fetching blog posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogPosts();
  }, []);

  const handleBlogClick = (blog) => {
    setSelectedBlog(blog);
  };

  const handleCloseModal = () => {
    setSelectedBlog(null);
  };

  const truncateText = (text, length) => {
    return text.length > length ? text.substring(0, length) + '...' : text;
  };

  return (
    <HelmetProvider>
      <Helmet>
        <title>Blog - marketplaymaker</title>
        <meta name="description" content="Read the latest blog posts on various topics. Stay updated with our blog for interesting insights and updates." />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="Blog - marketplaymaker"/>
        <meta property="og:description" content="Read the latest blog posts on various topics. Stay updated with our blog for interesting insights and updates." />
        <meta property="og:image" content={selectedBlog ? selectedBlog.image : ''} />
        <meta property="og:url" content={window.location.href} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Blog - marketplaymaker" />
        <meta name="twitter:description" content="Read the latest blog posts on various topics. Stay updated with our blog for interesting insights and updates." />
        <meta name="twitter:image" content={selectedBlog ? selectedBlog.image : ''} />
      </Helmet>

      <Section>
        <Heading>Blog</Heading>
        {loading ? (
          <p>Loading blog posts...</p>
        ) : (
          <BlogContainer>
            {blogs.map((post) => (
              <BlogCard key={post.id} onClick={() => handleBlogClick(post)}>
                <BlogImage src={post.image} alt={post.title} />
                <BlogTitle>{post.title}</BlogTitle>
                <BlogDate>{new Date(post.date).toLocaleDateString()}</BlogDate>
                <BlogAuthor>{post.author}</BlogAuthor>
                <BlogDescription>{truncateText(post.description, 100)}</BlogDescription>
                <ReadMoreLink>Keep reading</ReadMoreLink>
              </BlogCard>
            ))}
          </BlogContainer>
        )}

        {selectedBlog && (
          <Modal show={!!selectedBlog}>
            <ModalContent>
              <CloseButton onClick={handleCloseModal}>Close</CloseButton>
              <ModalImage src={selectedBlog.image} alt={selectedBlog.title} />
              <BlogTitle>{selectedBlog.title}</BlogTitle>
              <BlogDate>{new Date(selectedBlog.date).toLocaleDateString()}</BlogDate>
              <BlogAuthor>{selectedBlog.author}</BlogAuthor>
              <BlogDescription>{selectedBlog.description}</BlogDescription>
            </ModalContent>
          </Modal>
        )}
      </Section>
    </HelmetProvider>
  );
};

export default Blog;

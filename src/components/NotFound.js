import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  padding: 2rem;
  text-align: center;
`;

const ErrorCode = styled.h1`
  font-size: 6rem;
  margin: 0;
  font-weight: 800;
  background: linear-gradient(135deg, #fff, #a5b4fc, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Title = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #e2e8f0;
`;

const Message = styled.p`
  font-size: 1.1rem;
  color: #94a3b8;
  margin-bottom: 2rem;
  max-width: 500px;
`;

const HomeLink = styled(Link)`
  padding: 0.75rem 2rem;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  color: #fff;
  border: none;
  border-radius: 8px;
  text-decoration: none;
  font-size: 1rem;
  font-weight: 500;
  transition: opacity 0.3s;

  &:hover {
    opacity: 0.9;
  }
`;

const NotFound = () => (
  <Container>
    <ErrorCode>404</ErrorCode>
    <Title>Page Not Found</Title>
    <Message>
      The page you&apos;re looking for doesn&apos;t exist or has been moved.
    </Message>
    <HomeLink to="/">Go Home</HomeLink>
  </Container>
);

export default NotFound;

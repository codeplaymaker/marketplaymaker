import React from 'react';
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

const ErrorIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  margin-bottom: 1rem;
  color: #e2e8f0;
`;

const Message = styled.p`
  font-size: 1.1rem;
  color: #94a3b8;
  margin-bottom: 2rem;
  max-width: 500px;
`;

const RetryButton = styled.button`
  padding: 0.75rem 2rem;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: opacity 0.3s;

  &:hover {
    opacity: 0.9;
  }
`;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container role="alert">
          <ErrorIcon aria-hidden="true">⚠️</ErrorIcon>
          <Title>Something went wrong</Title>
          <Message>
            We&apos;re sorry, but something unexpected happened. Please try refreshing
            the page or click the button below.
          </Message>
          <RetryButton onClick={this.handleRetry}>Try Again</RetryButton>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

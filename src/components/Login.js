import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import styled from 'styled-components';

const Section = styled.section`
  padding: 1.5rem 1rem;
  text-align: center;
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #0a0a0f;
  color: #e2e8f0;

  @media (min-width: 768px) {
    padding: 2rem;
  }

  h2 {
    font-size: 2rem;
    font-weight: 700;
    background: linear-gradient(135deg, #fff, #a5b4fc, #818cf8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  width: 100%;
  max-width: 400px;
  padding: 0 0.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 340px;
  text-align: left;

  @media (min-width: 480px) {
    max-width: 300px;
  }
`;

const Label = styled.label`
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: #94a3b8;
`;

const Input = styled.input`
  padding: 0.75rem;
  width: 100%;
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s;
  box-sizing: border-box;
  background: rgba(15, 15, 25, 0.8);
  color: #e2e8f0;

  &:focus {
    border-color: #6366f1;
    outline: none;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
  }

  &::placeholder {
    color: #64748b;
  }
`;

const Button = styled.button`
  padding: 0.75rem 2rem;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 1rem;
  font-size: 1rem;
  font-weight: 600;
  transition: opacity 0.3s, transform 0.2s;
  min-width: 120px;

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.p`
  color: #f87171;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  width: 100%;
  max-width: 340px;
  text-align: center;
  word-break: break-word;

  @media (min-width: 480px) {
    max-width: 300px;
  }
`;

const SuccessMessage = styled.p`
  color: #22c55e;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  background-color: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.2);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  width: 100%;
  max-width: 300px;
  text-align: center;
`;

const StyledLink = styled(Link)`
  color: #818cf8;
  text-decoration: none;
  font-size: 0.9rem;
  margin-top: 0.5rem;

  &:hover {
    text-decoration: underline;
    color: #a5b4fc;
  }
`;

const ForgotPasswordButton = styled.button`
  background: none;
  border: none;
  color: #818cf8;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0;
  margin-top: 0.25rem;

  &:hover {
    text-decoration: underline;
    color: #a5b4fc;
  }
`;

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err) {
      switch (err.code) {
        case 'auth/user-not-found':
          setError('Email not recognized. Please sign up.');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password. Please try again.');
          break;
        case 'auth/invalid-email':
          setError('Invalid email format. Please check and try again.');
          break;
        case 'auth/user-disabled':
          setError('This account has been disabled. Please contact support.');
          break;
        case 'auth/invalid-credential':
          setError('Invalid credentials. Please check and try again.');
          break;
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Please try again later.');
          break;
        default:
          setError('An error occurred. Please try again later.');
          break;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Please enter your email address first.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('Password reset email sent! Check your inbox.');
    } catch (err) {
      switch (err.code) {
        case 'auth/user-not-found':
          setError('No account found with this email.');
          break;
        case 'auth/invalid-email':
          setError('Invalid email format.');
          break;
        default:
          setError('Failed to send reset email. Please try again.');
          break;
      }
    }
  };

  return (
    <Section>
      <h2>Login</h2>
      <Form onSubmit={handleLogin} noValidate>
        <FormGroup>
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            aria-required="true"
          />
        </FormGroup>
        <FormGroup>
          <Label htmlFor="login-password">Password</Label>
          <Input
            id="login-password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            aria-required="true"
          />
          <ForgotPasswordButton type="button" onClick={handleForgotPassword}>
            Forgot password?
          </ForgotPasswordButton>
        </FormGroup>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </Button>
        {error && <ErrorMessage role="alert">{error}</ErrorMessage>}
        {success && <SuccessMessage role="status">{success}</SuccessMessage>}
        <StyledLink to="/signup">Don&apos;t have an account? Sign up</StyledLink>
      </Form>
    </Section>
  );
};

export default Login;

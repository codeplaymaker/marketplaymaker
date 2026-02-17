import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';
import styled from 'styled-components';

const Section = styled.section`
  padding: 2rem;
  text-align: center;
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  width: 100%;
  max-width: 400px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 300px;
  text-align: left;
`;

const Label = styled.label`
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: #333;
`;

const Input = styled.input`
  padding: 0.75rem;
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
  box-sizing: border-box;

  &:focus {
    border-color: #000;
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
  }
`;

const Button = styled.button`
  padding: 0.75rem 2rem;
  background-color: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 1rem;
  font-size: 1rem;
  transition: background-color 0.3s, transform 0.2s;
  min-width: 120px;

  &:hover:not(:disabled) {
    background-color: #333;
    transform: translateY(-2px);
  }

  &:disabled {
    background-color: #999;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.p`
  color: #d32f2f;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  background-color: #ffeef0;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  width: 100%;
  max-width: 300px;
  text-align: center;
`;

const SuccessMessage = styled.p`
  color: #2e7d32;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  background-color: #e8f5e9;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  width: 100%;
  max-width: 300px;
  text-align: center;
`;

const StyledLink = styled(Link)`
  color: #1e90ff;
  text-decoration: none;
  font-size: 0.9rem;
  margin-top: 0.5rem;

  &:hover {
    text-decoration: underline;
  }
`;

const PasswordStrength = styled.div`
  width: 100%;
  margin-top: 0.25rem;
`;

const StrengthBar = styled.div`
  height: 4px;
  border-radius: 2px;
  background-color: #e0e0e0;
  overflow: hidden;

  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${props => props.strength}%;
    background-color: ${props => {
      if (props.strength <= 25) return '#d32f2f';
      if (props.strength <= 50) return '#f57c00';
      if (props.strength <= 75) return '#fbc02d';
      return '#2e7d32';
    }};
    transition: width 0.3s, background-color 0.3s;
  }
`;

const StrengthText = styled.span`
  font-size: 0.75rem;
  color: #666;
`;

const getPasswordStrength = (password) => {
  let strength = 0;
  if (password.length >= 6) strength += 25;
  if (password.length >= 8) strength += 15;
  if (/[A-Z]/.test(password)) strength += 20;
  if (/[0-9]/.test(password)) strength += 20;
  if (/[^A-Za-z0-9]/.test(password)) strength += 20;
  return Math.min(strength, 100);
};

const getStrengthLabel = (strength) => {
  if (strength <= 25) return 'Weak';
  if (strength <= 50) return 'Fair';
  if (strength <= 75) return 'Good';
  return 'Strong';
};

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { createUserDocument } = useAuth();

  const passwordStrength = getPasswordStrength(password);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.emailVerified) {
        navigate('/dashboard');
      }
    });
    return unsubscribe;
  }, [navigate]);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (passwordStrength < 50) {
      setError('Please choose a stronger password. Include uppercase letters, numbers, or symbols.');
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await createUserDocument(userCredential.user);
      await sendEmailVerification(userCredential.user);
      setSuccess('Account created! A verification email has been sent. Please check your inbox.');
    } catch (err) {
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError("You're already signed up. Please log in.");
          break;
        case 'auth/invalid-email':
          setError('Invalid email format.');
          break;
        case 'auth/weak-password':
          setError('Password is too weak. Please use at least 6 characters.');
          break;
        default:
          setError('An error occurred during sign up. Please try again.');
          break;
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Section>
      <h2>Sign Up</h2>
      <Form onSubmit={handleSignUp} noValidate>
        <FormGroup>
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
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
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            aria-required="true"
          />
          {password && (
            <PasswordStrength>
              <StrengthBar strength={passwordStrength} />
              <StrengthText>{getStrengthLabel(passwordStrength)}</StrengthText>
            </PasswordStrength>
          )}
        </FormGroup>
        <FormGroup>
          <Label htmlFor="signup-confirm-password">Confirm Password</Label>
          <Input
            id="signup-confirm-password"
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            aria-required="true"
          />
        </FormGroup>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Sign Up'}
        </Button>
        {error && <ErrorMessage role="alert">{error}</ErrorMessage>}
        {success && <SuccessMessage role="status">{success}</SuccessMessage>}
        <StyledLink to="/login">Already have an account? Log in</StyledLink>
      </Form>
    </Section>
  );
};

export default SignUp;

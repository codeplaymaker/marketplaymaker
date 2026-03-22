import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';
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

const PasswordStrength = styled.div`
  width: 100%;
  margin-top: 0.25rem;
`;

const StrengthBar = styled.div`
  height: 4px;
  border-radius: 2px;
  background-color: rgba(255, 255, 255, 0.1);
  overflow: hidden;

  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${props => props.strength}%;
    background-color: ${props => {
      if (props.strength <= 25) return '#f87171';
      if (props.strength <= 50) return '#fb923c';
      if (props.strength <= 75) return '#fbbf24';
      return '#34d399';
    }};
    transition: width 0.3s, background-color 0.3s;
  }
`;

const StrengthText = styled.span`
  font-size: 0.75rem;
  color: #94a3b8;
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

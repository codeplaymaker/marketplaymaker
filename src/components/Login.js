import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import styled from 'styled-components';

const Section = styled.section`
  padding: 2rem;
  text-align: center;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
`;

const Input = styled.input`
  padding: 0.5rem;
  width: 300px;
`;

const Button = styled.button`
  padding: 0.5rem 2rem;
  background-color: #000;
  color: #fff;
  border: none;
  cursor: pointer;
  margin-top: 1rem;
  &:hover {
    background-color: #333;
  }
`;

const ErrorMessage = styled.p`
  color: red;
  margin-top: 1rem;
`;

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); // Reset the error message

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (error) {
      // Log the full error object to inspect its structure
      console.error('Login error:', error);
      console.error('Error code:', error.code); // Log the error code

      // Handle error based on error code
      switch (error.code) {
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
          setError('This user has been disabled. Please contact support.');
          break;
        case 'auth/invalid-credential':
          setError('Invalid credentials. Please check and try again.');
          break;
        case 'auth/too-many-requests':
          setError('Too many failed login attempts. Please try again later.');
          break;
        default:
          setError('An error occurred. Please try again later.');
          break;
      }
    }
  };

  return (
    <Section>
      <h2>Login</h2>
      <Form onSubmit={handleLogin}>
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit">Login</Button>
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </Form>
    </Section>
  );
};

export default Login;

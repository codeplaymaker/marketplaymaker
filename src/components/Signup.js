import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
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

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/dashboard');
      }
    });
    return unsubscribe;
  }, [navigate]);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError(''); // Clear any previous errors
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setError("You're already signed up, please log in.");
      } else {
        setError('Error signing up: ' + error.message);
      }
    }
  };

  return (
    <Section>
      <h2>Sign Up</h2>
      <Form onSubmit={handleSignUp}>
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
        <Button type="submit">Sign Up</Button>
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </Form>
    </Section>
  );
};

export default SignUp;

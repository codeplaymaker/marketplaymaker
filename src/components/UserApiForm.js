import React, { useState } from 'react';
import styled from 'styled-components';
import TradeInfo from './TradeInfo';

const Container = styled.div`
  max-width: 500px;
  margin: 2rem auto;
  padding: 2rem;
`;

const Title = styled.h2`
  margin-bottom: 1rem;
  text-align: center;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-weight: 600;
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
  font-family: monospace;

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
  font-size: 1rem;
  margin-top: 0.5rem;
  transition: background-color 0.3s;

  &:hover:not(:disabled) {
    background-color: #333;
  }

  &:disabled {
    background-color: #999;
    cursor: not-allowed;
  }
`;

const Warning = styled.p`
  font-size: 0.8rem;
  color: #666;
  margin-top: 0.5rem;
`;

const UserApiForm = () => {
  const [apiToken, setApiToken] = useState('');
  const [accountId, setAccountId] = useState('');
  const [userDetails, setUserDetails] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!apiToken.trim() || !accountId.trim()) return;
    setUserDetails({ apiToken, accountId });
  };

  return (
    <Container>
      {!userDetails ? (
        <>
          <Title>Connect Your Trading Account</Title>
          <Form onSubmit={handleSubmit}>
            <FormGroup>
              <Label htmlFor="api-token">API Token</Label>
              <Input
                id="api-token"
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Enter your MetaAPI token"
                required
                autoComplete="off"
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="account-id">Account ID</Label>
              <Input
                id="account-id"
                type="text"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="Enter your account ID"
                required
                autoComplete="off"
              />
            </FormGroup>
            <Button type="submit" disabled={!apiToken.trim() || !accountId.trim()}>
              Connect
            </Button>
            <Warning>Your credentials are used only for this session and are not stored.</Warning>
          </Form>
        </>
      ) : (
        <TradeInfo userDetails={userDetails} />
      )}
    </Container>
  );
};

export default UserApiForm;

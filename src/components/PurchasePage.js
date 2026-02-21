// src/components/PurchasePage.js
import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  text-align: center;
  margin-top: 20px;
  padding: 1.5rem 1rem;
  min-height: 80vh;

  @media (min-width: 768px) {
    padding: 2rem;
  }
`;

const Title = styled.h1`
  margin-bottom: 1rem;
  font-size: 1.5rem;

  @media (min-width: 768px) {
    font-size: 2rem;
  }
`;

const Description = styled.p`
  margin-bottom: 2rem;
  color: #666;
`;

const PurchasePage = () => {
  React.useEffect(() => {
    if (window.StripeBuyButton) {
      window.StripeBuyButton.load();
    }
  }, []);

  return (
    <Container>
      <Title>Purchase Product</Title>
      <Description>Complete your purchase by selecting a payment method below.</Description>
      <stripe-buy-button
        buy-button-id={process.env.REACT_APP_STRIPE_BUY_BUTTON_ID}
        publishable-key={process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY}
      ></stripe-buy-button>
    </Container>
  );
};

export default PurchasePage;

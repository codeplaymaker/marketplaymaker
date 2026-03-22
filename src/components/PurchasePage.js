// src/components/PurchasePage.js
import React from 'react';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Page = styled.div`
  min-height: 100vh;
  background: #0a0a0f;
  color: #e2e8f0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`;

const Hero = styled.section`
  text-align: center;
  padding: 4rem 1rem 2rem;
  background: linear-gradient(180deg, rgba(99,102,241,0.08) 0%, transparent 100%);
  border-bottom: 1px solid rgba(99,102,241,0.1);

  @media (min-width: 768px) {
    padding: 5rem 2rem 3rem;
  }
`;

const Title = styled.h1`
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 800;
  background: linear-gradient(135deg, #fff, #a5b4fc, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 0.75rem;
  animation: ${fadeIn} 0.6s ease-out;
`;

const Subtitle = styled.p`
  color: #94a3b8;
  font-size: clamp(1rem, 2.5vw, 1.2rem);
  max-width: 550px;
  margin: 0 auto 2rem;
  line-height: 1.7;
  animation: ${fadeIn} 0.6s ease-out 0.1s backwards;
`;

const PricingSection = styled.section`
  padding: 3rem 1rem;
  max-width: 900px;
  margin: 0 auto;

  @media (min-width: 768px) {
    padding: 4rem 2rem;
  }
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }
`;

const PricingCard = styled.div`
  background: rgba(15, 15, 25, 0.8);
  border: 1px solid ${p => p.$featured ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.15)'};
  border-radius: 16px;
  padding: 2rem 1.5rem;
  position: relative;
  animation: ${fadeIn} 0.6s ease-out ${p => p.$delay || '0.2s'} backwards;
  transition: border-color 0.3s, transform 0.3s;

  ${p => p.$featured && `
    box-shadow: 0 0 40px rgba(99,102,241,0.15);
  `}

  &:hover {
    border-color: rgba(99,102,241,0.5);
    transform: translateY(-4px);
  }
`;

const Badge = styled.span`
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #6366f1, #818cf8);
  color: #fff;
  padding: 0.3rem 1rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const PlanName = styled.h3`
  font-size: 1.3rem;
  font-weight: 700;
  color: #e2e8f0;
  margin: 0 0 0.5rem;
`;

const Price = styled.div`
  font-size: 2.5rem;
  font-weight: 800;
  color: #fff;
  margin: 0.75rem 0;

  span {
    font-size: 1rem;
    font-weight: 400;
    color: #64748b;
  }
`;

const PlanDesc = styled.p`
  color: #94a3b8;
  font-size: 0.95rem;
  line-height: 1.5;
  margin-bottom: 1.5rem;
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 2rem;
`;

const Feature = styled.li`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0;
  color: #e2e8f0;
  font-size: 0.9rem;
  border-bottom: 1px solid rgba(255,255,255,0.04);

  &:last-child {
    border-bottom: none;
  }

  &::before {
    content: '✓';
    color: #22c55e;
    font-weight: 700;
    font-size: 0.85rem;
  }
`;

const StripeWrapper = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 1rem;
`;

const TrustSection = styled.section`
  padding: 2rem 1rem 4rem;
  text-align: center;
  max-width: 700px;
  margin: 0 auto;
`;

const TrustGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
`;

const TrustItem = styled.div`
  background: rgba(15, 15, 25, 0.6);
  border: 1px solid rgba(99,102,241,0.1);
  border-radius: 12px;
  padding: 1.5rem 1rem;
  animation: ${fadeIn} 0.6s ease-out ${p => p.$delay || '0.4s'} backwards;

  h4 {
    color: #e2e8f0;
    font-size: 0.95rem;
    margin: 0.5rem 0 0.25rem;
  }

  p {
    color: #64748b;
    font-size: 0.8rem;
    margin: 0;
  }
`;

const TrustIcon = styled.div`
  font-size: 1.5rem;
`;

const SectionLabel = styled.h2`
  font-size: 1.1rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const PurchasePage = () => {
  React.useEffect(() => {
    if (window.StripeBuyButton) {
      window.StripeBuyButton.load();
    }
  }, []);

  return (
    <Page>
      <Hero>
        <Title>Get Full Access</Title>
        <Subtitle>
          Unlock real-time market edges, automated alerts, and the tools that power smarter trades — all in one place.
        </Subtitle>
      </Hero>

      <PricingSection>
        <CardGrid>
          {/* Free Tier */}
          <PricingCard $delay="0.2s">
            <PlanName>Explorer</PlanName>
            <Price>$0 <span>/ forever</span></Price>
            <PlanDesc>See what the platform can do. Browse public data and get a feel for the tools.</PlanDesc>
            <FeatureList>
              <Feature>Track Record — full transparency</Feature>
              <Feature>Public blog &amp; market insights</Feature>
              <Feature>Playbook overview</Feature>
              <Feature>Community access</Feature>
            </FeatureList>
          </PricingCard>

          {/* Paid Tier */}
          <PricingCard $featured $delay="0.3s">
            <Badge>Most Popular</Badge>
            <PlanName>Pro</PlanName>
            <Price>
              {/* Price is set in your Stripe Buy Button */}
              <span>Starting at</span>
            </Price>
            <PlanDesc>Everything in Explorer, plus real-time alerts and advanced tools to stay ahead.</PlanDesc>
            <FeatureList>
              <Feature>Real-time Telegram edge alerts</Feature>
              <Feature>Polymarket live scanner</Feature>
              <Feature>Trading journal with analytics</Feature>
              <Feature>AI-powered probability models</Feature>
              <Feature>Priority support</Feature>
            </FeatureList>
            <StripeWrapper>
              <stripe-buy-button
                buy-button-id={process.env.REACT_APP_STRIPE_BUY_BUTTON_ID}
                publishable-key={process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY}
              ></stripe-buy-button>
            </StripeWrapper>
          </PricingCard>
        </CardGrid>
      </PricingSection>

      <TrustSection>
        <SectionLabel>Why traders choose us</SectionLabel>
        <TrustGrid>
          <TrustItem $delay="0.4s">
            <TrustIcon>📊</TrustIcon>
            <h4>Data-Driven</h4>
            <p>Every edge is backed by real probability models and live market data.</p>
          </TrustItem>
          <TrustItem $delay="0.5s">
            <TrustIcon>🔒</TrustIcon>
            <h4>Transparent</h4>
            <p>Full track record — wins and losses — published for everyone to see.</p>
          </TrustItem>
          <TrustItem $delay="0.6s">
            <TrustIcon>⚡</TrustIcon>
            <h4>Real-Time</h4>
            <p>Alerts fire the moment an edge appears. No delays, no stale data.</p>
          </TrustItem>
        </TrustGrid>
      </TrustSection>
    </Page>
  );
};

export default PurchasePage;

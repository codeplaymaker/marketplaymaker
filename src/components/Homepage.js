import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Hero from './Hero';
import { Helmet } from 'react-helmet-async';

const MainContainer = styled.div`
  font-family: 'Open Sans', sans-serif;
  color: #fff;
  background-color: #000;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const Section = styled.section`
  padding: 4rem 2rem;
  text-align: center;
  background-color: #000;
  color: #fff;
  margin: 1rem 0;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(255, 255, 255, 0.2);
`;

const Heading = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 2rem;
  color: #fff;
`;

const CardContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2rem;
`;

const Card = styled.div`
  background-color: #222;
  border: 1px solid #444;
  border-radius: 15px;
  padding: 2rem;
  width: 250px;
  height: 250px;
  box-shadow: 0 4px 8px rgba(255, 255, 255, 0.2);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s, background-color 0.3s;
  cursor: pointer;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  &:hover {
    transform: translateY(-10px);
    background-color: #333;
  }
`;

const Emoji = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #ff5722;

  @media (prefers-reduced-motion: no-preference) {
    animation: bounce 1s infinite;
  }

  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-20px);
    }
    60% {
      transform: translateY(-10px);
    }
  }
`;

const CardTitle = styled.h2`
  font-size: 1.5rem;
  margin: 0;
  color: #fff;
`;

const Badge = styled.div`
  background-color: #444;
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.8rem;
  position: absolute;
  top: 10px;
  right: 10px;
  transform: rotate(-10deg);
  box-shadow: 0 2px 4px rgba(255, 255, 255, 0.2);
`;

const CallToAction = styled.div`
  margin-top: auto;
  text-align: center;
  padding: 2rem;
`;

const CTAButton = styled.button`
  padding: 1rem 2rem;
  background-color: #ff4136;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1.2rem;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.3s;
  margin: 0 auto;
  display: block;

  @media (prefers-reduced-motion: reduce) {
    transition: background-color 0.3s;
  }

  &:hover {
    background-color: #e33e2d;
    transform: translateY(-5px);
  }

  &:focus-visible {
    outline: 2px solid #ff4136;
    outline-offset: 2px;
  }
`;

const BenefitsSection = styled(Section)`
  background-color: #000;
`;

const BenefitCard = styled(Card)`
  width: 300px;
  height: auto;
  padding: 2.5rem;
  text-align: left;
`;

const FEATURES = [
  { emoji: '📚', title: 'Playbooks', path: '/dashboard' },
  { emoji: '🎮', title: 'Plays', path: '/dashboard' },
  { emoji: '🔍', title: 'Stats', path: '/trading-journal' },
];

const BENEFITS = [
  { emoji: '🚀', title: 'Expert Insights', description: 'Gain access to expert insights and strategies to maximize your investments.' },
  { emoji: '📈', title: 'Real-Time Data', description: 'Stay updated with real-time market data and analytics.' },
  { emoji: '🤝', title: 'Community Support', description: 'Join a community of like-minded investors and get support and advice.' },
];

const siteUrl = process.env.REACT_APP_SITE_URL || 'https://marketplaymaker.com';

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCardClick = (path) => {
    if (user) {
      navigate(path);
    } else {
      navigate('/signup');
    }
  };

  return (
    <>
      <Helmet>
        <title>MarketPlaymaker - Empower Your Investments</title>
        <meta name="description" content="Discover our features, benefits, and trading tools. Explore how MarketPlaymaker can help you make smarter investment decisions." />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="MarketPlaymaker - Empower Your Investments" />
        <meta property="og:description" content="Discover our features, benefits, and trading tools. Explore how MarketPlaymaker can help you make smarter investment decisions." />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="MarketPlaymaker - Empower Your Investments" />
        <meta name="twitter:description" content="Discover our features, benefits, and trading tools. Explore how MarketPlaymaker can help you make smarter investment decisions." />
      </Helmet>

      <MainContainer>
        <Hero />
        <Section>
          <Heading>Explore Our Features</Heading>
          <CardContainer>
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                onClick={() => handleCardClick(feature.path)}
                style={{ position: 'relative' }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleCardClick(feature.path)}
                aria-label={`Go to ${feature.title}`}
              >
                <Card>
                  <Badge aria-hidden="true">💎</Badge>
                  <Emoji role="img" aria-label={feature.title}>{feature.emoji}</Emoji>
                  <CardTitle>{feature.title}</CardTitle>
                </Card>
              </div>
            ))}
          </CardContainer>
        </Section>

        <BenefitsSection>
          <Heading>Why Choose Us?</Heading>
          <CardContainer>
            {BENEFITS.map((benefit) => (
              <BenefitCard key={benefit.title}>
                <Emoji role="img" aria-label={benefit.title}>{benefit.emoji}</Emoji>
                <CardTitle>{benefit.title}</CardTitle>
                <p>{benefit.description}</p>
              </BenefitCard>
            ))}
          </CardContainer>
        </BenefitsSection>

        <CallToAction>
          <CTAButton onClick={() => navigate('/signup')}>Get Started Now</CTAButton>
        </CallToAction>
      </MainContainer>
    </>
  );
};

export default HomePage;

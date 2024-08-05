import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Hero from './Hero';
import LoadingScreen from './LoadingScreen';
import TelegramChat from './TelegramChat'; // Ensure this import is correct

const MainContainer = styled.div`
  font-family: 'Open Sans', sans-serif;
  color: #fff;
  background-color: #000; /* Space Black background for the whole page */
`;

const Section = styled.section`
  padding: 4rem 2rem;
  text-align: center;
  background-color: #000; /* Space Black background for each section */
  color: #fff; /* Text color to ensure readability */
  margin: 1rem 0;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(255, 255, 255, 0.2); /* Subtle light shadow */
`;

const Heading = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 2rem;
  color: #fff; /* Light color for headings */
`;

const SubHeading = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 3rem;
  color: #ddd; /* Slightly lighter color for subheadings */
`;

const CardContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2rem;
`;

const Card = styled.div`
  background-color: #222; /* Dark background for cards */
  border: 1px solid #444; /* Dark border */
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

  &:hover {
    transform: translateY(-10px);
    background-color: #333; /* Slightly lighter on hover */
  }
`;

const Emoji = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #ff5722; /* Bright color for emojis */
  animation: bounce 1s infinite;

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
  color: #fff; /* Light color for card titles */
`;

const Badge = styled.div`
  background-color: #444; /* Dark badge background */
  color: #fff; /* Light text color */
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
  margin-top: 3rem;
  text-align: center;
`;

const CTAButton = styled.button`
  padding: 1rem 2rem;
  background-color: #ff4136; /* Bright button color */
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1.2rem;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.3s;
  margin: 0 auto;

  &:hover {
    background-color: #e33e2d;
    transform: translateY(-5px);
  }
`;

const BenefitsSection = styled(Section)`
  background-color: #000; /* Space Black background for benefits section */
`;

const BenefitCard = styled(Card)`
  width: 300px;
  height: auto;
  padding: 2.5rem;
  text-align: left;
`;

const TestimonialsSection = styled(Section)`
  background-color: #000; /* Space Black background for testimonials section */
`;

const TestimonialBubble = styled.div`
  position: relative;
  background: #222; /* Dark background for testimonials */
  border: 1px solid #444; /* Dark border */
  border-radius: 15px;
  padding: 1.5rem;
  width: 300px;
  box-shadow: 0 4px 8px rgba(255, 255, 255, 0.2);
  text-align: left;
  overflow: hidden;
  margin: 1rem;
  &:before {
    content: '';
    position: absolute;
    bottom: -20px;
    left: 20px;
    width: 0;
    height: 0;
    border-left: 20px solid transparent;
    border-right: 20px solid transparent;
    border-top: 20px solid #222;
    transform: translateY(10px);
  }
`;

const TestimonialText = styled.p`
  font-size: 1rem;
  color: #ddd; /* Light color for testimonial text */
  margin: 0;
`;

const TestimonialAuthor = styled.p`
  font-size: 1rem;
  font-weight: bold;
  margin-top: 1rem;
  color: #fff; /* Light color for author name */
`;

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleCardClick = (path) => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/signup');
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <MainContainer>
      <Hero />
      <Section>
        <Heading>Explore Our Features</Heading>
        <CardContainer>
          <div onClick={() => handleCardClick('/playbooks')} style={{ position: 'relative' }}>
            <Card>
              <Badge>💎</Badge>
              <Emoji>📚</Emoji>
              <CardTitle>Playbooks</CardTitle>
            </Card>
          </div>
          <div onClick={() => handleCardClick('/plays')} style={{ position: 'relative' }}>
            <Card>
              <Badge>💎</Badge>
              <Emoji>🎮</Emoji>
              <CardTitle>Plays</CardTitle>
            </Card>
          </div>
          <div onClick={() => handleCardClick('/stats')} style={{ position: 'relative' }}>
            <Card>
              <Badge>💎</Badge>
              <Emoji>🔍</Emoji>
              <CardTitle>Stats</CardTitle>
            </Card>
          </div>
        </CardContainer>
      </Section>

      <BenefitsSection>
        <Heading>Why Choose Us?</Heading>
        <CardContainer>
          <BenefitCard>
            <Emoji>🚀</Emoji>
            <CardTitle>Expert Insights</CardTitle>
            <p>Gain access to expert insights and strategies to maximize your investments.</p>
          </BenefitCard>
          <BenefitCard>
            <Emoji>📈</Emoji>
            <CardTitle>Real-Time Data</CardTitle>
            <p>Stay updated with real-time market data and analytics.</p>
          </BenefitCard>
          <BenefitCard>
            <Emoji>🤝</Emoji>
            <CardTitle>Community Support</CardTitle>
            <p>Join a community of like-minded investors and get support and advice.</p>
          </BenefitCard>
        </CardContainer>
      </BenefitsSection>

      <TestimonialsSection>
        <Heading>What Our Users Say</Heading>
        <CardContainer>
          <TestimonialBubble>
            <TestimonialText>"MarketPlaymaker has completely transformed my investment strategy. The insights are invaluable!"</TestimonialText>
            <TestimonialAuthor>— Jane Doe</TestimonialAuthor>
          </TestimonialBubble>
          <TestimonialBubble>
            <TestimonialText>"I love the community aspect of MarketPlaymaker. I've learned so much from other members."</TestimonialText>
            <TestimonialAuthor>— John Smith</TestimonialAuthor>
          </TestimonialBubble>
          <TestimonialBubble>
            <TestimonialText>"The real-time data and analytics have given me a significant edge in the market."</TestimonialText>
            <TestimonialAuthor>— Emily Johnson</TestimonialAuthor>
          </TestimonialBubble>
        </CardContainer>
      </TestimonialsSection>

      <CallToAction>
        <CTAButton onClick={() => navigate('/signup')}>Get Started Now</CTAButton>
      </CallToAction>
    </MainContainer>
  );
};

export default HomePage;

import React from 'react';
import styled from 'styled-components';
import logo2 from '../components/logo/logo1.png';
import { useNavigate } from 'react-router-dom';

const HeroSection = styled.section`
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=DM+Sans:wght@400;500&family=Orbitron:wght@400;500&display=swap');

  background-color: #000;
  color: #fff;
  padding: 2.5rem 1.25rem;
  text-align: left;
  position: relative;
  overflow: hidden;

  @media (min-width: 768px) {
    padding: 4rem 2rem;
  }
`;

const HeroLogo = styled.img`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: auto;
  max-width: 600px;
  opacity: 0.1;
  z-index: 1;
`;

const HeroContent = styled.div`
  position: relative;
  z-index: 2;
  max-width: 600px;
`;

const HeroHeading = styled.h1`
  font-size: 2rem;
  margin-bottom: 1rem;
  color: #f0f0f0;
  font-family: 'Inter', sans-serif;

  @media (min-width: 768px) {
    font-size: 3rem;
  }
`;

const HeroSubheading = styled.p`
  font-size: 1.25rem;
  margin-bottom: 2rem;
  color: #c0c0c0;
  font-family: 'DM Sans', sans-serif;

  @media (min-width: 768px) {
    font-size: 2rem;
  }
`;

const HeroButton = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: #ff4136;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  font-family: 'Orbitron', sans-serif;
  transition: background-color 0.3s, transform 0.2s;

  &:hover {
    background-color: #e33e2d;
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid #ff4136;
    outline-offset: 2px;
  }
`;

const Hero = () => {
  const navigate = useNavigate();

  return (
    <HeroSection>
      <HeroLogo src={logo2} alt="" aria-hidden="true" />
      <HeroContent>
        <HeroHeading>Empower Your Investments</HeroHeading>
        <HeroSubheading>Unlocking Smarter Decisions for Every Investor</HeroSubheading>
        <HeroButton onClick={() => navigate('/signup')}>Get Started</HeroButton>
      </HeroContent>
    </HeroSection>
  );
};

export default Hero;

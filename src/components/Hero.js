import React from 'react';
import styled from 'styled-components';
import logo2 from '../components/logo/logo1.png';
import { useNavigate } from 'react-router-dom';

const HeroSection = styled.section`
  background-color: #000;
  color: #fff;
  padding: 4rem 2rem;
  text-align: left; /* Align text to the left */
  position: relative;
  overflow: hidden;
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
  max-width: 600px; /* Restrict max width for better alignment */
`;

const HeroHeading = styled.h1`
  font-size: 3rem; /* Increased font size for emphasis */
  margin-bottom: 1rem;
  color: #d3d3d3; /* Light grey for a softer look */
  font-family: 'Inter', sans-serif; /* Ensure 'Inter' font is imported */
`;

const HeroSubheading = styled.p`
  font-size: 2rem; /* Adjusted font size */
  margin-bottom: 2rem;
  color: #a9a9a9; /* Darker grey for contrast */
  font-family: 'DM Sans', sans-serif; /* Ensure 'DM Sans' font is imported */
`;

const HeroButton = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: grey; /* Background color for button */
  color: white; /* Text color */
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  font-family: 'Orbitron', sans-serif; /* Ensure 'Orbitron' font is imported */
  transition: background-color 0.3s;

  &:hover {
    background-color: red; /* Color change on hover */
  }
`;

const Hero = () => {
  const navigate = useNavigate(); // Correctly use the navigate function

  return (
    <HeroSection>
      <HeroLogo src={logo2} alt="Logo" />
      <HeroContent>
        <HeroHeading>Empower Your Investments</HeroHeading>
        <HeroSubheading>Unlocking Smarter Decisions for Every Investor</HeroSubheading>
        <HeroButton onClick={() => navigate('/signup')}>Get Started</HeroButton>
      </HeroContent>
    </HeroSection>
  );
};

export default Hero;

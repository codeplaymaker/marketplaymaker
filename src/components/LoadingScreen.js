// src/components/LoadingScreen.js
import React from 'react';
import styled, { keyframes } from 'styled-components';
import logo2 from '../components/logo/logo1.png';

const glow = keyframes`
  0% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.5;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100vw;
  background-color: #000;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
`;

const LoadingLogo = styled.img`
  width: 150px;
  height: auto;
  animation: ${glow} 2s infinite;
`;

const LoadingScreen = () => (
  <LoadingContainer>
    <LoadingLogo src={logo2} alt="Loading Logo" />
  </LoadingContainer>
);

export default LoadingScreen;

import React, { useEffect } from 'react';
import styled from 'styled-components';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000; /* Ensure it overlays above other content */
`;

const Modal = styled.div`
  background: #fff;
  padding: 1rem;
  border-radius: 8px;
  width: 90%;
  max-width: 75vw; /* Ensure modal doesn't exceed viewport width */
  max-height: 75vh; /* Ensure modal fits within the viewport */
  overflow-y: auto; /* Allow scrolling if content overflows */
  position: relative;
  box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1); /* Optional: add shadow for better visibility */

  /* Responsive styles */
  @media (max-width: 768px) {
    width: 95%;
    max-width: 95vw;
    max-height: 80vh;
  }

  @media (max-width: 480px) {
    width: 98%;
    max-width: 98vw;
    max-height: 70vh;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 0.2rem;
  right: 0.2rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  z-index: 1001; /* Ensure it overlays above the modal content */
  color: #333; /* Optional: set color for better visibility */
`;

const TradingViewModal = ({ stockSymbol, onClose }) => {
  useEffect(() => {
    new window.TradingView.widget({
      container_id: 'tradingview_widget',
      width: '100%',
      height: '100%', // Adjust to ensure responsiveness
      symbol: stockSymbol,
      interval: 'D',
      timezone: 'Etc/UTC',
      theme: 'light',
      style: '1',
      locale: 'en',
      toolbar_bg: '#f1f3f6',
      enable_publishing: false,
      withdateranges: true,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      save_image: false,
      studies: [],
      show_popup_button: true,
      popup_width: '100%',
      popup_height: '100%',
    });
  }, [stockSymbol]);

  return (
    <Overlay>
      <Modal>
        <CloseButton onClick={onClose}>&times;</CloseButton>
        <div id="tradingview_widget" style={{ height: '100%', width: '100%' }}></div>
      </Modal>
    </Overlay>
  );
};

export default TradingViewModal;

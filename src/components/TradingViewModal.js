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
  max-width: 800px;
  max-height: 90vh; /* Ensure the modal fits within the viewport */
  overflow-y: auto; /* Allow scrolling if content overflows */
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 0.1rem;
  right: 0.1rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  z-index: 1001; /* Ensure it overlays above the modal content */
`;

const TradingViewModal = ({ stockSymbol, onClose }) => {
  useEffect(() => {
    new window.TradingView.widget({
      container_id: 'tradingview_widget',
      width: '100%',
      height: '500px',
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
      popup_width: '1000',
      popup_height: '650',
    });
  }, [stockSymbol]);

  return (
    <Overlay>
      <Modal>
        <CloseButton onClick={onClose}>&times;</CloseButton>
        <div id="tradingview_widget"></div>
      </Modal>
    </Overlay>
  );
};

export default TradingViewModal;

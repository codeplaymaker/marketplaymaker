import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import useModal from '../hooks/useModal';

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
  z-index: 1000;
`;

const Modal = styled.div`
  background: #fff;
  padding: 1rem;
  border-radius: 8px;
  width: 90%;
  max-width: 75vw;
  max-height: 75vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);

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
  z-index: 1001;
  color: #333;

  &:focus-visible {
    outline: 2px solid #000;
    outline-offset: 2px;
  }
`;

const TradingViewModal = ({ stockSymbol, onClose }) => {
  const widgetRef = useRef(null);
  useModal(true, onClose);

  useEffect(() => {
    const containerId = 'tradingview_widget';

    try {
      if (window.TradingView && window.TradingView.widget) {
        // eslint-disable-next-line no-new
        new window.TradingView.widget({
          container_id: containerId,
          width: '100%',
          height: '100%',
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
      }
    } catch (err) {
      console.error('Error initializing TradingView widget:', err);
    }

    return () => {
      // Cleanup widget on unmount
      if (widgetRef.current) {
        widgetRef.current.innerHTML = '';
      }
    };
  }, [stockSymbol]);

  return (
    <Overlay onClick={onClose} role="dialog" aria-modal="true" aria-label={`Chart for ${stockSymbol}`}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose} aria-label="Close chart">&times;</CloseButton>
        <div
          id="tradingview_widget"
          ref={widgetRef}
          style={{ height: '100%', width: '100%', minHeight: '400px' }}
        />
      </Modal>
    </Overlay>
  );
};

export default TradingViewModal;

import React from 'react';
import styled from 'styled-components';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const PopupImage = styled.img`
  max-width: 90%;
  max-height: 90%;
  border-radius: 8px;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: none;
  border: none;
  color: white;
  font-size: 2rem;
  cursor: pointer;
`;

const ImagePopup = ({ imageUrl, onClose }) => {
  return (
    <Overlay onClick={onClose}>
      <PopupImage src={imageUrl} alt="Enlarged" onClick={(e) => e.stopPropagation()} />
      <CloseButton onClick={onClose}>&times;</CloseButton>
    </Overlay>
  );
};

export default ImagePopup;

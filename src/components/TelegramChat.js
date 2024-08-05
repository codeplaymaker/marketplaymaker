// components/TelegramChat.js
import React, { useState } from 'react';
import styled from 'styled-components';
import telegramLogo from './logo/logo1.png'; // Make sure to update the path

const ChatButton = styled.button`
  background-color: #0088cc;
  color: white;
  border: none;
  border-radius: 50%;
  padding: 10px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;

  &:hover {
    background-color: #0077bb;
  }
`;

const ChatContainer = styled.div`
  display: ${(props) => (props.open ? 'flex' : 'none')};
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 250px; /* Adjusted for smaller size */
  height: 350px; /* Adjusted for smaller size */
  padding: 10px; /* Reduced padding */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  background-color: #fff;
  overflow: hidden;
  position: fixed;
  bottom: 80px; /* Adjusted to be above the button */
  right: 20px;
  z-index: 1000;
`;

const Header = styled.div`
  background-color: #0088cc;
  color: white;
  width: 100%;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  font-size: 18px;
`;

const Logo = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 10px;
`;

const MessageBubble = styled.div`
  background-color: #f1f1f1;
  border-radius: 10px;
  padding: 10px;
  margin: 10px 0;
  width: 80%;
  text-align: left;
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 10px;
  border-bottom-left-radius: 10px;
  border-bottom-right-radius: 10px;
  background-color: #f9f9f9;
`;

const Input = styled.input`
  padding: 10px;
  width: 80%;
  border: 1px solid #ccc;
  border-radius: 5px;
  margin-right: 10px;
`;

const SendButton = styled.button`
  background-color: #0088cc;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 10px 15px;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #0077bb;
  }
`;

const ChatButtonIcon = styled.img`
  width: 25px; /* Adjust size as needed */
  height: 25px; /* Adjust size as needed */
  border-radius: 50%;
`;

const TelegramChat = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleChatClick = () => {
    window.open('https://t.me/marketplaymaker', '_blank');
  };

  return (
    <>
      <ChatButton onClick={() => setIsOpen(!isOpen)}>
        <ChatButtonIcon src={telegramLogo} alt="Telegram Logo" />
      </ChatButton>
      <ChatContainer open={isOpen}>
        <Header>
          <Logo src={telegramLogo} alt="Telegram Logo" />
          marketplaymaker
        </Header>
        <MessageBubble>
          Hey there! How can I help you?
        </MessageBubble>
        <Footer>
          <Input type="text" placeholder="Type a message..." />
          <SendButton onClick={handleChatClick}>Send</SendButton>
        </Footer>
      </ChatContainer>
    </>
  );
};

export default TelegramChat;

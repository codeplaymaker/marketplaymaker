import React from 'react';
import styled from 'styled-components';

const CardContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2rem;
  padding: 2rem;
`;

const Card = styled.div`
  background-color: #fff;
  color: #000;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  width: 300px;
  text-align: left;
  transition: transform 0.3s, box-shadow 0.3s;

  &:hover {
    transform: translateY(-10px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  }
`;

const CardTitle = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 1rem;
`;

const CardDescription = styled.p`
  font-size: 1rem;
  color: #333;
`;

const CardLayout = ({ items }) => {
  return (
    <CardContainer>
      {items.map((item, index) => (
        <Card key={index}>
          <CardTitle>{item.title}</CardTitle>
          <CardDescription>{item.description}</CardDescription>
        </Card>
      ))}
    </CardContainer>
  );
};

export default CardLayout;

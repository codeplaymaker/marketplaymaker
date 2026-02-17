import React, { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import TradingViewModal from './TradingViewModal';
import ImagePopup from './ImagePopup';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDesktop } from '@fortawesome/free-solid-svg-icons';
import LoadingScreen from './LoadingScreen';

const Section = styled.section`
  padding: 4rem 2rem;
  text-align: center;
  background-color: white;
  min-height: 80vh;
`;

const Heading = styled.h1`
  font-size: 3rem;
  margin-bottom: 2rem;
  color: #333;
`;

const CardContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2rem;
`;

const Card = styled.div`
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 15px;
  padding: 1.5rem;
  width: 300px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  text-align: left;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.3s, box-shadow 0.3s;
  position: relative;
  overflow: hidden;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  &:hover {
    transform: translateY(-10px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 1rem;
`;

const CardTitle = styled.h2`
  font-size: 1.5rem;
  margin: 0;
  color: #333;
`;

const CardDate = styled.div`
  font-size: 0.9rem;
  color: #555;
`;

const CardContent = styled.div`
  font-size: 1rem;
  color: #333;
  text-align: center;
`;

const ImageContainer = styled.div`
  width: 100%;
  margin-bottom: 1rem;
  display: flex;
  justify-content: center;
  cursor: pointer;
`;

const CardImage = styled.img`
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 50%;
  transition: transform 0.3s;

  &:hover {
    transform: scale(1.1);
  }
`;

const IconButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #000;
  color: #fff;
  border: none;
  cursor: pointer;
  margin-top: 1rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background-color 0.3s, transform 0.3s;

  &:hover {
    background-color: #333;
    transform: translateY(-5px);
  }

  &:focus-visible {
    outline: 2px solid #000;
    outline-offset: 2px;
  }
`;

const ErrorText = styled.p`
  color: #d32f2f;
  font-size: 1.1rem;
  margin: 2rem 0;
`;

const EmptyState = styled.div`
  padding: 3rem;
  color: #666;
  font-size: 1.1rem;
`;

const RetryButton = styled.button`
  padding: 0.5rem 1.5rem;
  background-color: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 1rem;
  font-size: 1rem;

  &:hover {
    background-color: #333;
  }
`;

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [isImagePopupOpen, setIsImagePopupOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const querySnapshot = await getDocs(collection(db, 'dashboard'));
      const dashboardData = [];
      querySnapshot.forEach((doc) => {
        dashboardData.push({ id: doc.id, ...doc.data() });
      });
      setData(dashboardData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleButtonClick = (stockSymbol) => {
    if (stockSymbol) {
      setSelectedStock(stockSymbol);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStock(null);
  };

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
    setIsImagePopupOpen(true);
  };

  const handleCloseImagePopup = () => {
    setIsImagePopupOpen(false);
    setSelectedImage(null);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Section>
      <Heading>Dashboard</Heading>

      {error ? (
        <ErrorText role="alert">
          {error}
          <br />
          <RetryButton onClick={fetchDashboardData}>Retry</RetryButton>
        </ErrorText>
      ) : data.length === 0 ? (
        <EmptyState>
          <p>No dashboard items yet. Check back soon!</p>
        </EmptyState>
      ) : (
        <CardContainer>
          {data.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
                <CardDate>{item.date}</CardDate>
              </CardHeader>
              <ImageContainer onClick={() => handleImageClick(item.image)}>
                {item.image && <CardImage src={item.image} alt={item.title || 'Dashboard item'} />}
              </ImageContainer>
              <CardContent>{item.content}</CardContent>
              {item.stockSymbol && (
                <IconButton
                  onClick={() => handleButtonClick(item.stockSymbol)}
                  aria-label={`View chart for ${item.stockSymbol}`}
                >
                  <FontAwesomeIcon icon={faDesktop} size="lg" />
                  <span>Chart</span>
                </IconButton>
              )}
            </Card>
          ))}
        </CardContainer>
      )}

      {isModalOpen && selectedStock && (
        <TradingViewModal
          stockSymbol={selectedStock}
          onClose={handleCloseModal}
        />
      )}
      {isImagePopupOpen && (
        <ImagePopup
          imageUrl={selectedImage}
          onClose={handleCloseImagePopup}
        />
      )}
    </Section>
  );
};

export default Dashboard;

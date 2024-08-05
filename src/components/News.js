import React, { useEffect, useState } from 'react';
import axios from 'axios';
import styled from 'styled-components';

const Section = styled.section`
  padding: 4rem 2rem;
  text-align: center;
`;

const Heading = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 2rem;
  color: #000; // Set the color to black
`;

const SubHeading = styled.h2`
  font-size: 2rem;
  margin: 2rem 0 1rem;
  color: #000; // Set the color to black
`;

const NewsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const NewsItem = styled.div`
  width: 80%;
  max-width: 800px;
  padding: 1.5rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  background-color: #f9f9f9;
  text-align: left;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: flex-start;
`;

const NewsImage = styled.img`
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 8px;
  margin-right: 1rem;
`;

const NewsContent = styled.div`
  flex: 1;
`;

const NewsTitle = styled.h3`
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: #000; // Set the color to black
`;

const NewsDescription = styled.p`
  font-size: 1rem;
  margin-bottom: 1rem;
  color: #000; // Set the color to black
`;

const ReadMoreLink = styled.a`
  color: #1e90ff;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const News = () => {
  const [financeNews, setFinanceNews] = useState([]);

  useEffect(() => {
    // Fetch finance news from Finnhub
    const fetchFinanceNews = async () => {
      try {
        const response = await axios.get(`https://finnhub.io/api/v1/news?category=general&token=cq1ucjhr01qjh3d5vt5gcq1ucjhr01qjh3d5vt60`);
        setFinanceNews(response.data);
      } catch (error) {
        console.error("Error fetching finance news", error);
      }
    };

    fetchFinanceNews();
  }, []);

  return (
    <Section>
      <Heading>Finance News</Heading>
      <NewsContainer>
        {financeNews.map((news, index) => (
          <NewsItem key={index}>
            {news.image && <NewsImage src={news.image} alt={news.headline} />}
            <NewsContent>
              <NewsTitle>{news.headline}</NewsTitle>
              <NewsDescription>{news.summary}</NewsDescription>
              <ReadMoreLink href={news.url} target="_blank" rel="noopener noreferrer">Read more</ReadMoreLink>
            </NewsContent>
          </NewsItem>
        ))}
      </NewsContainer>
    </Section>
  );
};

export default News;

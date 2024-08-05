import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import styled from 'styled-components';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

const Section = styled.section`
  padding: 2rem;
  text-align: center;
`;

const StyledCalendar = styled(Calendar)`
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border: none;

  .react-calendar__tile {
    padding: 1rem 0.5rem;
    border-radius: 8px;
    &:hover {
      background-color: #f0f0f0;
    }
  }

  .react-calendar__tile--active {
    background-color: #000;
    color: #fff;
    border-radius: 8px;
  }
`;

const EntriesContainer = styled.div`
  margin-top: 2rem;
  text-align: left;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`;

const EntryCard = styled.div`
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
`;

const EntryField = styled.p`
  font-size: 1rem;
  margin: 0.5rem 0;
  color: #333;
`;

const TradingCalendar = () => {
  const [user] = useAuthState(auth);
  const [entries, setEntries] = useState([]);
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    if (user) {
      fetchEntries();
    }
  }, [user]);

  const fetchEntries = async () => {
    const q = query(collection(db, 'tradingJournal'), where('userId', '==', user.uid));
    const querySnapshot = await getDocs(q);
    const fetchedEntries = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setEntries(fetchedEntries);
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dayEntries = entries.filter(
        entry => new Date(entry.date).toDateString() === date.toDateString()
      );
      return dayEntries.length ? <span>📈</span> : null;
    }
  };

  return (
    <Section>
      <h2>Trading Calendar</h2>
      <StyledCalendar
        onChange={setDate}
        value={date}
        tileContent={tileContent}
      />
      <EntriesContainer>
        <h3>Trades on {date.toDateString()}</h3>
        {entries
          .filter(entry => new Date(entry.date).toDateString() === date.toDateString())
          .map(entry => (
            <EntryCard key={entry.id}>
              {Object.keys(entry).map((key) => (
                key !== 'userId' && <EntryField key={key}>{`${key.replace(/([A-Z])/g, ' $1').toUpperCase()}: ${entry[key]}`}</EntryField>
              ))}
            </EntryCard>
          ))}
      </EntriesContainer>
    </Section>
  );
};

export default TradingCalendar;

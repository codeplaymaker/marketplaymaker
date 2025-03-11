import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { collection, getDocs, addDoc, query, where, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// Styled components
const Section = styled.section`
  padding: 2rem;
  text-align: center;
`;

const StyledCalendar = styled(Calendar)`
  width: 100%;
  max-width: 400px;
  margin: 2rem auto;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border: none;

  .react-calendar__tile {
    padding: 0.5rem 0.25rem;
    border-radius: 8px;
    &:hover {
      background-color:rgb(255, 255, 255);
    }
  }

  .react-calendar__tile--active {
    background-color: #000;
    color: #fff;
    border-radius: 8px;
  }
`;

const EntriesContainer = styled.div`
  margin-top: 1rem;
  text-align: left;
  max-width: 600px;
  margin: 0 auto;
`;

const EntryCard = styled.div`
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.5rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
`;

const EntryField = styled.p`
  font-size: 0.8rem;
  margin: 0.25rem 0;
  color: #333;
`;

const DashboardSection = styled.div`
  margin: 1rem 0;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const StatCard = styled.div`
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  margin: 0.5rem;
  width: 100%;
  max-width: 150px;
  text-align: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  font-size: 0.8rem;
  transition: transform 0.3s, background-color 0.3s;
  cursor: pointer;

  &:hover {
    transform: translateY(-10px);
    background-color: #f0f0f0;
  }
`;

const CardsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
  max-width: 400px;
  margin: 0 auto;
`;

const Input = styled.input`
  padding: 0.5rem;
  width: 100%;
  font-size: 0.8rem;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  background-color: #000;
  color: #fff;
  border: none;
  cursor: pointer;
  margin-top: 0.5rem;
  margin-right: 15px;
  margin-left: 15px;
  font-size: 0.8rem;
  border-radius: 4px;
  &:hover {
    background-color: #333;
  }
`;

const DeleteButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: red;
  color: #fff;
  border: none;
  cursor: pointer;
  margin-top: 0.5rem;
  margin-left: 15px;
  font-size: 0.8rem;
  border-radius: 4px;
  &:hover {
    background-color: darkred;
  }
`;

const EditButton = styled(Button)`
margin-left: 15px;
margin-right: 15px;
  background-color: #000; // Set the background color to black
  &:hover {
    background-color: #333; // Darker black for hover effect
  }
`;


// Modal styling
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: #fff;
  border-radius: 8px;
  padding: 2rem;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  position: relative;
`;

const ModalCloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: transparent;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
`;

// Utility functions
const stripCurrencySymbol = (value) => value.replace(/[^0-9.-]+/g, '');

const formatDate = (date) => {
  if (isNaN(new Date(date))) {
    return new Date().toISOString().split('T')[0];
  }
  const d = new Date(date);
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
};

const FIELD_ORDER = [
  'pair',
  'direction',
  'date',
  'outcome',
  'pnl',
  'gain',
  'risk',
  'rrr',
  'entryTf',
  'entryWindow',
  'day',
  'model',
  'killzone',
  'timeInTrade'
];

const TradingJournal = () => {
  const [user] = useAuthState(auth);
  const [entries, setEntries] = useState([]);
  const [date, setDate] = useState(new Date());
  const [journalEntry, setJournalEntry] = useState({
    pair: '',
    direction: '',
    date: '',
    outcome: '',
    pnl: '',
    gain: '',
    risk: '',
    rrr: '',
    entryTf: '',
    entryWindow: '',
    day: '',
    model: '',
    killzone: '',
    timeInTrade: ''
  });
  const [editMode, setEditMode] = useState(false);
  const [modalEntry, setModalEntry] = useState(null); // State for modal

  const fetchEntries = useCallback(async () => {
    if (user) {
      try {
        const q = query(collection(db, 'tradingJournal'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const fetchedEntries = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEntries(fetchedEntries);
      } catch (error) {
        console.error("Error fetching entries: ", error);
      }
    }
  }, [user]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries, date]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setJournalEntry({ ...journalEntry, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        const entryRef = doc(db, 'tradingJournal', journalEntry.id);
        await updateDoc(entryRef, { ...journalEntry });
        setEditMode(false);
      } else {
        await addDoc(collection(db, 'tradingJournal'), {
          ...journalEntry,
          userId: user.uid
        });
      }
      setJournalEntry({
        pair: '',
        direction: '',
        date: '',
        outcome: '',
        pnl: '',
        gain: '',
        risk: '',
        rrr: '',
        entryTf: '',
        entryWindow: '',
        day: '',
        model: '',
        killzone: '',
        timeInTrade: ''
      });
      fetchEntries();
    } catch (error) {
      console.error("Error submitting entry: ", error);
    }
  };

  const handleEditEntry = (entry) => {
    setJournalEntry(entry);
    setEditMode(true);
  };

  const handleDeleteEntry = async (id) => {
    try {
      await deleteDoc(doc(db, 'tradingJournal', id));
      fetchEntries();
    } catch (error) {
      console.error("Error deleting entry: ", error);
    }
  };


  const showModal = (entry) => {
    setModalEntry(entry);
  };

  const closeModal = () => {
    setModalEntry(null);
  };

  const calculateStats = () => {
    if (entries.length === 0) {
      return {
        totalPnl: 0,
        profitFactor: 0,
        avgWin: 0,
        avgLoss: 0,
        winRate: 0,
        dailyPnl: [{ date: formatDate(new Date()), pnl: 0, entries: [] }]
      };
    }

    let totalPnl = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    let totalWinPnl = 0;
    let totalLossPnl = 0;
    let dailyPnl = {};

    entries.forEach(entry => {
      const pnlValue = parseFloat(stripCurrencySymbol(entry.pnl));
      if (!isNaN(pnlValue)) {
        totalPnl += pnlValue;
        if (pnlValue > 0) {
          winningTrades++;
          totalWinPnl += pnlValue;
        } else if (pnlValue < 0) {
          losingTrades++;
          totalLossPnl += pnlValue;
        }
        const entryDate = formatDate(entry.date);
        if (!dailyPnl[entryDate]) {
          dailyPnl[entryDate] = [];
        }
        dailyPnl[entryDate].push(pnlValue);
      }
    });

    const totalTrades = winningTrades + losingTrades;
    const winRate = totalTrades === 0 ? 0 : (winningTrades / totalTrades) * 100;
    const avgWin = winningTrades === 0 ? 0 : totalWinPnl / winningTrades;
    const avgLoss = losingTrades === 0 ? 0 : totalLossPnl / losingTrades;
    const profitFactor = totalLossPnl === 0 ? (totalWinPnl > 0 ? Infinity : 0) : totalWinPnl / Math.abs(totalLossPnl);

    return {
      totalPnl,
      profitFactor,
      avgWin,
      avgLoss,
      winRate,
      dailyPnl: Object.keys(dailyPnl).map(date => ({
        date,
        pnl: dailyPnl[date].reduce((acc, val) => acc + val, 0),
        entries: dailyPnl[date]
      }))
    };
  };

  const stats = calculateStats();

  const tileContent = ({ date }) => {
    const formattedDate = formatDate(date);
    const entriesOnDate = stats.dailyPnl.find(entry => entry.date === formattedDate);
    return (
      <div>
        {entriesOnDate?.entries.length > 0 ? (
          entriesOnDate.entries.map((pnl, index) => (
            <div key={index}>
              {`$${pnl.toFixed(2)}`}
            </div>
          ))
        ) : (
          <div></div>
        )}
      </div>
    );
  };

  return (
    <Section>
      <h2>Trading Dashboard</h2>
      <CardsContainer>
        <StatCard>
          <h3>Total P&L</h3>
          <p>${stats.totalPnl.toFixed(2)}</p>
        </StatCard>
        <StatCard>
          <h3>Profit Factor</h3>
          <p>{stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}</p>
        </StatCard>
        <StatCard>
          <h3>Average Winning Trade</h3>
          <p>${stats.avgWin.toFixed(2)}</p>
        </StatCard>
        <StatCard>
          <h3>Average Losing Trade</h3>
          <p>${stats.avgLoss.toFixed(2)}</p>
        </StatCard>
        <StatCard>
          <h3>Win Rate</h3>
          <p>{stats.winRate.toFixed(2)}%</p>
        </StatCard>
      </CardsContainer>
      <DashboardSection>
        <h3>Daily Net Cumulative P&L</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={stats.dailyPnl}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip
              content={({ payload }) => {
                if (payload && payload.length) {
                  return (
                    <div className="custom-tooltip">
                      <p>{`Date: ${payload[0].payload.date}`}</p>
                      <p>{`PnL: $${payload[0].payload.pnl.toFixed(2)}`}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="pnl" stroke="#8884d8" activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </DashboardSection>
      <StyledCalendar
        onChange={setDate}
        value={date}
        tileContent={tileContent}
      />
      <EntriesContainer>
        <h3>Trades on {entries.length > 0 ? date.toDateString() : 'No trades available'}</h3>
        {entries
          .filter(entry => new Date(entry.date).toDateString() === date.toDateString())
          .map((entry, index) => (
            <EntryCard key={entry.id}>
              <EntryField># {index + 1}</EntryField>
              <EntryField>{`Pair: ${entry.pair}`}</EntryField>
              <EntryField>{`P&L: ${entry.pnl}`}</EntryField>
              <Button onClick={() => showModal(entry)}>
                Show Details
              </Button>
              <EditButton onClick={() => handleEditEntry(entry)}>Edit Entry</EditButton>
              <DeleteButton onClick={() => handleDeleteEntry(entry.id)}>Delete Entry</DeleteButton>
            </EntryCard>
          ))}
      </EntriesContainer>
      <Form onSubmit={handleSubmit}>
        {FIELD_ORDER.map((field) => (
          field !== 'id' && field !== 'userId' && (
            <Input
              key={field}
              type={field === 'date' ? 'date' : 'text'}
              name={field}
              placeholder={field.replace(/([A-Z])/g, ' $1').toUpperCase()}
              value={journalEntry[field]}
              onChange={handleChange}
            />
          )
        ))}
        <Button type="submit">{editMode ? 'Update Entry' : 'Add Entry'}</Button>
      </Form>

      {/* Modal for showing details */}
      {modalEntry && (
        <ModalOverlay>
          <ModalContent>
            <ModalCloseButton onClick={closeModal}>×</ModalCloseButton>
            <h3>Entry Details</h3>
            {FIELD_ORDER.map((field) => (
              field !== 'id' && field !== 'userId' && (
                <EntryField key={field}>
                  <strong>{field.replace(/([A-Z])/g, ' $1').toUpperCase()}:</strong> {modalEntry[field]}
                </EntryField>
              )
            ))}
          </ModalContent>
        </ModalOverlay>
      )}
    </Section>
  );
};

export default TradingJournal;

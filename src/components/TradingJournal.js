import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { collection, getDocs, addDoc, query, where, doc, deleteDoc } from 'firebase/firestore';
import { db, auth, storage } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

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
  margin-top: 1rem;
  text-align: left;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
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
  font-size: 0.8rem;
  border-radius: 4px;
  &:hover {
    background-color: darkred;
  }
`;

const ImagePreview = styled.img`
  max-width: 100%;
  height: auto;
  margin-top: 0.5rem;
  border-radius: 8px;
  border: 2px solid #000;
`;

const ImageUploadLabel = styled.label`
  display: block;
  padding: 0.5rem;
  background-color: #000;
  color: #fff;
  text-align: center;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 0.5rem;
  &:hover {
    background-color: #333;
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

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
    timeInTrade: '',
    image: ''
  });
  const [expandedEntry, setExpandedEntry] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setJournalEntry({ ...journalEntry, [name]: value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let imageUrl = '';
    if (imageFile) {
      const storageRef = ref(storage, `images/${imageFile.name}`);
      const uploadTask = uploadBytesResumable(storageRef, imageFile);

      await new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          null,
          (error) => {
            console.error(error);
            reject(error);
          },
          async () => {
            imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve();
          }
        );
      });
    }

    await addDoc(collection(db, 'tradingJournal'), { ...journalEntry, userId: user.uid, image: imageUrl });
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
      timeInTrade: '',
      image: ''
    });
    setImageFile(null);
    setImagePreview(null);
    fetchEntries();
  };

  const handleDeleteEntry = async (entryId) => {
    await deleteDoc(doc(db, 'tradingJournal', entryId));
    fetchEntries();
  };

  const toggleEntry = (entryId) => {
    if (expandedEntry === entryId) {
      setExpandedEntry(null);
    } else {
      setExpandedEntry(entryId);
    }
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dayEntries = entries.filter(
        entry => new Date(entry.date).toDateString() === date.toDateString()
      );
      if (dayEntries.length) {
        const totalPnl = dayEntries.reduce((acc, entry) => {
          const pnlValue = parseFloat(stripCurrencySymbol(entry.pnl));
          return acc + (isNaN(pnlValue) ? 0 : pnlValue);
        }, 0);
        return <span>📈 PnL: {totalPnl.toFixed(2)}</span>;
      }
    }
  };

  const calculateStats = () => {
    if (entries.length === 0) {
      return {
        totalPnl: 0,
        profitFactor: 0,
        avgWin: 0,
        avgLoss: 0,
        winRate: 0,
        dailyPnl: [{ date: formatDate(new Date()), pnl: 0 }]
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
          dailyPnl[entryDate] = 0;
        }
        dailyPnl[entryDate] += pnlValue;
      }
    });

    const totalTrades = winningTrades + losingTrades;
    const winRate = totalTrades === 0 ? 0 : (winningTrades / totalTrades) * 100;
    const avgWin = winningTrades === 0 ? 0 : totalWinPnl / winningTrades;
    const avgLoss = losingTrades === 0 ? 0 : totalLossPnl / losingTrades;
    const profitFactor = totalLossPnl === 0 ? 0 : totalWinPnl / Math.abs(totalLossPnl);

    return {
      totalPnl,
      profitFactor,
      avgWin,
      avgLoss,
      winRate,
      dailyPnl: Object.keys(dailyPnl).map(date => ({ date, pnl: dailyPnl[date] }))
    };
  };

  const stats = calculateStats();

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
          <p>{stats.profitFactor.toFixed(2)}</p>
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
            <Tooltip />
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
              <EntryField>Pair: {entry.pair}</EntryField>
              <EntryField>PNL: ${entry.pnl}</EntryField>
              {entry.image && <ImagePreview src={entry.image} alt="entry" />}
              <Button onClick={() => toggleEntry(entry.id)}>
                {expandedEntry === entry.id ? 'Hide Details' : 'Show Details'}
              </Button>
              {expandedEntry === entry.id && (
                <>
                  {Object.keys(entry).map((key) => (
                    key !== 'userId' && key !== 'comments' && key !== 'image' && <EntryField key={key}>{`${key.replace(/([A-Z])/g, ' $1').toUpperCase()}: ${entry[key]}`}</EntryField>
                  ))}
                  <DeleteButton onClick={() => handleDeleteEntry(entry.id)}>Delete Entry</DeleteButton>
                </>
              )}
            </EntryCard>
          ))}
      </EntriesContainer>
      <Form onSubmit={handleSubmit}>
        {Object.keys(journalEntry).map((key) => (
          key !== 'image' && (
            <Input
              key={key}
              type={key === 'date' ? 'date' : 'text'}
              name={key}
              placeholder={key.replace(/([A-Z])/g, ' $1').toUpperCase()}
              value={journalEntry[key]}
              onChange={handleChange}
            />
          )
        ))}
        <ImageUploadLabel htmlFor="file-input">Upload Image</ImageUploadLabel>
        {imagePreview && <ImagePreview src={imagePreview} alt="preview" />}
        <HiddenFileInput id="file-input" type="file" onChange={handleImageChange} />
        <Button type="submit">Add Entry</Button>
      </Form>
    </Section>
  );
};

export default TradingJournal;

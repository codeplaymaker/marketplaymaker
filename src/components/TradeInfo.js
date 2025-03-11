import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Box, Typography, Card, CardContent, CircularProgress, Button, Stack } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import MetaApi from 'metaapi.cloud-sdk';

const ModernTradingDashboard = ({ userDetails }) => {
  const [trades, setTrades] = useState([]);
  const [filteredTrades, setFilteredTrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [balance, setBalance] = useState(20); // Initial balance is 20
  const [netPnL, setNetPnL] = useState(8.96); // Initial Net P&L is 8.96
  const [profitFactor, setProfitFactor] = useState(1); // Initial Profit Factor

  const fetchTrades = useCallback(async () => {
    const { apiToken, accountId } = userDetails;
    if (!apiToken || !accountId) {
      setError('API Token or Account ID is missing');
      return;
    }

    setLoading(true);
    try {
      const api = new MetaApi(apiToken);
      const account = await api.metatraderAccountApi.getAccount(accountId);
      if (account.state !== 'DEPLOYED') await account.deploy();
      await account.waitConnected(300000);

      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 90 * 24 * 60 * 60 * 1000); // Last 90 days

      const formatDate = (date) => date.toISOString().replace('T', ' ').slice(0, -5) + '.000';

      const response = await fetch(
        `https://metastats-api-v1.london.agiliumtrade.ai/users/current/accounts/${accountId}/historical-trades/${formatDate(startTime)}/${formatDate(endTime)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'auth-token': apiToken,
          },
        }
      );

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const { trades: fetchedTrades } = await response.json();

      const sortedTrades = fetchedTrades
        .sort((a, b) => new Date(b.closeTime || b.openTime) - new Date(a.closeTime || a.openTime))
        .slice(0, 100);

      setTrades(sortedTrades);
      setFilteredTrades(sortedTrades);
      updateCalendarEvents(sortedTrades);
      updateBalanceAndPnL(sortedTrades); // Update balance and P&L after fetching trades
    } catch (err) {
      setError(err.message || 'Error connecting to MetaApi');
    } finally {
      setLoading(false);
    }
  }, [userDetails]);

  const updateBalanceAndPnL = (trades) => {
    let totalProfit = 0;
    trades.forEach((trade) => {
      totalProfit += trade.profit;
    });

    setBalance(27.78 + totalProfit); // Adjust balance based on starting balance
    setNetPnL(7.78 + totalProfit); // Adjust Net P&L based on starting value

    // Calculate Profit Factor
    const totalGrossProfit = trades
      .filter((trade) => trade.profit > 0)
      .reduce((acc, trade) => acc + trade.profit, 0);

    const totalGrossLoss = trades
      .filter((trade) => trade.profit < 0)
      .reduce((acc, trade) => acc + trade.profit, 0);

    const calculatedProfitFactor = totalGrossProfit / Math.abs(totalGrossLoss);
    setProfitFactor(isNaN(calculatedProfitFactor) ? 1 : calculatedProfitFactor); // Set Profit Factor
  };

  const updateCalendarEvents = (trades) => {
    const tradeDays = {};

    trades.forEach((trade) => {
      const tradeDate = new Date(trade.openTime).toISOString().split('T')[0];

      if (!tradeDays[tradeDate]) {
        tradeDays[tradeDate] = { totalProfit: 0, totalTrades: 0 };
      }

      tradeDays[tradeDate].totalProfit += trade.profit;
      tradeDays[tradeDate].totalTrades += 1;
    });

    const events = Object.keys(tradeDays).map((date) => ({
      title: '', // No title to remove duplication
      date,
      backgroundColor: tradeDays[date].totalProfit > 0 ? '#4caf50' : '#f44336',
      textColor: '#ffffff',
      extendedProps: {
        totalProfit: tradeDays[date].totalProfit,
        totalTrades: tradeDays[date].totalTrades,
      },
    }));

    setCalendarEvents(events);
  };

  const chartData = useMemo(() => {
    return filteredTrades
      .slice()
      .sort((a, b) => new Date(a.openTime) - new Date(b.openTime)) // Sort by openTime (ascending)
      .map((trade) => ({
        name: new Date(trade.openTime).toLocaleDateString(),
        profit: trade.profit,
      }));
  }, [filteredTrades]);

  useEffect(() => {
    if (userDetails) fetchTrades();
  }, [userDetails, fetchTrades]);

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Trading Dashboard
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button variant="contained" onClick={() => setFilteredTrades(trades)}>
          All Trades
        </Button>
        <Button variant="outlined" onClick={() => setFilteredTrades(trades.filter((trade) => trade.profit > 0))}>
          Profitable Trades
        </Button>
        <Button variant="outlined" onClick={() => setFilteredTrades(trades.filter((trade) => trade.profit <= 0))}>
          Losses
        </Button>
      </Stack>

      {/* Trading Stats Below Dashboard */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="body1">
            Balance: <span style={{ color: 'black' }}>£{balance.toFixed(2)}</span>
          </Typography>
          <Typography variant="body1">
            Net P&L: <span style={{ color: '#4caf50' }}>£{netPnL.toFixed(2)}</span>
          </Typography>
          <Typography variant="body1">
            Profit Factor: {profitFactor.toFixed(2)}
          </Typography>
        </CardContent>
      </Card>

      {loading ? (
        <Box display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <>
          {/* Profit Trend Chart */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Profit Trend
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Line type="monotone" dataKey="profit" stroke="#4caf50" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Trading Calendar */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Trading Calendar
              </Typography>
              <Box sx={{ height: 500 }}>
                <FullCalendar
                  plugins={[dayGridPlugin]}
                  initialView="dayGridMonth"
                  events={calendarEvents}
                  height="100%"
                  contentHeight="auto"
                  headerToolbar={{ start: 'title', center: '', end: 'prev,next today' }}
                  eventDidMount={(info) => {
                    const totalProfit = info.event.extendedProps.totalProfit;
                    const totalTrades = info.event.extendedProps.totalTrades;

                    // Ensure only one text block (fix duplicate values)
                    info.el.innerHTML = `
                      <div style="text-align: center;">
                        <strong style="font-size: 16px; display: block;">${totalProfit >= 0 ? 'Profit' : 'Loss'}: £${totalProfit.toFixed(2)}</strong>
                        <span style="font-size: 12px;">Trades: ${totalTrades}</span>
                      </div>
                    `;
                    info.el.style.padding = '4px';
                    info.el.style.borderRadius = '4px';
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};

export default ModernTradingDashboard;

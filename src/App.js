import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './components/Homepage';
import News from './components/News'; // Update the import statement
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import Admin from './components/Admin';
import TradingJournal from './components/TradingJournal';
import TradingCalendar from './components/TradingCalendar';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './hooks/useAuth';
import Blog from './components/Blog';
import TelegramChat from './components/TelegramChat';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/news" element={<News />} /> {/* Update the path */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly={true}>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trading-journal"
            element={
              <ProtectedRoute>
                <TradingJournal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trading-calendar"
            element={
              <ProtectedRoute>
                <TradingCalendar />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

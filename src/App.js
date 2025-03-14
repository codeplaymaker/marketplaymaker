import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './components/Homepage';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import Admin from './components/Admin';
import TradingJournal from './components/TradingJournal';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './hooks/useAuth';
import Blog from './components/Blog';
import TradePlanComponent from './components/TradePlanComponent'; 
import UserApiForm from './components/UserApiForm'; 
import { ThemeProvider } from './components/ui/theme-provider';

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="marketplaymaker-theme">
      <AuthProvider>
        <Router>
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/blog" element={<Blog />} />
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
              path="/trade-plan"
              element={
                <ProtectedRoute>
                  <TradePlanComponent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/connect-api"
              element={
                <ProtectedRoute>
                  <UserApiForm />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

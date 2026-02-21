import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './hooks/useAuth';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';
import NotFound from './components/NotFound';
import { ThemeProvider } from './components/ui/theme-provider';

// Route-level code splitting
const HomePage = lazy(() => import('./components/Homepage'));
const Login = lazy(() => import('./components/Login'));
const Signup = lazy(() => import('./components/Signup'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const Admin = lazy(() => import('./components/Admin'));
const TradingJournal = lazy(() => import('./components/TradingJournal'));
const Blog = lazy(() => import('./components/Blog'));
const TradePlanComponent = lazy(() => import('./components/TradePlanComponent'));
const UserApiForm = lazy(() => import('./components/UserApiForm'));
const Polymarket = lazy(() => import('./components/Polymarket'));
const TrackRecord = lazy(() => import('./components/TrackRecord'));

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider defaultTheme="light" storageKey="marketplaymaker-theme">
        <ErrorBoundary>
          <AuthProvider>
            <Router>
              <Navbar />
              <Suspense fallback={<LoadingScreen />}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/track-record" element={<TrackRecord />} />
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
                  <Route path="/polymarket" element={
                    <ProtectedRoute>
                      <Polymarket />
                    </ProtectedRoute>
                  } />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </Router>
          </AuthProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;

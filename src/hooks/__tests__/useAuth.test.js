import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider, useAuth } from '../useAuth';

// Mock Firebase
jest.mock('../../firebase', () => ({
  auth: {},
  db: {},
}));

const mockOnAuthStateChanged = jest.fn();
const mockSignOut = jest.fn();

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args) => mockOnAuthStateChanged(...args),
  signOut: (...args) => mockSignOut(...args),
}));

const mockGetDoc = jest.fn();
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: (...args) => mockGetDoc(...args),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(),
}));

// Test component that consumes useAuth
const TestConsumer = () => {
  const { user, loading, error } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : 'null'}</span>
      <span data-testid="error">{error || 'none'}</span>
    </div>
  );
};

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDoc.mockResolvedValue({ exists: () => false });
    mockOnAuthStateChanged.mockImplementation((_, callback) => {
      callback(null);
      return jest.fn();
    });
  });

  it('throws if used outside AuthProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within an AuthProvider');
    spy.mockRestore();
  });

  it('starts in loading state and resolves to no user', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  it('sets user when auth state changes to logged in (no Firestore doc)', async () => {
    mockOnAuthStateChanged.mockImplementation((_, callback) => {
      callback({ uid: '123', email: 'test@example.com' });
      return jest.fn();
    });
    mockGetDoc.mockResolvedValue({ exists: () => false });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
  });

  it('merges Firestore data when user doc exists', async () => {
    mockOnAuthStateChanged.mockImplementation((_, callback) => {
      callback({ uid: '123', email: 'admin@example.com' });
      return jest.fn();
    });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ isAdmin: true, role: 'admin' }),
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('admin@example.com');
    });
  });

  it('sets user to null when auth callback fires with null', async () => {
    let authCallback;
    mockOnAuthStateChanged.mockImplementation((_, callback) => {
      authCallback = callback;
      // Start with a user
      callback({ uid: '123', email: 'test@example.com' });
      return jest.fn();
    });
    mockGetDoc.mockResolvedValue({ exists: () => false });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    });

    await act(async () => {
      authCallback(null);
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });
  });
});

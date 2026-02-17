import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadingScreen from '../LoadingScreen';

describe('LoadingScreen', () => {
  it('renders with loading indicator', () => {
    render(<LoadingScreen />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has accessible label', () => {
    render(<LoadingScreen />);

    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
  });

  it('includes screen reader text', () => {
    render(<LoadingScreen />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});

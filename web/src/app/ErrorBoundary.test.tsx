import { expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import { logger } from '../lib/logger';

test('ErrorBoundary catches errors and logs them', () => {
  const spy = vi.spyOn(logger, 'error').mockImplementation(() => {});
  // Suppress React's default console.error for uncaught errors
  const spyConsole = vi.spyOn(console, 'error').mockImplementation(() => {});

  const Thrower = () => { throw new Error('test error'); };
  
  render(
    <ErrorBoundary>
      <Thrower />
    </ErrorBoundary>
  );

  expect(screen.getByText(/Oops, there was an error/)).toBeTruthy();
  expect(spy).toHaveBeenCalled();

  spy.mockRestore();
  spyConsole.mockRestore();
});

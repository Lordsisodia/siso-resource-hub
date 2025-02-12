import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useStore } from '@/store/root-store';
import { Mock } from 'vitest';

// Reset store between tests
export const resetStore = () => {
  useStore.setState({
    theme: 'dark',
    isSidebarOpen: false,
    isModalOpen: false,
    slowThreshold: 100,
    isRecording: true,
    isInitialized: false,
    isLoading: false,
    error: null,
  });
};

// Custom render with providers
interface WrapperProps {
  children: React.ReactNode;
}

const AllTheProviders = ({ children }: WrapperProps) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
};

const customRender = (ui: React.ReactElement, options = {}) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Performance measurement mock helper
export const expectPerformanceMeasurement = (
  measureExecutionTime: Mock,
  expectedId: string,
  expectedType: string = 'event'
) => {
  expect(measureExecutionTime).toHaveBeenCalledWith(
    expect.any(Function),
    expectedId,
    expectedType,
    expect.any(Object)
  );
};

// Async utilities
export const waitForLoadingToFinish = async () => {
  const state = useStore.getState();
  if (!state.isLoading) return;
  
  return new Promise<void>((resolve) => {
    const unsubscribe = useStore.subscribe((state) => {
      if (!state.isLoading) {
        unsubscribe();
        resolve();
      }
    });
  });
}; 
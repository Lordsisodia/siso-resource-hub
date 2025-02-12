import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PerformanceDashboard } from './dashboard';
import { usePerformance } from '@/contexts/performance-context';
import type { Mock } from 'vitest';

// Mock performance context
vi.mock('@/contexts/performance-context', () => ({
  usePerformance: vi.fn(),
}));

// Mock performance utilities
vi.mock('@/utils/performance', () => ({
  measureExecutionTime: vi.fn((fn) => fn()),
}));

describe('PerformanceDashboard', () => {
  const mockMetrics = [
    {
      id: 'test-1',
      type: 'render',
      duration: 50,
      timestamp: new Date().toISOString(),
    },
    {
      id: 'test-2',
      type: 'query',
      duration: 150,
      timestamp: new Date().toISOString(),
    },
  ];

  const mockPerformanceContext = {
    metrics: mockMetrics,
    slowThreshold: 100,
    isRecording: true,
    clearMetrics: vi.fn(),
    setThreshold: vi.fn(),
    setRecording: vi.fn(),
    getAverageMetric: vi.fn((type) => type === 'render' ? 50 : 150),
    getSlowMetrics: vi.fn(() => [mockMetrics[1]]),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (usePerformance as Mock).mockReturnValue(mockPerformanceContext);
  });

  it('renders dashboard with metrics', () => {
    render(<PerformanceDashboard />);
    
    // Check metric cards
    expect(screen.getByText('Render Time')).toBeInTheDocument();
    expect(screen.getByText('50.00ms')).toBeInTheDocument();
    expect(screen.getByText('Query Time')).toBeInTheDocument();
    expect(screen.getByText('150.00ms')).toBeInTheDocument();
  });

  it('handles recording toggle', () => {
    render(<PerformanceDashboard />);
    
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);
    
    expect(mockPerformanceContext.setRecording).toHaveBeenCalledWith(false);
  });

  it('handles threshold change', () => {
    render(<PerformanceDashboard />);
    
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '200' } });
    
    expect(mockPerformanceContext.setThreshold).toHaveBeenCalledWith(200);
  });

  it('handles clear metrics with confirmation', () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    confirmSpy.mockImplementation(() => true);
    
    render(<PerformanceDashboard />);
    
    const clearButton = screen.getByText('Clear Metrics');
    fireEvent.click(clearButton);
    
    expect(confirmSpy).toHaveBeenCalled();
    expect(mockPerformanceContext.clearMetrics).toHaveBeenCalled();
    
    confirmSpy.mockRestore();
  });

  it('does not clear metrics when confirmation is cancelled', () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    confirmSpy.mockImplementation(() => false);
    
    render(<PerformanceDashboard />);
    
    const clearButton = screen.getByText('Clear Metrics');
    fireEvent.click(clearButton);
    
    expect(confirmSpy).toHaveBeenCalled();
    expect(mockPerformanceContext.clearMetrics).not.toHaveBeenCalled();
    
    confirmSpy.mockRestore();
  });

  it('shows empty state when no slow metrics', () => {
    mockPerformanceContext.getSlowMetrics.mockReturnValueOnce([]);
    
    render(<PerformanceDashboard />);
    
    expect(screen.getByText('No Slow Operations')).toBeInTheDocument();
    expect(screen.getByText(/All operations are performing within the threshold/)).toBeInTheDocument();
  });

  it('shows slow metrics when available', () => {
    render(<PerformanceDashboard />);
    
    expect(screen.getByText('test-2')).toBeInTheDocument();
    expect(screen.getByText('150.00ms')).toBeInTheDocument();
  });

  it('validates threshold input', () => {
    render(<PerformanceDashboard />);
    
    const input = screen.getByRole('spinbutton');
    
    // Invalid input
    fireEvent.change(input, { target: { value: '-100' } });
    expect(mockPerformanceContext.setThreshold).not.toHaveBeenCalled();
    
    // Valid input
    fireEvent.change(input, { target: { value: '100' } });
    expect(mockPerformanceContext.setThreshold).toHaveBeenCalledWith(100);
  });
}); 
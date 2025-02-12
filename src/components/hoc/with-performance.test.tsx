import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/utils';
import { withPerformance } from './with-performance';
import { useStore } from '@/store/root-store';
import { measureExecutionTime } from '@/utils/performance';

// Mock performance utilities
vi.mock('@/utils/performance', () => ({
  measureExecutionTime: vi.fn((fn) => fn()),
}));

// Mock component for testing
interface TestComponentProps {
  text: string;
  onClick?: () => void;
}

const TestComponent: React.FC<TestComponentProps> = ({ text, onClick }) => (
  <button onClick={onClick}>{text}</button>
);

describe('withPerformance HOC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({
      isRecording: true,
      slowThreshold: 100,
    });
  });

  it('should render the wrapped component with its props', () => {
    const EnhancedComponent = withPerformance(TestComponent, {
      name: 'TestComponent',
      trackProps: true,
      trackRenders: true,
    });

    render(<EnhancedComponent text="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should track prop changes when enabled', async () => {
    const EnhancedComponent = withPerformance(TestComponent, {
      name: 'TestComponent',
      trackProps: true,
    });

    const { rerender } = render(<EnhancedComponent text="Initial" />);
    rerender(<EnhancedComponent text="Updated" />);

    // Wait for next tick to allow effects to run
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verify the performance measurement was called
    expect(vi.mocked(measureExecutionTime)).toHaveBeenCalledWith(
      expect.any(Function),
      'TestComponent-props-changed',
      'event',
      expect.objectContaining({
        metadata: expect.objectContaining({
          changedProps: ['text'],
        }),
      })
    );
  });

  it('should not track prop changes when disabled', async () => {
    const EnhancedComponent = withPerformance(TestComponent, {
      name: 'TestComponent',
      trackProps: false,
    });

    const { rerender } = render(<EnhancedComponent text="Initial" />);
    rerender(<EnhancedComponent text="Updated" />);

    // Wait for next tick
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verify no performance measurement for props
    expect(vi.mocked(measureExecutionTime)).not.toHaveBeenCalledWith(
      expect.any(Function),
      'TestComponent-props-changed',
      expect.any(String),
      expect.any(Object)
    );
  });

  it('should track renders when enabled', async () => {
    const EnhancedComponent = withPerformance(TestComponent, {
      name: 'TestComponent',
      trackRenders: true,
    });

    render(<EnhancedComponent text="Test" />);

    // Wait for next tick
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verify render tracking
    expect(vi.mocked(measureExecutionTime)).toHaveBeenCalledWith(
      expect.any(Function),
      'TestComponent-render',
      'render',
      expect.any(Object)
    );
  });

  it('should not track when recording is disabled', async () => {
    useStore.setState({ isRecording: false });

    const EnhancedComponent = withPerformance(TestComponent, {
      name: 'TestComponent',
      trackProps: true,
      trackRenders: true,
    });

    const { rerender } = render(<EnhancedComponent text="Initial" />);
    rerender(<EnhancedComponent text="Updated" />);

    // Wait for next tick
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verify no measurements were taken
    expect(vi.mocked(measureExecutionTime)).not.toHaveBeenCalled();
  });

  it('should warn on slow renders', async () => {
    const consoleSpy = vi.spyOn(console, 'warn');
    const slowThreshold = 50;
    useStore.setState({ slowThreshold });

    const EnhancedComponent = withPerformance(TestComponent, {
      name: 'TestComponent',
      trackRenders: true,
    });

    // Mock Date.now to simulate slow render
    const originalNow = Date.now;
    const mockNow = vi.fn()
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(slowThreshold + 1);
    Date.now = mockNow;

    render(<EnhancedComponent text="Test" />);

    // Wait for next tick
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(`took ${slowThreshold + 1}ms to render`)
    );

    // Cleanup
    Date.now = originalNow;
    consoleSpy.mockRestore();
  });
}); 
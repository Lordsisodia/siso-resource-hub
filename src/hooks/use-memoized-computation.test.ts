import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMemoizedComputation } from './use-memoized-computation';
import { useStore } from '@/store/root-store';
import { measureExecutionTime } from '@/utils/performance';

// Mock performance utilities
vi.mock('@/utils/performance', () => ({
  measureExecutionTime: vi.fn((fn) => fn()),
}));

describe('useMemoizedComputation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({
      isRecording: true,
      slowThreshold: 100,
    });
  });

  it('should compute and return the result', () => {
    const computation = vi.fn(() => 42);
    const { result } = renderHook(() =>
      useMemoizedComputation(computation, {
        name: 'test',
        deps: [],
      })
    );

    expect(result.current).toBe(42);
    expect(computation).toHaveBeenCalledTimes(1);
  });

  it('should memoize the result based on dependencies', () => {
    const computation = vi.fn(() => 42);
    const { result, rerender } = renderHook(
      ({ value }) =>
        useMemoizedComputation(computation, {
          name: 'test',
          deps: [value],
        }),
      { initialProps: { value: 1 } }
    );

    expect(result.current).toBe(42);
    expect(computation).toHaveBeenCalledTimes(1);

    // Rerender with same value
    rerender({ value: 1 });
    expect(computation).toHaveBeenCalledTimes(1);

    // Rerender with different value
    rerender({ value: 2 });
    expect(computation).toHaveBeenCalledTimes(2);
  });

  it('should track performance when recording is enabled', () => {
    const computation = vi.fn(() => 42);
    renderHook(() =>
      useMemoizedComputation(computation, {
        name: 'test',
        deps: [],
      })
    );

    expect(measureExecutionTime).toHaveBeenCalledWith(
      expect.any(Function),
      'test-compute',
      'event',
      expect.any(Object)
    );
  });

  it('should not track performance when recording is disabled', () => {
    useStore.setState({ isRecording: false });

    const computation = vi.fn(() => 42);
    renderHook(() =>
      useMemoizedComputation(computation, {
        name: 'test',
        deps: [],
      })
    );

    expect(measureExecutionTime).not.toHaveBeenCalled();
  });

  it('should call onCompute callback with result and duration', () => {
    const onCompute = vi.fn();
    const computation = vi.fn(() => 42);

    // Mock Date.now to simulate computation duration
    const originalNow = Date.now;
    const mockNow = vi.fn()
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(50);
    Date.now = mockNow;

    renderHook(() =>
      useMemoizedComputation(computation, {
        name: 'test',
        deps: [],
        onCompute,
      })
    );

    expect(onCompute).toHaveBeenCalledWith(42, 50);

    // Cleanup
    Date.now = originalNow;
  });

  it('should warn on slow computations', () => {
    const consoleSpy = vi.spyOn(console, 'warn');
    const slowThreshold = 50;
    useStore.setState({ slowThreshold });

    const computation = vi.fn(() => 42);

    // Mock Date.now to simulate slow computation
    const originalNow = Date.now;
    const mockNow = vi.fn()
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(slowThreshold + 1);
    Date.now = mockNow;

    renderHook(() =>
      useMemoizedComputation(computation, {
        name: 'test',
        deps: [],
      })
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(`took ${slowThreshold + 1}ms`)
    );

    // Cleanup
    Date.now = originalNow;
    consoleSpy.mockRestore();
  });

  it('should track cache hits', async () => {
    const computation = vi.fn(() => 42);
    const { rerender } = renderHook(() =>
      useMemoizedComputation(computation, {
        name: 'test',
        deps: [],
        maxAge: 1000,
      })
    );

    // Wait for next tick to allow effects to run
    await new Promise(resolve => setTimeout(resolve, 0));

    rerender();

    expect(measureExecutionTime).toHaveBeenCalledWith(
      expect.any(Function),
      'test-cache-hit',
      'event',
      expect.any(Object)
    );
  });
}); 
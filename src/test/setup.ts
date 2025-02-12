import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Add type declarations for performance.memory
declare global {
  interface Performance {
    memory?: {
      jsHeapSizeLimit: number;
      totalJSHeapSize: number;
      usedJSHeapSize: number;
    };
  }
}

// Mock window.performance.memory
Object.defineProperty(window.performance, 'memory', {
  value: {
    jsHeapSizeLimit: 2172649472,
    totalJSHeapSize: 2172649472,
    usedJSHeapSize: 0,
  },
  configurable: true,
});

// Mock performance.now() for consistent testing
const performanceNow = vi.spyOn(performance, 'now');
let currentTime = 0;

performanceNow.mockImplementation(() => {
  currentTime += 10; // Increment by 10ms for each call
  return currentTime;
});

// Mock IntersectionObserver
class IntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserver,
});

// Mock ResizeObserver
class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: ResizeObserver,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock sessionStorage
const mockStorage: { [key: string]: string } = {};
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, value: string) => { mockStorage[key] = value; },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach(key => delete mockStorage[key]); },
  },
  writable: true,
});

// Reset mocks between tests
beforeEach(() => {
  currentTime = 0;
  Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
});

// Mock performance measurement
vi.mock('@/utils/performance', () => ({
  measureExecutionTime: vi.fn((fn) => fn()),
  PerformanceProfiler: ({ children }: { children: React.ReactNode }) => children,
}));

// Clean up after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
}); 
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { VirtualList } from './virtual-list';
import { useStore } from '@/store/root-store';

// Mock performance utilities
vi.mock('@/utils/performance', () => ({
  measureExecutionTime: vi.fn((fn) => fn()),
}));

// Mock intersection observer
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;

describe('VirtualList', () => {
  const mockData = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    title: `Item ${i}`,
  }));

  const renderItem = (item: typeof mockData[0]) => (
    <div data-testid={`item-${item.id}`}>{item.title}</div>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({
      isRecording: true,
      slowThreshold: 16,
    });
  });

  it('renders virtual list with initial items', () => {
    const { container } = render(
      <VirtualList
        data={mockData.slice(0, 10)}
        renderItem={renderItem}
        itemHeight={50}
      />
    );

    expect(container.querySelector('[data-testid="item-0"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="item-9"]')).toBeInTheDocument();
  });

  it('shows loading state when isLoading is true', () => {
    const { container } = render(
      <VirtualList
        data={mockData}
        renderItem={renderItem}
        itemHeight={50}
        isLoading={true}
        loadingItemCount={5}
      />
    );

    const skeletons = container.getElementsByClassName('skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('calls onEndReached when scrolling near bottom', async () => {
    const onEndReached = vi.fn();
    const { container } = render(
      <VirtualList
        data={mockData}
        renderItem={renderItem}
        itemHeight={50}
        onEndReached={onEndReached}
        endReachedThreshold={0.8}
      />
    );

    const virtualList = container.firstChild as HTMLElement;
    
    // Mock scroll event
    act(() => {
      Object.defineProperty(virtualList, 'scrollTop', { value: 800 });
      Object.defineProperty(virtualList, 'clientHeight', { value: 200 });
      Object.defineProperty(virtualList, 'scrollHeight', { value: 1000 });
      
      fireEvent.scroll(virtualList);
    });

    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 200));
    
    expect(onEndReached).toHaveBeenCalled();
  });

  it('uses custom keyExtractor when provided', () => {
    const keyExtractor = (item: typeof mockData[0]) => `custom-${item.id}`;
    const { container } = render(
      <VirtualList
        data={mockData.slice(0, 5)}
        renderItem={renderItem}
        itemHeight={50}
        keyExtractor={keyExtractor}
      />
    );

    const items = container.querySelectorAll('[data-index]');
    expect(items.length).toBeGreaterThan(0);
  });

  it('updates when data changes', () => {
    const { container, rerender } = render(
      <VirtualList
        data={mockData.slice(0, 5)}
        renderItem={renderItem}
        itemHeight={50}
      />
    );

    expect(container.querySelector('[data-testid="item-0"]')).toBeInTheDocument();

    const newData = [{ id: 999, title: 'New Item' }];
    rerender(
      <VirtualList
        data={newData}
        renderItem={renderItem}
        itemHeight={50}
      />
    );

    expect(container.querySelector('[data-testid="item-999"]')).toBeInTheDocument();
  });

  it('handles empty data array', () => {
    const { container } = render(
      <VirtualList
        data={[]}
        renderItem={renderItem}
        itemHeight={50}
      />
    );

    const items = container.querySelectorAll('[data-index]');
    expect(items.length).toBe(0);
  });
}); 
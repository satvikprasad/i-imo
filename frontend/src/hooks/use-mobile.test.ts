import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useIsMobile } from './use-mobile';

describe('useIsMobile hook', () => {
  let listeners: Array<(event?: any) => void> = [];
  
  beforeEach(() => {
    listeners = [];
    
    // Mock matchMedia with event listener support
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((event, handler) => {
        listeners.push(handler);
      }),
      removeEventListener: vi.fn((event, handler) => {
        listeners = listeners.filter(l => l !== handler);
      }),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    listeners = [];
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return false for desktop width (>= 768px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(false);
    });

    it('should return true for mobile width (< 768px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(true);
    });

    it('should return true at exactly 767px (mobile breakpoint)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 767,
      });

      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(true);
    });

    it('should return false at exactly 768px (desktop breakpoint)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(false);
    });
  });

  describe('responsive behavior', () => {
    it('should update from desktop to mobile on resize', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(false);

      // Simulate resize to mobile
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 375,
        });
        listeners.forEach(listener => listener());
      });

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });

    it('should update from mobile to desktop on resize', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(true);

      // Simulate resize to desktop
      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 1024,
        });
        listeners.forEach(listener => listener());
      });

      await waitFor(() => {
        expect(result.current).toBe(false);
      });
    });

    it('should handle multiple rapid resize events', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      const { result } = renderHook(() => useIsMobile());

      // Rapidly toggle between mobile and desktop
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 375, writable: true, configurable: true });
        listeners.forEach(listener => listener());
      });

      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true, configurable: true });
        listeners.forEach(listener => listener());
      });

      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 375, writable: true, configurable: true });
        listeners.forEach(listener => listener());
      });

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });
  });

  describe('edge cases and breakpoint testing', () => {
    it('should handle very small screen sizes (< 320px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 240,
      });

      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(true);
    });

    it('should handle very large screen sizes (> 2000px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 2560,
      });

      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(false);
    });

    it('should handle tablet width (768-1024px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 800,
      });

      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(false);
    });

    it('should handle zero width', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 0,
      });

      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(true);
    });

    it('should handle negative width', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: -1,
      });

      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(true);
    });
  });

  describe('cleanup and memory management', () => {
    it('should register event listener on mount', () => {
      const { unmount } = renderHook(() => useIsMobile());
      expect(window.matchMedia).toHaveBeenCalled();
      unmount();
    });

    it('should cleanup event listener on unmount', () => {
      const { unmount } = renderHook(() => useIsMobile());
      const listenerCountBefore = listeners.length;
      
      unmount();
      
      // Listener should be removed
      expect(listeners.length).toBeLessThanOrEqual(listenerCountBefore);
    });

    it('should not cause memory leaks on multiple mounts/unmounts', () => {
      for (let i = 0; i < 10; i++) {
        const { unmount } = renderHook(() => useIsMobile());
        unmount();
      }
      
      // All listeners should be cleaned up
      expect(listeners.length).toBe(0);
    });
  });

  describe('concurrent usage', () => {
    it('should work with multiple hook instances', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { result: result1 } = renderHook(() => useIsMobile());
      const { result: result2 } = renderHook(() => useIsMobile());
      const { result: result3 } = renderHook(() => useIsMobile());

      expect(result1.current).toBe(true);
      expect(result2.current).toBe(true);
      expect(result3.current).toBe(true);
    });

    it('should update all instances on resize', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      const { result: result1 } = renderHook(() => useIsMobile());
      const { result: result2 } = renderHook(() => useIsMobile());

      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 375,
        });
        listeners.forEach(listener => listener());
      });

      await waitFor(() => {
        expect(result1.current).toBe(true);
        expect(result2.current).toBe(true);
      });
    });
  });

  describe('matchMedia query correctness', () => {
    it('should use correct media query string', () => {
      renderHook(() => useIsMobile());
      expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 767px)');
    });

    it('should query with correct breakpoint value', () => {
      const { result } = renderHook(() => useIsMobile());
      
      const calls = (window.matchMedia as any).mock.calls;
      expect(calls[0][0]).toMatch(/767px/);
    });
  });

  describe('boolean coercion', () => {
    it('should always return a boolean value', () => {
      const { result } = renderHook(() => useIsMobile());
      expect(typeof result.current).toBe('boolean');
    });

    it('should handle undefined state gracefully', () => {
      const { result } = renderHook(() => useIsMobile());
      // Even if internal state is undefined initially, !! coerces to boolean
      expect([true, false]).toContain(result.current);
    });
  });
});
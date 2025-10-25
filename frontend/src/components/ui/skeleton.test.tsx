import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from './skeleton';

describe('Skeleton Component', () => {
  describe('rendering', () => {
    it('should render without crashing', () => {
      render(<Skeleton data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    });

    it('should render as a div element', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.tagName).toBe('DIV');
    });

    it('should have data-slot attribute', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveAttribute('data-slot', 'skeleton');
    });
  });

  describe('styling', () => {
    it('should apply default animation class', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.className).toContain('animate-pulse');
    });

    it('should apply default background class', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.className).toContain('bg-accent');
    });

    it('should apply rounded class', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.className).toContain('rounded-md');
    });

    it('should accept custom className', () => {
      render(<Skeleton className="h-4 w-full" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.className).toContain('h-4');
      expect(skeleton.className).toContain('w-full');
    });

    it('should merge custom classes with defaults', () => {
      render(<Skeleton className="h-8 w-32 rounded-full" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.className).toContain('animate-pulse');
      expect(skeleton.className).toContain('h-8');
      expect(skeleton.className).toContain('w-32');
    });
  });

  describe('use cases', () => {
    it('should render as text skeleton', () => {
      render(<Skeleton className="h-4 w-[250px]" data-testid="text-skeleton" />);
      const skeleton = screen.getByTestId('text-skeleton');
      expect(skeleton.className).toContain('h-4');
    });

    it('should render as circular skeleton', () => {
      render(<Skeleton className="h-12 w-12 rounded-full" data-testid="circle-skeleton" />);
      const skeleton = screen.getByTestId('circle-skeleton');
      expect(skeleton.className).toContain('h-12');
      expect(skeleton.className).toContain('w-12');
    });

    it('should render as card skeleton', () => {
      render(<Skeleton className="h-[200px] w-full" data-testid="card-skeleton" />);
      const skeleton = screen.getByTestId('card-skeleton');
      expect(skeleton.className).toContain('h-[200px]');
      expect(skeleton.className).toContain('w-full');
    });
  });

  describe('props forwarding', () => {
    it('should forward data attributes', () => {
      render(<Skeleton data-testid="skeleton" data-custom="value" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveAttribute('data-custom', 'value');
    });

    it('should forward aria attributes', () => {
      render(<Skeleton aria-label="Loading content" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading content');
    });

    it('should forward event handlers', () => {
      let clicked = false;
      render(<Skeleton onClick={() => { clicked = true; }} data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      skeleton.click();
      expect(clicked).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('should be keyboard accessible when interactive', () => {
      render(<Skeleton tabIndex={0} data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveAttribute('tabIndex', '0');
    });

    it('should support aria-busy for loading state', () => {
      render(<Skeleton aria-busy="true" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveAttribute('aria-busy', 'true');
    });

    it('should support role attribute', () => {
      render(<Skeleton role="status" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveAttribute('role', 'status');
    });
  });

  describe('edge cases', () => {
    it('should handle empty className', () => {
      render(<Skeleton className="" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.className).toContain('animate-pulse');
    });

    it('should handle undefined className', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.className).toContain('animate-pulse');
    });

    it('should render multiple skeletons independently', () => {
      render(
        <>
          <Skeleton data-testid="skeleton-1" className="h-4" />
          <Skeleton data-testid="skeleton-2" className="h-8" />
          <Skeleton data-testid="skeleton-3" className="h-12" />
        </>
      );
      
      expect(screen.getByTestId('skeleton-1')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-2')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-3')).toBeInTheDocument();
    });
  });
});
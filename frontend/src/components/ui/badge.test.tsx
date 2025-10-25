import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './badge';

describe('Badge Component', () => {
  describe('rendering', () => {
    it('should render without crashing', () => {
      render(<Badge>Badge</Badge>);
      expect(screen.getByText('Badge')).toBeInTheDocument();
    });

    it('should render children correctly', () => {
      render(<Badge>Test Content</Badge>);
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render as span by default', () => {
      render(<Badge data-testid="badge">Badge</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge.tagName).toBe('SPAN');
    });

    it('should have data-slot attribute', () => {
      render(<Badge data-testid="badge">Badge</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveAttribute('data-slot', 'badge');
    });
  });

  describe('variants', () => {
    it('should apply default variant', () => {
      render(<Badge data-testid="badge">Default</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('bg-primary');
      expect(badge.className).toContain('text-primary-foreground');
    });

    it('should apply secondary variant', () => {
      render(<Badge variant="secondary" data-testid="badge">Secondary</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('bg-secondary');
      expect(badge.className).toContain('text-secondary-foreground');
    });

    it('should apply destructive variant', () => {
      render(<Badge variant="destructive" data-testid="badge">Destructive</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('bg-destructive');
      expect(badge.className).toContain('text-white');
    });

    it('should apply outline variant', () => {
      render(<Badge variant="outline" data-testid="badge">Outline</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('text-foreground');
    });
  });

  describe('asChild prop', () => {
    it('should render as child component when asChild is true', () => {
      render(
        <Badge asChild data-testid="badge-link">
          <a href="/test">Link Badge</a>
        </Badge>
      );
      const badge = screen.getByTestId('badge-link');
      expect(badge.tagName).toBe('A');
      expect(badge).toHaveAttribute('href', '/test');
    });

    it('should apply badge styles to child component', () => {
      render(
        <Badge asChild variant="secondary" data-testid="badge-button">
          <button type="button">Button Badge</button>
        </Badge>
      );
      const badge = screen.getByTestId('badge-button');
      expect(badge.tagName).toBe('BUTTON');
      expect(badge.className).toContain('bg-secondary');
    });
  });

  describe('styling', () => {
    it('should apply base styles', () => {
      render(<Badge data-testid="badge">Badge</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('inline-flex');
      expect(badge.className).toContain('items-center');
      expect(badge.className).toContain('justify-center');
      expect(badge.className).toContain('rounded-md');
    });

    it('should accept custom className', () => {
      render(<Badge className="custom-class" data-testid="badge">Badge</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('custom-class');
    });

    it('should merge custom className with variant styles', () => {
      render(
        <Badge variant="destructive" className="text-lg font-bold" data-testid="badge">
          Badge
        </Badge>
      );
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('bg-destructive');
      expect(badge.className).toContain('text-lg');
      expect(badge.className).toContain('font-bold');
    });
  });

  describe('with icons', () => {
    it('should render with icon', () => {
      render(
        <Badge data-testid="badge">
          <svg data-testid="icon" />
          <span>With Icon</span>
        </Badge>
      );
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('With Icon')).toBeInTheDocument();
    });

    it('should apply icon sizing classes', () => {
      render(<Badge data-testid="badge">Badge</Badge>);
      const badge = screen.getByTestId('badge');
      // Check for SVG sizing in className pattern
      expect(badge.className).toContain('size-3');
    });
  });

  describe('accessibility', () => {
    it('should support aria-label', () => {
      render(<Badge aria-label="Status badge" data-testid="badge">New</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveAttribute('aria-label', 'Status badge');
    });

    it('should support role attribute', () => {
      render(<Badge role="status" data-testid="badge">Live</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveAttribute('role', 'status');
    });

    it('should be keyboard focusable with tabIndex', () => {
      render(<Badge tabIndex={0} data-testid="badge">Badge</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('interactive states', () => {
    it('should support focus-visible styles', () => {
      render(<Badge data-testid="badge">Badge</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('focus-visible:border-ring');
      expect(badge.className).toContain('focus-visible:ring-ring/50');
    });

    it('should support aria-invalid state', () => {
      render(<Badge aria-invalid="true" data-testid="badge">Badge</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveAttribute('aria-invalid', 'true');
      expect(badge.className).toContain('aria-invalid:border-destructive');
    });
  });

  describe('props forwarding', () => {
    it('should forward data attributes', () => {
      render(<Badge data-testid="badge" data-value="123">Badge</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveAttribute('data-value', '123');
    });

    it('should forward event handlers', () => {
      let clicked = false;
      render(
        <Badge onClick={() => { clicked = true; }} data-testid="badge">
          Clickable
        </Badge>
      );
      screen.getByTestId('badge').click();
      expect(clicked).toBe(true);
    });

    it('should forward ref when using asChild', () => {
      const ref = { current: null };
      render(
        <Badge asChild>
          <button ref={ref as any} type="button">Button</button>
        </Badge>
      );
      expect(ref.current).not.toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      render(<Badge data-testid="badge" />);
      const badge = screen.getByTestId('badge');
      expect(badge).toBeInTheDocument();
    });

    it('should handle very long text', () => {
      const longText = 'This is a very long badge text that might overflow';
      render(<Badge data-testid="badge">{longText}</Badge>);
      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('should handle multiple badges', () => {
      render(
        <>
          <Badge data-testid="badge-1">Badge 1</Badge>
          <Badge data-testid="badge-2" variant="secondary">Badge 2</Badge>
          <Badge data-testid="badge-3" variant="outline">Badge 3</Badge>
        </>
      );
      expect(screen.getByTestId('badge-1')).toBeInTheDocument();
      expect(screen.getByTestId('badge-2')).toBeInTheDocument();
      expect(screen.getByTestId('badge-3')).toBeInTheDocument();
    });

    it('should handle nested elements', () => {
      render(
        <Badge data-testid="badge">
          <span>Nested</span>
          <strong>Content</strong>
        </Badge>
      );
      expect(screen.getByText('Nested')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });
});
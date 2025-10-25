import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button Component', () => {
  describe('rendering', () => {
    it('should render without crashing', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render children correctly', () => {
      render(<Button>Test Button</Button>);
      expect(screen.getByText('Test Button')).toBeInTheDocument();
    });

    it('should render as button by default', () => {
      render(<Button data-testid="button">Button</Button>);
      const button = screen.getByTestId('button');
      expect(button.tagName).toBe('BUTTON');
    });
  });

  describe('variants', () => {
    it('should apply default variant', () => {
      render(<Button data-testid="button">Default</Button>);
      const button = screen.getByTestId('button');
      expect(button.className).toContain('bg-primary');
      expect(button.className).toContain('text-primary-foreground');
    });

    it('should apply destructive variant', () => {
      render(<Button variant="destructive" data-testid="button">Delete</Button>);
      const button = screen.getByTestId('button');
      expect(button.className).toContain('bg-destructive');
    });

    it('should apply outline variant', () => {
      render(<Button variant="outline" data-testid="button">Outline</Button>);
      const button = screen.getByTestId('button');
      expect(button.className).toContain('border');
      expect(button.className).toContain('bg-background');
    });

    it('should apply secondary variant', () => {
      render(<Button variant="secondary" data-testid="button">Secondary</Button>);
      const button = screen.getByTestId('button');
      expect(button.className).toContain('bg-secondary');
    });

    it('should apply ghost variant', () => {
      render(<Button variant="ghost" data-testid="button">Ghost</Button>);
      const button = screen.getByTestId('button');
      expect(button.className).toContain('hover:bg-accent');
    });

    it('should apply link variant', () => {
      render(<Button variant="link" data-testid="button">Link</Button>);
      const button = screen.getByTestId('button');
      expect(button.className).toContain('text-primary');
      expect(button.className).toContain('underline-offset-4');
    });
  });

  describe('sizes', () => {
    it('should apply default size', () => {
      render(<Button data-testid="button">Default</Button>);
      const button = screen.getByTestId('button');
      expect(button.className).toContain('h-9');
    });

    it('should apply small size', () => {
      render(<Button size="sm" data-testid="button">Small</Button>);
      const button = screen.getByTestId('button');
      expect(button.className).toContain('h-8');
    });

    it('should apply large size', () => {
      render(<Button size="lg" data-testid="button">Large</Button>);
      const button = screen.getByTestId('button');
      expect(button.className).toContain('h-10');
    });

    it('should apply icon size', () => {
      render(<Button size="icon" data-testid="button">🔥</Button>);
      const button = screen.getByTestId('button');
      expect(button.className).toContain('size-9');
    });

    it('should apply icon-sm size', () => {
      render(<Button size="icon-sm" data-testid="button">🔥</Button>);
      const button = screen.getByTestId('button');
      expect(button.className).toContain('size-8');
    });

    it('should apply icon-lg size', () => {
      render(<Button size="icon-lg" data-testid="button">🔥</Button>);
      const button = screen.getByTestId('button');
      expect(button.className).toContain('size-10');
    });
  });

  describe('asChild prop', () => {
    it('should render as child component when asChild is true', () => {
      render(
        <Button asChild data-testid="button-link">
          <a href="/test">Link Button</a>
        </Button>
      );
      const button = screen.getByTestId('button-link');
      expect(button.tagName).toBe('A');
      expect(button).toHaveAttribute('href', '/test');
    });

    it('should apply button styles to child component', () => {
      render(
        <Button asChild variant="destructive" data-testid="button-link">
          <a href="/delete">Delete Link</a>
        </Button>
      );
      const button = screen.getByTestId('button-link');
      expect(button.className).toContain('bg-destructive');
    });
  });

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should apply disabled styles', () => {
      render(<Button disabled data-testid="button">Disabled</Button>);
      const button = screen.getByTestId('button');
      expect(button.className).toContain('disabled:pointer-events-none');
      expect(button.className).toContain('disabled:opacity-50');
    });

    it('should not be clickable when disabled', () => {
      let clicked = false;
      render(
        <Button disabled onClick={() => { clicked = true; }}>
          Disabled
        </Button>
      );
      screen.getByRole('button').click();
      expect(clicked).toBe(false);
    });
  });

  describe('styling', () => {
    it('should accept custom className', () => {
      render(<Button className="custom-class" data-testid="button">Button</Button>);
      const button = screen.getByTestId('button');
      expect(button.className).toContain('custom-class');
    });

    it('should merge custom className with variants', () => {
      render(
        <Button variant="outline" size="lg" className="w-full" data-testid="button">
          Custom
        </Button>
      );
      const button = screen.getByTestId('button');
      expect(button.className).toContain('border');
      expect(button.className).toContain('h-10');
      expect(button.className).toContain('w-full');
    });

    it('should apply focus-visible styles', () => {
      render(<Button data-testid="button">Button</Button>);
      const button = screen.getByTestId('button');
      expect(button.className).toContain('focus-visible:border-ring');
      expect(button.className).toContain('focus-visible:ring-ring/50');
    });
  });

  describe('with icons', () => {
    it('should render with icon and text', () => {
      render(
        <Button data-testid="button">
          <svg data-testid="icon" />
          <span>With Icon</span>
        </Button>
      );
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('With Icon')).toBeInTheDocument();
    });

    it('should apply gap for icon spacing', () => {
      render(<Button data-testid="button">Button</Button>);
      const button = screen.getByTestId('button');
      expect(button.className).toContain('gap-2');
    });
  });

  describe('accessibility', () => {
    it('should have proper button role', () => {
      render(<Button>Button</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should support aria-label', () => {
      render(<Button aria-label="Close dialog">×</Button>);
      expect(screen.getByLabelText('Close dialog')).toBeInTheDocument();
    });

    it('should support aria-pressed for toggle buttons', () => {
      render(<Button aria-pressed="true" data-testid="button">Toggle</Button>);
      const button = screen.getByTestId('button');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    it('should support aria-expanded for menu buttons', () => {
      render(<Button aria-expanded="false" data-testid="button">Menu</Button>);
      const button = screen.getByTestId('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('should be keyboard accessible', () => {
      render(<Button>Button</Button>);
      const button = screen.getByRole('button');
      button.focus();
      expect(document.activeElement).toBe(button);
    });
  });

  describe('type attribute', () => {
    it('should default to button type when not specified', () => {
      render(<Button data-testid="button">Button</Button>);
      const button = screen.getByTestId('button');
      // Button should not submit forms by default
      expect(button).toHaveAttribute('type');
    });

    it('should accept custom type', () => {
      render(<Button type="submit" data-testid="button">Submit</Button>);
      const button = screen.getByTestId('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should accept reset type', () => {
      render(<Button type="reset" data-testid="button">Reset</Button>);
      const button = screen.getByTestId('button');
      expect(button).toHaveAttribute('type', 'reset');
    });
  });

  describe('event handlers', () => {
    it('should handle onClick', () => {
      let clicked = false;
      render(<Button onClick={() => { clicked = true; }}>Click me</Button>);
      screen.getByRole('button').click();
      expect(clicked).toBe(true);
    });

    it('should handle onFocus', () => {
      let focused = false;
      render(<Button onFocus={() => { focused = true; }}>Button</Button>);
      screen.getByRole('button').focus();
      expect(focused).toBe(true);
    });

    it('should handle onBlur', () => {
      let blurred = false;
      render(<Button onBlur={() => { blurred = true; }}>Button</Button>);
      const button = screen.getByRole('button');
      button.focus();
      button.blur();
      expect(blurred).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      render(<Button data-testid="button" />);
      const button = screen.getByTestId('button');
      expect(button).toBeInTheDocument();
    });

    it('should handle very long text', () => {
      const longText = 'This is a very long button text that might need wrapping';
      render(<Button>{longText}</Button>);
      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('should handle multiple buttons', () => {
      render(
        <>
          <Button data-testid="button-1">Button 1</Button>
          <Button data-testid="button-2">Button 2</Button>
          <Button data-testid="button-3">Button 3</Button>
        </>
      );
      expect(screen.getByTestId('button-1')).toBeInTheDocument();
      expect(screen.getByTestId('button-2')).toBeInTheDocument();
      expect(screen.getByTestId('button-3')).toBeInTheDocument();
    });

    it('should handle nested elements', () => {
      render(
        <Button>
          <span>Nested</span>
          <strong>Content</strong>
        </Button>
      );
      expect(screen.getByText('Nested')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('combination of props', () => {
    it('should handle variant and size together', () => {
      render(
        <Button variant="destructive" size="lg" data-testid="button">
          Large Delete
        </Button>
      );
      const button = screen.getByTestId('button');
      expect(button.className).toContain('bg-destructive');
      expect(button.className).toContain('h-10');
    });

    it('should handle all styling props', () => {
      render(
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled
          data-testid="button"
        >
          Complex Button
        </Button>
      );
      const button = screen.getByTestId('button');
      expect(button).toBeDisabled();
      expect(button.className).toContain('border');
      expect(button.className).toContain('h-8');
      expect(button.className).toContain('w-full');
    });
  });
});
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from './spinner';

describe('Spinner Component', () => {
  describe('rendering', () => {
    it('should render without crashing', () => {
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('should have proper ARIA role', () => {
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('role', 'status');
    });

    it('should have ARIA label', () => {
      render(<Spinner />);
      const spinner = screen.getByLabelText('Loading');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply default animation class', () => {
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      expect(spinner.className).toContain('animate-spin');
    });

    it('should apply default size class', () => {
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      expect(spinner.className).toContain('size-4');
    });

    it('should accept custom className', () => {
      render(<Spinner className="custom-class" />);
      const spinner = screen.getByRole('status');
      expect(spinner.className).toContain('custom-class');
    });

    it('should merge custom className with defaults', () => {
      render(<Spinner className="text-red-500 size-8" />);
      const spinner = screen.getByRole('status');
      expect(spinner.className).toContain('animate-spin');
      expect(spinner.className).toContain('text-red-500');
    });
  });

  describe('accessibility', () => {
    it('should be accessible to screen readers', () => {
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAccessibleName('Loading');
    });

    it('should communicate loading state', () => {
      render(<Spinner aria-label="Loading content" />);
      const spinner = screen.getByLabelText('Loading content');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('props forwarding', () => {
    it('should forward additional props', () => {
      render(<Spinner data-testid="custom-spinner" />);
      const spinner = screen.getByTestId('custom-spinner');
      expect(spinner).toBeInTheDocument();
    });

    it('should forward aria attributes', () => {
      render(<Spinner aria-busy="true" />);
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('aria-busy', 'true');
    });

    it('should allow custom aria-label override', () => {
      render(<Spinner aria-label="Processing..." />);
      const spinner = screen.getByLabelText('Processing...');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle empty className', () => {
      render(<Spinner className="" />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('should handle multiple custom classes', () => {
      render(<Spinner className="text-blue-500 size-6 opacity-75" />);
      const spinner = screen.getByRole('status');
      expect(spinner.className).toContain('text-blue-500');
      expect(spinner.className).toContain('opacity-75');
    });
  });
});
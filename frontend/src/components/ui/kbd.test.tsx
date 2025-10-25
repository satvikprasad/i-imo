import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Kbd, KbdGroup } from './kbd';

describe('Kbd Component', () => {
  describe('rendering', () => {
    it('should render without crashing', () => {
      render(<Kbd data-testid="kbd">Ctrl</Kbd>);
      expect(screen.getByTestId('kbd')).toBeInTheDocument();
    });

    it('should render children correctly', () => {
      render(<Kbd>⌘</Kbd>);
      expect(screen.getByText('⌘')).toBeInTheDocument();
    });

    it('should render as kbd element', () => {
      render(<Kbd data-testid="kbd">K</Kbd>);
      const kbd = screen.getByTestId('kbd');
      expect(kbd.tagName).toBe('KBD');
    });

    it('should have data-slot attribute', () => {
      render(<Kbd data-testid="kbd">K</Kbd>);
      const kbd = screen.getByTestId('kbd');
      expect(kbd).toHaveAttribute('data-slot', 'kbd');
    });
  });

  describe('styling', () => {
    it('should apply default styles', () => {
      render(<Kbd data-testid="kbd">K</Kbd>);
      const kbd = screen.getByTestId('kbd');
      expect(kbd.className).toContain('bg-muted');
      expect(kbd.className).toContain('text-muted-foreground');
      expect(kbd.className).toContain('rounded-sm');
    });

    it('should accept custom className', () => {
      render(<Kbd className="custom-class" data-testid="kbd">K</Kbd>);
      const kbd = screen.getByTestId('kbd');
      expect(kbd.className).toContain('custom-class');
    });

    it('should merge custom className with defaults', () => {
      render(<Kbd className="text-lg" data-testid="kbd">K</Kbd>);
      const kbd = screen.getByTestId('kbd');
      expect(kbd.className).toContain('bg-muted');
      expect(kbd.className).toContain('text-lg');
    });

    it('should have inline-flex display', () => {
      render(<Kbd data-testid="kbd">K</Kbd>);
      const kbd = screen.getByTestId('kbd');
      expect(kbd.className).toContain('inline-flex');
    });

    it('should have proper sizing', () => {
      render(<Kbd data-testid="kbd">K</Kbd>);
      const kbd = screen.getByTestId('kbd');
      expect(kbd.className).toContain('h-5');
      expect(kbd.className).toContain('min-w-5');
    });
  });

  describe('common keyboard keys', () => {
    it('should render Command key', () => {
      render(<Kbd>⌘</Kbd>);
      expect(screen.getByText('⌘')).toBeInTheDocument();
    });

    it('should render Control key', () => {
      render(<Kbd>Ctrl</Kbd>);
      expect(screen.getByText('Ctrl')).toBeInTheDocument();
    });

    it('should render Shift key', () => {
      render(<Kbd>Shift</Kbd>);
      expect(screen.getByText('Shift')).toBeInTheDocument();
    });

    it('should render Alt/Option key', () => {
      render(<Kbd>⌥</Kbd>);
      expect(screen.getByText('⌥')).toBeInTheDocument();
    });

    it('should render Enter key', () => {
      render(<Kbd>↵</Kbd>);
      expect(screen.getByText('↵')).toBeInTheDocument();
    });

    it('should render single letter key', () => {
      render(<Kbd>K</Kbd>);
      expect(screen.getByText('K')).toBeInTheDocument();
    });
  });

  describe('with icons', () => {
    it('should render with SVG icon', () => {
      render(
        <Kbd data-testid="kbd">
          <svg data-testid="icon" />
        </Kbd>
      );
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('should apply icon sizing', () => {
      render(<Kbd data-testid="kbd">K</Kbd>);
      const kbd = screen.getByTestId('kbd');
      // Check for SVG sizing in className pattern
      expect(kbd.className).toMatch(/size-3/);
    });
  });

  describe('accessibility', () => {
    it('should be semantic kbd element', () => {
      render(<Kbd data-testid="kbd">K</Kbd>);
      const kbd = screen.getByTestId('kbd');
      expect(kbd.tagName).toBe('KBD');
    });

    it('should support aria-label', () => {
      render(<Kbd aria-label="Command key" data-testid="kbd">⌘</Kbd>);
      const kbd = screen.getByTestId('kbd');
      expect(kbd).toHaveAttribute('aria-label', 'Command key');
    });

    it('should be non-selectable', () => {
      render(<Kbd data-testid="kbd">K</Kbd>);
      const kbd = screen.getByTestId('kbd');
      expect(kbd.className).toContain('select-none');
    });
  });

  describe('props forwarding', () => {
    it('should forward data attributes', () => {
      render(<Kbd data-testid="kbd" data-key="k">K</Kbd>);
      const kbd = screen.getByTestId('kbd');
      expect(kbd).toHaveAttribute('data-key', 'k');
    });

    it('should forward title attribute', () => {
      render(<Kbd title="Keyboard shortcut" data-testid="kbd">K</Kbd>);
      const kbd = screen.getByTestId('kbd');
      expect(kbd).toHaveAttribute('title', 'Keyboard shortcut');
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      render(<Kbd data-testid="kbd" />);
      const kbd = screen.getByTestId('kbd');
      expect(kbd).toBeInTheDocument();
    });

    it('should handle multiple characters', () => {
      render(<Kbd>Ctrl+K</Kbd>);
      expect(screen.getByText('Ctrl+K')).toBeInTheDocument();
    });

    it('should handle nested elements', () => {
      render(
        <Kbd data-testid="kbd">
          <span>Cmd</span>
          <span>K</span>
        </Kbd>
      );
      expect(screen.getByText('Cmd')).toBeInTheDocument();
      expect(screen.getByText('K')).toBeInTheDocument();
    });
  });
});

describe('KbdGroup Component', () => {
  describe('rendering', () => {
    it('should render without crashing', () => {
      render(<KbdGroup data-testid="kbd-group" />);
      expect(screen.getByTestId('kbd-group')).toBeInTheDocument();
    });

    it('should render as kbd element', () => {
      render(<KbdGroup data-testid="kbd-group" />);
      const group = screen.getByTestId('kbd-group');
      expect(group.tagName).toBe('KBD');
    });

    it('should have data-slot attribute', () => {
      render(<KbdGroup data-testid="kbd-group" />);
      const group = screen.getByTestId('kbd-group');
      expect(group).toHaveAttribute('data-slot', 'kbd-group');
    });

    it('should render children correctly', () => {
      render(
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      );
      expect(screen.getByText('⌘')).toBeInTheDocument();
      expect(screen.getByText('K')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply flex layout', () => {
      render(<KbdGroup data-testid="kbd-group" />);
      const group = screen.getByTestId('kbd-group');
      expect(group.className).toContain('inline-flex');
      expect(group.className).toContain('items-center');
    });

    it('should apply gap between items', () => {
      render(<KbdGroup data-testid="kbd-group" />);
      const group = screen.getByTestId('kbd-group');
      expect(group.className).toContain('gap-1');
    });

    it('should accept custom className', () => {
      render(<KbdGroup className="custom-class" data-testid="kbd-group" />);
      const group = screen.getByTestId('kbd-group');
      expect(group.className).toContain('custom-class');
    });
  });

  describe('keyboard shortcuts', () => {
    it('should render single modifier shortcut', () => {
      render(
        <KbdGroup data-testid="kbd-group">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      );
      expect(screen.getByText('⌘')).toBeInTheDocument();
      expect(screen.getByText('K')).toBeInTheDocument();
    });

    it('should render complex shortcut with multiple modifiers', () => {
      render(
        <KbdGroup data-testid="kbd-group">
          <Kbd>⌘</Kbd>
          <Kbd>Shift</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      );
      expect(screen.getByText('⌘')).toBeInTheDocument();
      expect(screen.getByText('Shift')).toBeInTheDocument();
      expect(screen.getByText('K')).toBeInTheDocument();
    });

    it('should render with separator text', () => {
      render(
        <KbdGroup data-testid="kbd-group">
          <Kbd>Ctrl</Kbd>
          <span>+</span>
          <Kbd>K</Kbd>
        </KbdGroup>
      );
      expect(screen.getByText('Ctrl')).toBeInTheDocument();
      expect(screen.getByText('+')).toBeInTheDocument();
      expect(screen.getByText('K')).toBeInTheDocument();
    });
  });

  describe('props forwarding', () => {
    it('should forward data attributes', () => {
      render(<KbdGroup data-testid="kbd-group" data-shortcut="cmd-k" />);
      const group = screen.getByTestId('kbd-group');
      expect(group).toHaveAttribute('data-shortcut', 'cmd-k');
    });

    it('should forward aria attributes', () => {
      render(<KbdGroup aria-label="Keyboard shortcut" data-testid="kbd-group" />);
      const group = screen.getByTestId('kbd-group');
      expect(group).toHaveAttribute('aria-label', 'Keyboard shortcut');
    });
  });

  describe('edge cases', () => {
    it('should handle empty group', () => {
      render(<KbdGroup data-testid="kbd-group" />);
      const group = screen.getByTestId('kbd-group');
      expect(group).toBeInTheDocument();
    });

    it('should handle single kbd in group', () => {
      render(
        <KbdGroup data-testid="kbd-group">
          <Kbd>K</Kbd>
        </KbdGroup>
      );
      expect(screen.getByText('K')).toBeInTheDocument();
    });

    it('should handle many keys in group', () => {
      render(
        <KbdGroup data-testid="kbd-group">
          <Kbd>⌘</Kbd>
          <Kbd>Shift</Kbd>
          <Kbd>Ctrl</Kbd>
          <Kbd>Alt</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      );
      expect(screen.getByTestId('kbd-group').children).toHaveLength(5);
    });
  });
});
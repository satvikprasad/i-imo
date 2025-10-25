import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './input';

describe('Input Component', () => {
  describe('rendering', () => {
    it('should render without crashing', () => {
      render(<Input data-testid="input" />);
      expect(screen.getByTestId('input')).toBeInTheDocument();
    });

    it('should render as input element', () => {
      render(<Input data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input.tagName).toBe('INPUT');
    });

    it('should have data-slot attribute', () => {
      render(<Input data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('data-slot', 'input');
    });

    it('should render with placeholder', () => {
      render(<Input placeholder="Enter text" data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('placeholder', 'Enter text');
    });
  });

  describe('types', () => {
    it('should default to text type', () => {
      render(<Input data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('should accept email type', () => {
      render(<Input type="email" data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('should accept password type', () => {
      render(<Input type="password" data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('type', 'password');
    });

    it('should accept number type', () => {
      render(<Input type="number" data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('type', 'number');
    });

    it('should accept tel type', () => {
      render(<Input type="tel" data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('type', 'tel');
    });

    it('should accept url type', () => {
      render(<Input type="url" data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('type', 'url');
    });

    it('should accept search type', () => {
      render(<Input type="search" data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('type', 'search');
    });

    it('should accept date type', () => {
      render(<Input type="date" data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('type', 'date');
    });

    it('should accept file type', () => {
      render(<Input type="file" data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('type', 'file');
    });
  });

  describe('styling', () => {
    it('should apply default styles', () => {
      render(<Input data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input.className).toContain('h-9');
      expect(input.className).toContain('w-full');
      expect(input.className).toContain('rounded-md');
      expect(input.className).toContain('border');
    });

    it('should accept custom className', () => {
      render(<Input className="custom-class" data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input.className).toContain('custom-class');
    });

    it('should merge custom className with defaults', () => {
      render(<Input className="text-lg font-bold" data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input.className).toContain('h-9');
      expect(input.className).toContain('text-lg');
      expect(input.className).toContain('font-bold');
    });

    it('should apply focus-visible styles', () => {
      render(<Input data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input.className).toContain('focus-visible:border-ring');
      expect(input.className).toContain('focus-visible:ring-ring/50');
    });

    it('should apply disabled styles', () => {
      render(<Input data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input.className).toContain('disabled:pointer-events-none');
      expect(input.className).toContain('disabled:opacity-50');
    });
  });

  describe('user interaction', () => {
    it('should accept text input', async () => {
      const user = userEvent.setup();
      render(<Input data-testid="input" />);
      const input = screen.getByTestId('input') as HTMLInputElement;
      
      await user.type(input, 'Hello World');
      expect(input.value).toBe('Hello World');
    });

    it('should call onChange handler', async () => {
      const user = userEvent.setup();
      let value = '';
      const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        value = e.target.value;
      };
      
      render(<Input onChange={handleChange} data-testid="input" />);
      const input = screen.getByTestId('input');
      
      await user.type(input, 'Test');
      expect(value).toBe('Test');
    });

    it('should be focusable', async () => {
      const user = userEvent.setup();
      render(<Input data-testid="input" />);
      const input = screen.getByTestId('input');
      
      await user.click(input);
      expect(document.activeElement).toBe(input);
    });

    it('should call onFocus handler', async () => {
      const user = userEvent.setup();
      let focused = false;
      render(<Input onFocus={() => { focused = true; }} data-testid="input" />);
      const input = screen.getByTestId('input');
      
      await user.click(input);
      expect(focused).toBe(true);
    });

    it('should call onBlur handler', async () => {
      const user = userEvent.setup();
      let blurred = false;
      render(<Input onBlur={() => { blurred = true; }} data-testid="input" />);
      const input = screen.getByTestId('input');
      
      await user.click(input);
      await user.tab();
      expect(blurred).toBe(true);
    });
  });

  describe('controlled component', () => {
    it('should work as controlled input', async () => {
      const user = userEvent.setup();
      let value = 'initial';
      const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        value = e.target.value;
      };
      
      const { rerender } = render(
        <Input value={value} onChange={handleChange} data-testid="input" />
      );
      
      const input = screen.getByTestId('input') as HTMLInputElement;
      expect(input.value).toBe('initial');
      
      await user.clear(input);
      await user.type(input, 'updated');
      
      rerender(<Input value={value} onChange={handleChange} data-testid="input" />);
      expect(input.value).toBe('updated');
    });

    it('should respect value prop', () => {
      render(<Input value="fixed value" data-testid="input" />);
      const input = screen.getByTestId('input') as HTMLInputElement;
      expect(input.value).toBe('fixed value');
    });
  });

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Input disabled data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toBeDisabled();
    });

    it('should not accept input when disabled', async () => {
      const user = userEvent.setup();
      render(<Input disabled data-testid="input" />);
      const input = screen.getByTestId('input') as HTMLInputElement;
      
      await user.type(input, 'Test');
      expect(input.value).toBe('');
    });
  });

  describe('readonly state', () => {
    it('should be readonly when readOnly prop is true', () => {
      render(<Input readOnly data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('readOnly');
    });

    it('should not accept input when readonly', async () => {
      const user = userEvent.setup();
      render(<Input readOnly value="readonly" data-testid="input" />);
      const input = screen.getByTestId('input') as HTMLInputElement;
      
      await user.type(input, 'Test');
      expect(input.value).toBe('readonly');
    });
  });

  describe('validation', () => {
    it('should support required attribute', () => {
      render(<Input required data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toBeRequired();
    });

    it('should support pattern attribute', () => {
      render(<Input pattern="[0-9]*" data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('pattern', '[0-9]*');
    });

    it('should support minLength attribute', () => {
      render(<Input minLength={5} data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('minLength', '5');
    });

    it('should support maxLength attribute', () => {
      render(<Input maxLength={10} data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('maxLength', '10');
    });

    it('should apply aria-invalid styles', () => {
      render(<Input aria-invalid="true" data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input.className).toContain('aria-invalid:border-destructive');
    });
  });

  describe('accessibility', () => {
    it('should support aria-label', () => {
      render(<Input aria-label="Username" data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('aria-label', 'Username');
    });

    it('should support aria-describedby', () => {
      render(<Input aria-describedby="help-text" data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('should support aria-required', () => {
      render(<Input aria-required="true" data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('aria-required', 'true');
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(
        <>
          <Input data-testid="input-1" />
          <Input data-testid="input-2" />
        </>
      );
      
      const input1 = screen.getByTestId('input-1');
      const input2 = screen.getByTestId('input-2');
      
      await user.click(input1);
      expect(document.activeElement).toBe(input1);
      
      await user.tab();
      expect(document.activeElement).toBe(input2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty value', () => {
      render(<Input value="" data-testid="input" />);
      const input = screen.getByTestId('input') as HTMLInputElement;
      expect(input.value).toBe('');
    });

    it('should handle null className', () => {
      render(<Input className={undefined} data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toBeInTheDocument();
    });

    it('should handle special characters in input', async () => {
      const user = userEvent.setup();
      render(<Input data-testid="input" />);
      const input = screen.getByTestId('input') as HTMLInputElement;
      
      await user.type(input, '!@#$%^&*()');
      expect(input.value).toBe('!@#$%^&*()');
    });

    it('should handle unicode characters', async () => {
      const user = userEvent.setup();
      render(<Input data-testid="input" />);
      const input = screen.getByTestId('input') as HTMLInputElement;
      
      await user.type(input, '你好世界🌍');
      expect(input.value).toContain('你好世界');
    });

    it('should handle very long input', async () => {
      const user = userEvent.setup();
      const longText = 'a'.repeat(1000);
      render(<Input data-testid="input" />);
      const input = screen.getByTestId('input') as HTMLInputElement;
      
      await user.type(input, longText);
      expect(input.value).toBe(longText);
    });
  });

  describe('number input specifics', () => {
    it('should accept min and max for number input', () => {
      render(<Input type="number" min={0} max={100} data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('min', '0');
      expect(input).toHaveAttribute('max', '100');
    });

    it('should accept step for number input', () => {
      render(<Input type="number" step={0.1} data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('step', '0.1');
    });
  });

  describe('file input specifics', () => {
    it('should accept accept attribute for file input', () => {
      render(<Input type="file" accept="image/*" data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('accept', 'image/*');
    });

    it('should accept multiple attribute for file input', () => {
      render(<Input type="file" multiple data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toHaveAttribute('multiple');
    });
  });
});
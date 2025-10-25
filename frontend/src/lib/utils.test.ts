import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility function', () => {
  describe('basic functionality', () => {
    it('should merge single class string', () => {
      expect(cn('foo')).toBe('foo');
    });

    it('should merge multiple class strings', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle empty strings', () => {
      expect(cn('')).toBe('');
      expect(cn('', '')).toBe('');
    });

    it('should handle undefined values', () => {
      expect(cn(undefined)).toBe('');
      expect(cn('foo', undefined, 'bar')).toBe('foo bar');
    });

    it('should handle null values', () => {
      expect(cn(null)).toBe('');
      expect(cn('foo', null, 'bar')).toBe('foo bar');
    });

    it('should handle false values', () => {
      expect(cn(false)).toBe('');
      expect(cn('foo', false, 'bar')).toBe('foo bar');
    });
  });

  describe('conditional classes', () => {
    it('should handle conditional class with true', () => {
      expect(cn('foo', true && 'bar')).toBe('foo bar');
    });

    it('should handle conditional class with false', () => {
      expect(cn('foo', false && 'bar')).toBe('foo');
    });

    it('should handle object with boolean values', () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
    });

    it('should handle mixed conditionals', () => {
      const isActive = true;
      const isDisabled = false;
      expect(cn('base', { active: isActive, disabled: isDisabled })).toBe('base active');
    });
  });

  describe('array handling', () => {
    it('should handle array of classes', () => {
      expect(cn(['foo', 'bar'])).toBe('foo bar');
    });

    it('should handle nested arrays', () => {
      expect(cn(['foo', ['bar', 'baz']])).toBe('foo bar baz');
    });

    it('should handle array with conditionals', () => {
      expect(cn(['foo', false && 'bar', 'baz'])).toBe('foo baz');
    });
  });

  describe('Tailwind CSS merge functionality', () => {
    it('should merge conflicting Tailwind classes (last wins)', () => {
      expect(cn('px-2', 'px-4')).toBe('px-4');
    });

    it('should merge different Tailwind utilities', () => {
      expect(cn('px-2', 'py-4')).toBe('px-2 py-4');
    });

    it('should handle responsive variants', () => {
      expect(cn('text-sm', 'md:text-lg')).toBe('text-sm md:text-lg');
    });

    it('should merge conflicting responsive variants', () => {
      expect(cn('text-sm', 'text-lg', 'md:text-xl')).toBe('text-lg md:text-xl');
    });

    it('should handle hover and focus states', () => {
      expect(cn('hover:bg-blue-500', 'focus:bg-blue-600')).toBe('hover:bg-blue-500 focus:bg-blue-600');
    });

    it('should handle dark mode variants', () => {
      expect(cn('bg-white', 'dark:bg-black')).toBe('bg-white dark:bg-black');
    });

    it('should merge complex Tailwind combinations', () => {
      const result = cn(
        'bg-red-500',
        'bg-blue-500',
        'hover:bg-green-500',
        'px-4',
        'py-2'
      );
      expect(result).toBe('bg-blue-500 hover:bg-green-500 px-4 py-2');
    });
  });

  describe('edge cases', () => {
    it('should handle no arguments', () => {
      expect(cn()).toBe('');
    });

    it('should handle many arguments', () => {
      expect(cn('a', 'b', 'c', 'd', 'e', 'f', 'g')).toBe('a b c d e f g');
    });

    it('should handle duplicate classes', () => {
      expect(cn('foo', 'bar', 'foo')).toBe('bar foo');
    });

    it('should handle whitespace', () => {
      expect(cn('  foo  ', '  bar  ')).toBe('foo bar');
    });

    it('should handle mixed types', () => {
      expect(cn('foo', ['bar', { baz: true }], false && 'qux', 'quux')).toBe('foo bar baz quux');
    });

    it('should handle deeply nested structures', () => {
      expect(cn('a', ['b', ['c', { d: true, e: false }]], 'f')).toBe('a b c d f');
    });

    it('should be consistent with multiple calls', () => {
      const classes = ['foo', 'bar', 'baz'];
      const result1 = cn(...classes);
      const result2 = cn(...classes);
      expect(result1).toBe(result2);
    });
  });

  describe('real-world component scenarios', () => {
    it('should handle button variants', () => {
      const baseClasses = 'inline-flex items-center justify-center rounded-md';
      const variantClasses = 'bg-primary text-primary-foreground';
      const sizeClasses = 'h-9 px-4 py-2';
      
      expect(cn(baseClasses, variantClasses, sizeClasses)).toContain('inline-flex');
      expect(cn(baseClasses, variantClasses, sizeClasses)).toContain('bg-primary');
      expect(cn(baseClasses, variantClasses, sizeClasses)).toContain('h-9');
    });

    it('should handle disabled state override', () => {
      const isDisabled = true;
      expect(cn('opacity-100', isDisabled && 'opacity-50')).toBe('opacity-50');
    });

    it('should handle custom className prop override', () => {
      const defaultClasses = 'bg-white text-black';
      const customClasses = 'bg-red-500 text-white font-bold';
      const result = cn(defaultClasses, customClasses);
      
      expect(result).toContain('bg-red-500');
      expect(result).toContain('text-white');
      expect(result).toContain('font-bold');
    });

    it('should handle focus-visible states', () => {
      const result = cn(
        'outline-none',
        'focus-visible:ring-2',
        'focus-visible:ring-offset-2'
      );
      expect(result).toContain('outline-none');
      expect(result).toContain('focus-visible:ring-2');
    });
  });

  describe('performance and consistency', () => {
    it('should handle large number of classes efficiently', () => {
      const classes = Array.from({ length: 100 }, (_, i) => `class-${i}`);
      const result = cn(...classes);
      expect(result).toBeTruthy();
      expect(result.split(' ').length).toBeLessThanOrEqual(100);
    });

    it('should be deterministic', () => {
      const inputs = ['foo', 'bar', { baz: true }, false && 'qux'];
      const result1 = cn(...inputs);
      const result2 = cn(...inputs);
      const result3 = cn(...inputs);
      
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });
  });
});
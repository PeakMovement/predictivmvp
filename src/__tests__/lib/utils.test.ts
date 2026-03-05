import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn utility function', () => {
  it('should merge Tailwind classes correctly', () => {
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });

  it('should handle conditional classes', () => {
    const result = cn('base-class', true && 'conditional-class', false && 'excluded-class');
    expect(result).toContain('base-class');
    expect(result).toContain('conditional-class');
    expect(result).not.toContain('excluded-class');
  });

  it('should handle array of classes', () => {
    const result = cn(['class1', 'class2', 'class3']);
    expect(result).toContain('class1');
    expect(result).toContain('class2');
    expect(result).toContain('class3');
  });

  it('should handle undefined and null values', () => {
    const result = cn('valid-class', undefined, null, 'another-class');
    expect(result).toContain('valid-class');
    expect(result).toContain('another-class');
  });

  it('should merge conflicting Tailwind classes', () => {
    const result = cn('px-2 py-1', 'px-4');
    expect(result).toContain('px-4');
    expect(result).toContain('py-1');
  });

  it('should handle empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('should handle object notation', () => {
    const result = cn({
      'active': true,
      'disabled': false,
      'hover': true,
    });
    expect(result).toContain('active');
    expect(result).toContain('hover');
    expect(result).not.toContain('disabled');
  });

  it('should handle complex nested conditions', () => {
    const isActive = true;
    const isDisabled = false;
    const variant: string = 'primary';

    const result = cn(
      'base',
      isActive && 'active',
      isDisabled && 'disabled',
      variant === 'primary' && 'bg-blue-500',
      variant === 'secondary' && 'bg-gray-500'
    );

    expect(result).toContain('base');
    expect(result).toContain('active');
    expect(result).toContain('bg-blue-500');
    expect(result).not.toContain('disabled');
    expect(result).not.toContain('bg-gray-500');
  });
});

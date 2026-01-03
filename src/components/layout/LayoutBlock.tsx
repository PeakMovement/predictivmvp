import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PageId } from '@/hooks/useLayoutCustomization';

export type LayoutBlockSize = 'compact' | 'standard' | 'wide';

export interface LayoutBlockProps {
  /** Unique identifier for this block */
  blockId: string;
  /** Human readable display name */
  displayName: string;
  /** Which page this block belongs to */
  pageId: PageId;
  /** Size variant: compact, standard, or wide */
  size?: LayoutBlockSize;
  /** Whether this block is visible */
  visible?: boolean;
  /** Optional additional className */
  className?: string;
  /** Content to render inside the block */
  children: ReactNode;
}

const sizeStyles: Record<LayoutBlockSize, string> = {
  compact: 'max-w-2xl',
  standard: 'max-w-4xl',
  wide: 'max-w-full',
};

/**
 * LayoutBlock is a presentation wrapper that provides consistent structure
 * for page sections. It does not alter the content inside, only controls
 * visibility, sizing, and provides metadata for layout customization.
 */
export function LayoutBlock({
  blockId,
  displayName,
  pageId,
  size = 'wide',
  visible = true,
  className,
  children,
}: LayoutBlockProps) {
  // If not visible, render nothing
  if (!visible) {
    return null;
  }

  return (
    <div
      data-block-id={blockId}
      data-block-name={displayName}
      data-block-page={pageId}
      data-block-size={size}
      className={cn(
        'layout-block w-full',
        sizeStyles[size],
        className
      )}
    >
      {children}
    </div>
  );
}

import { useEffect, useRef, useState, ReactNode } from 'react';
import { Loader as Loader2, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  disabled?: boolean;
  pullDownThreshold?: number;
  maxPullDown?: number;
  refreshingContent?: ReactNode;
}

export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  pullDownThreshold = 80,
  maxPullDown = 150,
  refreshingContent,
}: PullToRefreshProps) {
  const [pullDown, setPullDown] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled || refreshing) return;

    if (window.scrollY === 0) {
      setPullStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (disabled || refreshing || pullStartY === 0) return;

    if (window.scrollY > 0) {
      setPullStartY(0);
      setPullDown(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const distance = currentY - pullStartY;

    if (distance > 0) {
      const pull = Math.min(distance * 0.6, maxPullDown);
      setPullDown(pull);

      if (pull > pullDownThreshold) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = async () => {
    if (disabled || refreshing) return;

    if (pullDown > pullDownThreshold) {
      setRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh error:', error);
      } finally {
        setRefreshing(false);
      }
    }

    setPullDown(0);
    setPullStartY(0);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullStartY, pullDown, refreshing, disabled]);

  const isThresholdReached = pullDown > pullDownThreshold;
  const pullProgress = Math.min((pullDown / pullDownThreshold) * 100, 100);

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen scrollable-content"
      role="region"
      aria-label="Scrollable content with pull-to-refresh"
    >
      {/* Pull indicator */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 flex items-center justify-center transition-opacity',
          'pointer-events-none z-50',
          pullDown > 0 || refreshing ? 'opacity-100' : 'opacity-0'
        )}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          height: `${Math.max(pullDown, refreshing ? 60 : 0)}px`,
          transition: refreshing ? 'height 0.3s ease-out' : 'none',
        }}
      >
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-2',
            'bg-background/90 backdrop-blur-sm rounded-full',
            'px-6 py-3 shadow-lg border border-border/50',
            'transition-all duration-200'
          )}
          style={{
            transform: `scale(${Math.min(pullProgress / 100, 1)})`,
          }}
        >
          {refreshing ? (
            <>
              {refreshingContent || (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Refreshing...</span>
                </>
              )}
            </>
          ) : (
            <>
              <ArrowDown
                className={cn(
                  'h-5 w-5 text-primary transition-transform duration-200',
                  isThresholdReached && 'rotate-180'
                )}
              />
              <span className="text-xs text-muted-foreground">
                {isThresholdReached ? 'Release to refresh' : 'Pull to refresh'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Content with push-down effect */}
      <div
        style={{
          transform: `translateY(${pullDown}px)`,
          transition: refreshing || pullDown === 0 ? 'transform 0.3s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}

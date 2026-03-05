import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  blurDataURL?: string;
  eager?: boolean;
  fallbackSrc?: string;
}

export function OptimizedImage({
  src,
  alt,
  blurDataURL,
  eager = false,
  fallbackSrc = '/placeholder.svg',
  className,
  ...props
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(eager ? src : null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (eager) return;

    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.unobserve(img);
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.01,
      }
    );

    observer.observe(img);

    return () => {
      if (img) {
        observer.unobserve(img);
      }
    };
  }, [src, eager]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setError(true);
    setIsLoading(false);
    setImageSrc(fallbackSrc);
  };

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {isLoading && blurDataURL && (
        <img
          src={blurDataURL}
          alt=""
          className={cn(
            'absolute inset-0 w-full h-full object-cover blur-sm scale-110',
            'transition-opacity duration-300'
          )}
        />
      )}
      <img
        ref={imgRef}
        src={imageSrc || blurDataURL || fallbackSrc}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          isLoading && 'opacity-0',
          !isLoading && 'opacity-100'
        )}
        loading={eager ? 'eager' : 'lazy'}
        {...props}
      />
      {error && !imageSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <span className="text-xs text-muted-foreground">Failed to load image</span>
        </div>
      )}
    </div>
  );
}

interface AvatarImageProps extends OptimizedImageProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function AvatarImage({ size = 'md', className, ...props }: AvatarImageProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  return (
    <OptimizedImage
      {...props}
      className={cn('rounded-full', sizeClasses[size], className)}
    />
  );
}

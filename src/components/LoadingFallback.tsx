import { Loader2 } from 'lucide-react';

interface LoadingFallbackProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingFallback({ message = 'Loading...', fullScreen = true }: LoadingFallbackProps) {
  const containerClass = fullScreen
    ? 'flex items-center justify-center min-h-screen bg-background'
    : 'flex items-center justify-center py-12';

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export function PageLoadingFallback() {
  return <LoadingFallback fullScreen={true} />;
}

export function ComponentLoadingFallback() {
  return <LoadingFallback fullScreen={false} message="Loading component..." />;
}

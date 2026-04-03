interface LoadingFallbackProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingFallback({ fullScreen = true }: LoadingFallbackProps) {
  const containerClass = fullScreen
    ? 'flex items-center justify-center min-h-screen bg-void'
    : 'flex items-center justify-center py-12';

  return (
    <div className={containerClass}>
      {/* Hairline sweep loader */}
      <div className="w-32 h-px bg-line overflow-hidden">
        <div className="h-px w-full bg-coldBlue/60 animate-hairline-sweep" />
      </div>
    </div>
  );
}

export function PageLoadingFallback() {
  return <LoadingFallback fullScreen={true} />;
}

export function ComponentLoadingFallback() {
  return <LoadingFallback fullScreen={false} />;
}

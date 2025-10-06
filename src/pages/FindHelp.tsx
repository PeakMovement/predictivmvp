import { useState, useEffect } from "react";

export const FindHelp = () => {
  const [iframeError, setIframeError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reset loading state when component mounts
    setLoading(true);
  }, []);

  const handleIframeLoad = () => {
    // Small delay to ensure smooth transition
    setTimeout(() => {
      setLoading(false);
    }, 100);
  };

  return (
    <div className="flex flex-col w-full h-screen bg-background relative">
      {/* Purple-blue glow overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle at center, rgba(150, 120, 255, 0.08) 0%, transparent 70%)',
        }}
      />
      
      {/* Loading overlay with blurred gradient */}
      {loading && (
        <div 
          className="absolute inset-0 z-50 animate-fadeInOut"
          style={{
            background: 'linear-gradient(135deg, rgba(18, 18, 18, 0.95) 0%, rgba(95, 132, 255, 0.25) 100%)',
            backdropFilter: 'blur(8px)',
          }}
        />
      )}
      
      {/* Main iframe container */}
      <div 
        className="flex-1 relative overflow-hidden z-10"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {!iframeError ? (
          <iframe
            src="https://preview--predictivmedicalfinder.lovable.app/?step=2"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: '0',
              overflow: 'auto',
            }}
            loading="lazy"
            allow="clipboard-write; fullscreen"
            onLoad={handleIframeLoad}
            onError={() => setIframeError(true)}
            title="Predictiv Medical Finder"
          />
        ) : (
          <div className="flex items-center justify-center h-full p-6">
            <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-8 max-w-md text-center shadow-glass">
              <div className="text-4xl mb-4">⚠️</div>
              <p className="text-foreground font-medium mb-2">
                Couldn't load the professional finder right now
              </p>
              <p className="text-muted-foreground text-sm">
                Please try again later or check your internet connection.
              </p>
              <button
                onClick={() => {
                  setIframeError(false);
                  setLoading(true);
                }}
                className="mt-4 px-4 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 hover:scale-105 active:scale-95 transition-all duration-200 font-medium min-h-[44px]"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

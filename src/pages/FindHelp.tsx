import { useState } from "react";

export const FindHelp = () => {
  const [iframeError, setIframeError] = useState(false);

  return (
    <div className="flex flex-col w-full h-screen bg-background">
      {/* Purple-blue glow overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle at center, rgba(150, 120, 255, 0.08) 0%, transparent 70%)',
        }}
      />
      
      {/* Main iframe container */}
      <div 
        className="flex-1 relative overflow-hidden animate-fade-in z-10"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          animationDuration: '0.5s'
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
                onClick={() => setIframeError(false)}
                className="mt-4 px-4 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 hover:scale-105 active:scale-95 transition-all duration-200 font-medium"
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

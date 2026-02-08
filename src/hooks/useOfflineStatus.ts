import { useState, useEffect } from "react";

export const useOfflineStatus = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setWasOffline(isOffline);
      setIsOffline(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setWasOffline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isOffline]);

  return { isOffline, wasOffline };
};

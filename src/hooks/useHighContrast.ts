import { useEffect, useState } from 'react';

const HIGH_CONTRAST_KEY = 'high-contrast-mode';

export function useHighContrast() {
  const [isHighContrast, setIsHighContrast] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(HIGH_CONTRAST_KEY) === 'true';
  });

  useEffect(() => {
    const root = window.document.documentElement;

    if (isHighContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    localStorage.setItem(HIGH_CONTRAST_KEY, String(isHighContrast));
  }, [isHighContrast]);

  const toggleHighContrast = () => {
    setIsHighContrast((prev) => !prev);
  };

  return {
    isHighContrast,
    setIsHighContrast,
    toggleHighContrast,
  };
}

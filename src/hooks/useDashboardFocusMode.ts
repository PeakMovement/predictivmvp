import { useState, useCallback, useMemo } from "react";

export type FocusMode = 'recovery' | 'performance' | 'pain_management' | 'balance' | 'custom';

export interface FocusModeConfig {
  id: FocusMode;
  label: string;
  description: string;
  tone: 'coach' | 'warm' | 'strategic';
  cardOrder: string[];
  expandedCards: string[];
  emphasizedCards: string[];
  minimizedCards: string[];
}

const focusModeConfigs: Record<FocusMode, FocusModeConfig> = {
  recovery: {
    id: 'recovery',
    label: 'Recovery',
    description: 'Rest and restore. Your body knows what it needs.',
    tone: 'warm',
    cardOrder: ['sleep', 'readiness', 'briefing', 'recommendations', 'risk', 'activity', 'todayActivity'],
    expandedCards: ['sleep', 'readiness', 'briefing'],
    emphasizedCards: ['sleep', 'readiness'],
    minimizedCards: ['activity', 'todayActivity'],
  },
  performance: {
    id: 'performance',
    label: 'Performance',
    description: 'Time to push. Your metrics show you are ready.',
    tone: 'coach',
    cardOrder: ['readiness', 'activity', 'todayActivity', 'risk', 'briefing', 'recommendations', 'sleep'],
    expandedCards: ['readiness', 'activity', 'todayActivity'],
    emphasizedCards: ['activity', 'readiness'],
    minimizedCards: ['sleep'],
  },
  pain_management: {
    id: 'pain_management',
    label: 'Pain Management',
    description: 'Listen to your body. We will go gently today.',
    tone: 'warm',
    cardOrder: ['risk', 'readiness', 'briefing', 'recommendations', 'sleep', 'activity', 'todayActivity'],
    expandedCards: ['risk', 'readiness', 'briefing'],
    emphasizedCards: ['risk', 'briefing'],
    minimizedCards: ['activity', 'todayActivity'],
  },
  balance: {
    id: 'balance',
    label: 'Balance',
    description: 'A clear view of everything. Plan with purpose.',
    tone: 'strategic',
    cardOrder: ['risk', 'readiness', 'sleep', 'activity', 'todayActivity', 'briefing', 'recommendations'],
    expandedCards: ['risk', 'readiness', 'sleep', 'activity'],
    emphasizedCards: [],
    minimizedCards: [],
  },
  custom: {
    id: 'custom',
    label: 'Custom',
    description: 'Your dashboard, your way.',
    tone: 'strategic',
    cardOrder: ['risk', 'readiness', 'sleep', 'activity', 'todayActivity', 'briefing', 'recommendations'],
    expandedCards: ['risk', 'readiness', 'sleep', 'activity', 'briefing'],
    emphasizedCards: [],
    minimizedCards: [],
  },
};

export function useDashboardFocusMode() {
  const [currentMode, setCurrentMode] = useState<FocusMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboard_focus_mode');
      if (saved && saved in focusModeConfigs) {
        return saved as FocusMode;
      }
    }
    return 'balance';
  });

  const setMode = useCallback((mode: FocusMode) => {
    setCurrentMode(mode);
    localStorage.setItem('dashboard_focus_mode', mode);
  }, []);

  const config = useMemo(() => focusModeConfigs[currentMode], [currentMode]);

  const allModes = useMemo(() => Object.values(focusModeConfigs), []);

  const isCardEmphasized = useCallback((cardId: string) => {
    return config.emphasizedCards.includes(cardId);
  }, [config]);

  const isCardMinimized = useCallback((cardId: string) => {
    return config.minimizedCards.includes(cardId);
  }, [config]);

  const isCardExpanded = useCallback((cardId: string) => {
    return config.expandedCards.includes(cardId);
  }, [config]);

  const getCardOrder = useCallback((cardId: string) => {
    const index = config.cardOrder.indexOf(cardId);
    return index === -1 ? 99 : index;
  }, [config]);

  return {
    currentMode,
    setMode,
    config,
    allModes,
    isCardEmphasized,
    isCardMinimized,
    isCardExpanded,
    getCardOrder,
  };
}

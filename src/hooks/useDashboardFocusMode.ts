import { useState, useCallback, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export interface CardInfo {
  id: string;
  label: string;
  description: string;
}

// Available dashboard cards with friendly labels
export const dashboardCards: CardInfo[] = [
  { id: 'readiness', label: 'Readiness', description: 'How prepared your body feels today' },
  { id: 'sleep', label: 'Sleep', description: 'Your rest and recovery overnight' },
  { id: 'activity', label: 'Activity', description: 'Movement and energy output' },
  { id: 'todayActivity', label: 'Today\'s Movement', description: 'Your activity throughout the day' },
  { id: 'risk', label: 'Health Insights', description: 'Patterns and observations worth noting' },
  { id: 'briefing', label: 'Daily Summary', description: 'Your personalized overview' },
  { id: 'recommendations', label: 'Guidance', description: 'Suggestions tailored to you' },
];

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
    description: 'Your dashboard, shaped by what matters to you.',
    tone: 'warm',
    cardOrder: ['risk', 'readiness', 'sleep', 'activity', 'todayActivity', 'briefing', 'recommendations'],
    expandedCards: ['risk', 'readiness', 'sleep', 'activity', 'briefing'],
    emphasizedCards: [],
    minimizedCards: [],
  },
};

interface CustomPreferences {
  emphasizedCards: string[];
}

function loadCustomPreferences(): CustomPreferences {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('dashboard_custom_preferences');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { emphasizedCards: [] };
      }
    }
  }
  return { emphasizedCards: [] };
}

function saveCustomPreferences(prefs: CustomPreferences) {
  localStorage.setItem('dashboard_custom_preferences', JSON.stringify(prefs));
}

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

  const [customPreferences, setCustomPreferences] = useState<CustomPreferences>(loadCustomPreferences);
  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load focus mode from database on mount
  useEffect(() => {
    async function loadFocusMode() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('user_focus_preferences')
          .select('focus_mode, custom_emphasis')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data) {
          setCurrentMode(data.focus_mode as FocusMode);
          localStorage.setItem('dashboard_focus_mode', data.focus_mode);

          if (data.custom_emphasis && Object.keys(data.custom_emphasis).length > 0) {
            const customEmphasis = data.custom_emphasis as Record<string, boolean>;
            const emphasized = Object.entries(customEmphasis)
              .filter(([_, isEmphasized]) => isEmphasized)
              .map(([id]) => id);
            const newPrefs = { emphasizedCards: emphasized };
            setCustomPreferences(newPrefs);
            saveCustomPreferences(newPrefs);
          }
        }
      } catch (error) {
        console.error('Error loading focus mode:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadFocusMode();
  }, []);

  const setMode = useCallback(async (mode: FocusMode) => {
    setCurrentMode(mode);
    localStorage.setItem('dashboard_focus_mode', mode);

    // Persist to database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_focus_preferences')
          .upsert({
            user_id: user.id,
            focus_mode: mode,
            updated_at: new Date().toISOString(),
          });
      }
    } catch (error) {
      console.error('Error saving focus mode:', error);
    }

    // If switching to custom mode, open the editor
    if (mode === 'custom') {
      setIsEditingCustom(true);
    }
  }, []);

  const saveCustomCardPreferences = useCallback(async (preferences: Record<string, boolean>) => {
    const emphasized = Object.entries(preferences)
      .filter(([_, isEmphasized]) => isEmphasized)
      .map(([id]) => id);

    const newPrefs = { emphasizedCards: emphasized };
    setCustomPreferences(newPrefs);
    saveCustomPreferences(newPrefs);
    setIsEditingCustom(false);

    // Persist custom emphasis to database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_focus_preferences')
          .upsert({
            user_id: user.id,
            focus_mode: 'custom',
            custom_emphasis: preferences,
            updated_at: new Date().toISOString(),
          });
      }
    } catch (error) {
      console.error('Error saving custom preferences:', error);
    }
  }, []);

  const cancelCustomEditing = useCallback(() => {
    setIsEditingCustom(false);
    // If no custom preferences are set, switch back to balance
    if (customPreferences.emphasizedCards.length === 0) {
      setCurrentMode('balance');
      localStorage.setItem('dashboard_focus_mode', 'balance');
    }
  }, [customPreferences.emphasizedCards.length]);

  const openCustomEditor = useCallback(() => {
    setIsEditingCustom(true);
  }, []);

  const config = useMemo(() => {
    const baseConfig = focusModeConfigs[currentMode];
    
    // If in custom mode, override emphasized cards with user preferences
    if (currentMode === 'custom' && customPreferences.emphasizedCards.length > 0) {
      const nonEmphasized = dashboardCards
        .map(c => c.id)
        .filter(id => !customPreferences.emphasizedCards.includes(id));
      
      return {
        ...baseConfig,
        emphasizedCards: customPreferences.emphasizedCards,
        minimizedCards: nonEmphasized,
      };
    }
    
    return baseConfig;
  }, [currentMode, customPreferences]);

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

  // Get card preferences for the editor
  const getCardPreferencesForEditor = useCallback(() => {
    return dashboardCards.map(card => ({
      ...card,
      emphasized: customPreferences.emphasizedCards.includes(card.id),
    }));
  }, [customPreferences]);

  return {
    currentMode,
    setMode,
    config,
    allModes,
    isCardEmphasized,
    isCardMinimized,
    isCardExpanded,
    getCardOrder,
    // Custom mode specific
    isEditingCustom,
    openCustomEditor,
    saveCustomCardPreferences,
    cancelCustomEditing,
    getCardPreferencesForEditor,
    hasCustomPreferences: customPreferences.emphasizedCards.length > 0,
    isLoading,
  };
}

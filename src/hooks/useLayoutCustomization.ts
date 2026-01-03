import { useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type LayoutBlockSize = 'compact' | 'standard' | 'wide';

export interface SectionConfig {
  id: string;
  name: string;
  visible: boolean;
  order: number;
  collapsed?: boolean;
  collapsedByDefault?: boolean;
  size?: LayoutBlockSize;
}

export interface PageLayout {
  sections: SectionConfig[];
}

export type PageId = 'dashboard' | 'health' | 'training' | 'baselines' | 'plan' | 'profile' | 'docs';

// Default sections for each page
const defaultLayouts: Record<PageId, SectionConfig[]> = {
  dashboard: [
    { id: 'focusMode', name: 'Focus Mode', visible: true, order: 0 },
    { id: 'riskScore', name: 'Risk Score', visible: true, order: 1 },
    { id: 'todaysScores', name: 'Todays Scores', visible: true, order: 2 },
    { id: 'todayActivity', name: 'Today Activity', visible: true, order: 3 },
    { id: 'dailyBriefing', name: 'Daily Briefing', visible: true, order: 4 },
    { id: 'recommendations', name: 'Recommendations', visible: true, order: 5 },
  ],
  health: [
    { id: 'header', name: 'Header', visible: true, order: 0 },
    { id: 'scoreCards', name: 'Score Cards', visible: true, order: 1 },
    { id: 'detailedMetrics', name: 'Detailed Metrics', visible: true, order: 2 },
    { id: 'todayActivity', name: 'Today Activity', visible: true, order: 3 },
    { id: 'dataSource', name: 'Data Source Info', visible: true, order: 4 },
  ],
  training: [
    { id: 'header', name: 'Header', visible: true, order: 0 },
    { id: 'sessionLogs', name: 'Session Logs', visible: true, order: 1 },
    { id: 'gauges', name: 'Training Gauges', visible: true, order: 2 },
    { id: 'trendAnalysis', name: 'Trend Analysis', visible: true, order: 3 },
  ],
  baselines: [
    { id: 'header', name: 'Header', visible: true, order: 0 },
    { id: 'activityTrends', name: 'Activity Trends', visible: true, order: 1 },
    { id: 'healthRecovery', name: 'Health and Recovery', visible: true, order: 2 },
  ],
  plan: [
    { id: 'weekIntent', name: 'Week Intent', visible: true, order: 0 },
    { id: 'weeklyFocus', name: 'Weekly Focus', visible: true, order: 1 },
    { id: 'themes', name: 'Weekly Themes', visible: true, order: 2 },
    { id: 'dailyBriefings', name: 'Daily Briefings', visible: true, order: 3 },
  ],
  profile: [
    { id: 'account', name: 'Account', visible: true, order: 0 },
    { id: 'appearance', name: 'Appearance', visible: true, order: 1 },
    { id: 'notifications', name: 'Notifications', visible: true, order: 2 },
    { id: 'wearables', name: 'Wearables', visible: true, order: 3 },
    { id: 'emailPrefs', name: 'Email Preferences', visible: true, order: 4 },
  ],
  docs: [
    { id: 'uploadZones', name: 'Upload Zones', visible: true, order: 0 },
    { id: 'summary', name: 'Document Summary', visible: true, order: 1 },
    { id: 'library', name: 'Document Library', visible: true, order: 2 },
  ],
};

// Get all valid section IDs for a page (source of truth)
function getValidSectionIds(pageId: PageId): Set<string> {
  return new Set(defaultLayouts[pageId].map(s => s.id));
}

// Merge saved layout with defaults: filter removed blocks, add new blocks
function mergeWithDefaults(saved: SectionConfig[], pageId: PageId): SectionConfig[] {
  const defaults = defaultLayouts[pageId];
  const validIds = getValidSectionIds(pageId);
  
  // Filter out any saved sections that no longer exist in defaults
  const filteredSaved = saved.filter(s => validIds.has(s.id));
  const savedIds = new Set(filteredSaved.map(s => s.id));
  
  // Find new sections that exist in defaults but not in saved layout
  const newSections = defaults.filter(d => !savedIds.has(d.id));
  
  // Combine: existing saved sections + new sections appended at the end
  const merged = [
    ...filteredSaved,
    ...newSections.map((s, i) => ({ ...s, order: filteredSaved.length + i })),
  ];
  
  // Re-normalize order to be sequential
  return merged.map((s, i) => ({ ...s, order: i }));
}

const LOCAL_STORAGE_KEY = 'layout_customization';

// Get layouts from localStorage (fallback for anonymous users)
function getLocalLayouts(): Record<PageId, PageLayout> | null {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading layout from localStorage:', error);
  }
  return null;
}

// Save layouts to localStorage
function saveLocalLayouts(layouts: Record<PageId, PageLayout>) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(layouts));
  } catch (error) {
    console.error('Error saving layout to localStorage:', error);
  }
}

export function useLayoutCustomization(pageId: PageId) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingSections, setEditingSections] = useState<SectionConfig[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [remoteLayouts, setRemoteLayouts] = useState<Record<PageId, PageLayout> | null>(null);
  const [isLoadingRemote, setIsLoadingRemote] = useState(true);
  
  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load layouts from Supabase for authenticated users
  useEffect(() => {
    async function loadRemoteLayouts() {
      if (!userId) {
        setIsLoadingRemote(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('layout_preferences')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error loading layout preferences:', error);
          setIsLoadingRemote(false);
          return;
        }

        if (data?.layout_preferences && typeof data.layout_preferences === 'object' && !Array.isArray(data.layout_preferences)) {
          setRemoteLayouts(data.layout_preferences as unknown as Record<PageId, PageLayout>);
        }
      } catch (error) {
        console.error('Error loading layout preferences:', error);
      } finally {
        setIsLoadingRemote(false);
      }
    }

    loadRemoteLayouts();
  }, [userId]);

  // Listen for layout updates
  useEffect(() => {
    const handleUpdate = () => setLayoutVersion(v => v + 1);
    window.addEventListener('layout_updated', handleUpdate);
    return () => window.removeEventListener('layout_updated', handleUpdate);
  }, []);
  
  // Get current layout from Supabase (if logged in) or localStorage
  // Always merge with defaults to handle new/removed sections gracefully
  const layout = useMemo((): PageLayout => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _version = layoutVersion; // Force re-compute on update
    
    let savedSections: SectionConfig[] | null = null;
    
    // For authenticated users, prefer remote layouts
    if (userId && remoteLayouts && remoteLayouts[pageId]?.sections) {
      savedSections = remoteLayouts[pageId].sections;
    } else {
      // Fall back to localStorage
      const stored = getLocalLayouts();
      if (stored && stored[pageId]?.sections) {
        savedSections = stored[pageId].sections;
      }
    }
    
    // If we have saved sections, merge with defaults to handle changes
    if (savedSections && savedSections.length > 0) {
      return { sections: mergeWithDefaults(savedSections, pageId) };
    }
    
    // No saved layout, use defaults
    return { sections: [...defaultLayouts[pageId]] };
  }, [pageId, layoutVersion, userId, remoteLayouts]);

  // Use preview sections if in preview mode, otherwise use saved layout
  const sections = useMemo(() => {
    if (previewMode && editingSections.length > 0) {
      return editingSections;
    }
    return layout.sections;
  }, [previewMode, editingSections, layout.sections]);

  // Save layouts to Supabase for authenticated users, localStorage for anonymous
  const persistLayouts = useCallback(async (layouts: Record<PageId, PageLayout>) => {
    // Always save to localStorage as a fallback
    saveLocalLayouts(layouts);

    // If authenticated, also save to Supabase
    if (userId) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ layout_preferences: JSON.parse(JSON.stringify(layouts)) })
          .eq('id', userId);

        if (error) {
          console.error('Error saving layout preferences to Supabase:', error);
        } else {
          // Update remote layouts state
          setRemoteLayouts(layouts);
        }
      } catch (error) {
        console.error('Error saving layout preferences:', error);
      }
    }
  }, [userId]);

  // Open the layout editor
  const openEditor = useCallback(() => {
    setEditingSections([...layout.sections]);
    setIsEditing(true);
    setPreviewMode(false);
  }, [layout.sections]);

  // Close the editor without saving
  const closeEditor = useCallback(() => {
    setIsEditing(false);
    setEditingSections([]);
    setPreviewMode(false);
  }, []);

  // Toggle preview mode
  const togglePreviewMode = useCallback(() => {
    setPreviewMode(prev => !prev);
  }, []);

  // Save the edited layout
  const saveLayout = useCallback(async (newSections: SectionConfig[]) => {
    const currentLayouts = (userId && remoteLayouts) ? remoteLayouts : (getLocalLayouts() || {} as Record<PageId, PageLayout>);
    const updatedLayouts = { ...currentLayouts, [pageId]: { sections: newSections } };
    
    await persistLayouts(updatedLayouts);
    
    setIsEditing(false);
    setEditingSections([]);
    setPreviewMode(false);
    // Force re-render
    window.dispatchEvent(new Event('layout_updated'));
  }, [pageId, userId, remoteLayouts, persistLayouts]);

  // Reset to default layout
  const resetToDefault = useCallback(async () => {
    const currentLayouts = (userId && remoteLayouts) ? remoteLayouts : (getLocalLayouts() || {} as Record<PageId, PageLayout>);
    const updatedLayouts = { ...currentLayouts, [pageId]: { sections: [...defaultLayouts[pageId]] } };
    
    await persistLayouts(updatedLayouts);
    setEditingSections([...defaultLayouts[pageId]]);
    window.dispatchEvent(new Event('layout_updated'));
  }, [pageId, userId, remoteLayouts, persistLayouts]);

  // Toggle section visibility
  const toggleSectionVisibility = useCallback((sectionId: string) => {
    setEditingSections(prev => 
      prev.map(s => s.id === sectionId ? { ...s, visible: !s.visible } : s)
    );
  }, []);

  // Toggle collapse by default
  const toggleCollapseByDefault = useCallback((sectionId: string) => {
    setEditingSections(prev => 
      prev.map(s => s.id === sectionId ? { ...s, collapsedByDefault: !s.collapsedByDefault } : s)
    );
  }, []);

  // Move section up
  const moveSectionUp = useCallback((sectionId: string) => {
    setEditingSections(prev => {
      const idx = prev.findIndex(s => s.id === sectionId);
      if (idx <= 0) return prev;
      const newSections = [...prev];
      [newSections[idx - 1], newSections[idx]] = [newSections[idx], newSections[idx - 1]];
      return newSections.map((s, i) => ({ ...s, order: i }));
    });
  }, []);

  // Move section down
  const moveSectionDown = useCallback((sectionId: string) => {
    setEditingSections(prev => {
      const idx = prev.findIndex(s => s.id === sectionId);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const newSections = [...prev];
      [newSections[idx], newSections[idx + 1]] = [newSections[idx + 1], newSections[idx]];
      return newSections.map((s, i) => ({ ...s, order: i }));
    });
  }, []);

  // Reorder via drag and drop
  const reorderSections = useCallback((fromIndex: number, toIndex: number) => {
    setEditingSections(prev => {
      const newSections = [...prev];
      const [removed] = newSections.splice(fromIndex, 1);
      newSections.splice(toIndex, 0, removed);
      return newSections.map((s, i) => ({ ...s, order: i }));
    });
  }, []);

  // Check if section should be visible
  const isSectionVisible = useCallback((sectionId: string): boolean => {
    const section = sections.find(s => s.id === sectionId);
    return section?.visible ?? true;
  }, [sections]);

  // Check if section should be collapsed by default
  const isSectionCollapsedByDefault = useCallback((sectionId: string): boolean => {
    const section = sections.find(s => s.id === sectionId);
    return section?.collapsedByDefault ?? false;
  }, [sections]);

  // Get ordered sections
  const orderedSections = useMemo(() => {
    return [...sections].sort((a, b) => a.order - b.order);
  }, [sections]);

  // Check if layout has been customized
  const isCustomized = useMemo(() => {
    if (userId && remoteLayouts) {
      return remoteLayouts[pageId] !== undefined;
    }
    const stored = getLocalLayouts();
    return stored !== null && stored[pageId] !== undefined;
  }, [pageId, userId, remoteLayouts]);

  return {
    sections: orderedSections,
    isEditing,
    editingSections,
    isCustomized,
    previewMode,
    isLoading: isLoadingRemote,
    openEditor,
    closeEditor,
    saveLayout,
    resetToDefault,
    toggleSectionVisibility,
    toggleCollapseByDefault,
    togglePreviewMode,
    moveSectionUp,
    moveSectionDown,
    reorderSections,
    isSectionVisible,
    isSectionCollapsedByDefault,
  };
}

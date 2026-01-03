import { useState, useCallback, useMemo, useEffect } from 'react';

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

const STORAGE_KEY = 'layout_customization';

function getStoredLayouts(): Record<PageId, PageLayout> | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading layout customization:', error);
  }
  return null;
}

function saveLayouts(layouts: Record<PageId, PageLayout>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
  } catch (error) {
    console.error('Error saving layout customization:', error);
  }
}

export function useLayoutCustomization(pageId: PageId) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingSections, setEditingSections] = useState<SectionConfig[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [layoutVersion, setLayoutVersion] = useState(0);
  
  // Listen for layout updates
  useEffect(() => {
    const handleUpdate = () => setLayoutVersion(v => v + 1);
    window.addEventListener('layout_updated', handleUpdate);
    return () => window.removeEventListener('layout_updated', handleUpdate);
  }, []);
  
  // Get current layout from localStorage or defaults
  const layout = useMemo((): PageLayout => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _version = layoutVersion; // Force re-compute on update
    const stored = getStoredLayouts();
    if (stored && stored[pageId]) {
      return stored[pageId];
    }
    return { sections: [...defaultLayouts[pageId]] };
  }, [pageId, layoutVersion]);

  // Use preview sections if in preview mode, otherwise use saved layout
  const sections = useMemo(() => {
    if (previewMode && editingSections.length > 0) {
      return editingSections;
    }
    return layout.sections;
  }, [previewMode, editingSections, layout.sections]);

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
  const saveLayout = useCallback((newSections: SectionConfig[]) => {
    const stored = getStoredLayouts() || {} as Record<PageId, PageLayout>;
    stored[pageId] = { sections: newSections };
    saveLayouts(stored);
    setIsEditing(false);
    setEditingSections([]);
    setPreviewMode(false);
    // Force re-render by updating storage
    window.dispatchEvent(new Event('layout_updated'));
  }, [pageId]);

  // Reset to default layout
  const resetToDefault = useCallback(() => {
    const stored = getStoredLayouts() || {} as Record<PageId, PageLayout>;
    stored[pageId] = { sections: [...defaultLayouts[pageId]] };
    saveLayouts(stored);
    setEditingSections([...defaultLayouts[pageId]]);
    window.dispatchEvent(new Event('layout_updated'));
  }, [pageId]);

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
    const stored = getStoredLayouts();
    return stored !== null && stored[pageId] !== undefined;
  }, [pageId]);

  return {
    sections: orderedSections,
    isEditing,
    editingSections,
    isCustomized,
    previewMode,
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

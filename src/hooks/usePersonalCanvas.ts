import { useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PageId, LayoutBlockSize } from './useLayoutCustomization';

export interface CanvasBlock {
  id: string;
  sourcePageId: PageId;
  sourceSectionId: string;
  name: string;
  order: number;
  size: LayoutBlockSize;
  visible: boolean;
}

export interface CanvasLayout {
  blocks: CanvasBlock[];
  enabled: boolean;
}

// Available blocks organized by category for the library
export const blockLibrary: Record<string, { pageId: PageId; blocks: { id: string; name: string; description: string }[] }> = {
  'Recovery': {
    pageId: 'health',
    blocks: [
      { id: 'scoreCards', name: 'Recovery Scores', description: 'View your readiness, sleep, and activity scores at a glance' },
      { id: 'detailedMetrics', name: 'Detailed Metrics', description: 'Explore HRV, resting heart rate, and other vital signs' },
    ],
  },
  'Training': {
    pageId: 'training',
    blocks: [
      { id: 'sessionLogs', name: 'Session Logs', description: 'Track your recent workout sessions and progress' },
      { id: 'gauges', name: 'Training Gauges', description: 'Monitor your training load and recovery balance' },
      { id: 'trendAnalysis', name: 'Trend Analysis', description: 'See how your training is evolving over time' },
    ],
  },
  'Readiness': {
    pageId: 'dashboard',
    blocks: [
      { id: 'riskScore', name: 'Risk Score', description: 'Your overall health risk assessment' },
      { id: 'todaysScores', name: 'Todays Scores', description: 'Quick view of your daily health scores' },
      { id: 'recommendations', name: 'Recommendations', description: 'Personalized suggestions from Yves' },
      { id: 'dailyBriefing', name: 'Daily Briefing', description: 'Your personalized morning health summary' },
    ],
  },
  'Symptoms': {
    pageId: 'dashboard',
    blocks: [
      { id: 'todayActivity', name: 'Today Activity', description: 'Your activity and movement for today' },
    ],
  },
  'Plans': {
    pageId: 'plan',
    blocks: [
      { id: 'weekIntent', name: 'Week Intent', description: 'Your focus and goals for the week ahead' },
      { id: 'weeklyFocus', name: 'Weekly Focus', description: 'Key priorities and areas of attention' },
      { id: 'themes', name: 'Weekly Themes', description: 'Thematic guidance for your week' },
      { id: 'dailyBriefings', name: 'Daily Briefings', description: 'View your daily briefing history' },
    ],
  },
  'Documents': {
    pageId: 'docs',
    blocks: [
      { id: 'summary', name: 'Document Summary', description: 'AI generated insights from your health documents' },
      { id: 'library', name: 'Document Library', description: 'Access all your uploaded health records' },
    ],
  },
  'Profile': {
    pageId: 'profile',
    blocks: [
      { id: 'wearables', name: 'Wearables', description: 'Manage your connected devices and data sources' },
    ],
  },
  'Baselines': {
    pageId: 'baselines',
    blocks: [
      { id: 'activityTrends', name: 'Activity Trends', description: 'Your activity patterns and baselines over time' },
      { id: 'healthRecovery', name: 'Health and Recovery', description: 'Long term health and recovery trends' },
    ],
  },
};

// Build a set of all valid block references from the library
function getAllValidBlockReferences(): Set<string> {
  const validRefs = new Set<string>();
  Object.values(blockLibrary).forEach(({ pageId, blocks }) => {
    blocks.forEach(block => {
      validRefs.add(`${pageId}:${block.id}`);
    });
  });
  return validRefs;
}

// Filter canvas blocks to remove any that reference non-existent sections
function filterValidBlocks(blocks: CanvasBlock[]): CanvasBlock[] {
  const validRefs = getAllValidBlockReferences();
  return blocks
    .filter(block => validRefs.has(`${block.sourcePageId}:${block.sourceSectionId}`))
    .map((block, index) => ({ ...block, order: index }));
}

const LOCAL_STORAGE_KEY = 'personal_canvas';

function getLocalCanvas(): CanvasLayout | null {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as CanvasLayout;
      // Filter out any blocks that no longer exist in the library
      return {
        ...parsed,
        blocks: filterValidBlocks(parsed.blocks || []),
      };
    }
  } catch (error) {
    console.error('Error loading canvas from localStorage:', error);
  }
  return null;
}

function saveLocalCanvas(canvas: CanvasLayout) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(canvas));
  } catch (error) {
    console.error('Error saving canvas to localStorage:', error);
  }
}

const defaultCanvas: CanvasLayout = {
  blocks: [],
  enabled: true,
};

export function usePersonalCanvas() {
  const [canvas, setCanvas] = useState<CanvasLayout>(defaultCanvas);
  const [isEditing, setIsEditing] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  // Load canvas from Supabase or localStorage
  useEffect(() => {
    async function loadCanvas() {
      if (!userId) {
        const local = getLocalCanvas();
        setCanvas(local || defaultCanvas);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('layout_preferences')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error loading canvas:', error);
          const local = getLocalCanvas();
          setCanvas(local || defaultCanvas);
          setIsLoading(false);
          return;
        }

        const prefs = data?.layout_preferences as Record<string, unknown> | null;
        if (prefs && prefs.personalCanvas) {
          const savedCanvas = prefs.personalCanvas as CanvasLayout;
          // Filter out any blocks that no longer exist in the library
          setCanvas({
            ...savedCanvas,
            blocks: filterValidBlocks(savedCanvas.blocks || []),
          });
        } else {
          const local = getLocalCanvas();
          setCanvas(local || defaultCanvas);
        }
      } catch (error) {
        console.error('Error loading canvas:', error);
        const local = getLocalCanvas();
        setCanvas(local || defaultCanvas);
      } finally {
        setIsLoading(false);
      }
    }

    loadCanvas();
  }, [userId]);

  // Persist canvas
  const persistCanvas = useCallback(async (newCanvas: CanvasLayout) => {
    saveLocalCanvas(newCanvas);

    if (userId) {
      try {
        const { data: existing } = await supabase
          .from('profiles')
          .select('layout_preferences')
          .eq('id', userId)
          .single();

        const currentPrefs = (existing?.layout_preferences as Record<string, unknown>) || {};
        const updatedPrefs = { ...currentPrefs, personalCanvas: newCanvas };

        await supabase
          .from('profiles')
          .update({ layout_preferences: JSON.parse(JSON.stringify(updatedPrefs)) })
          .eq('id', userId);
      } catch (error) {
        console.error('Error saving canvas to Supabase:', error);
      }
    }
  }, [userId]);

  // Add a block to the canvas
  const addBlock = useCallback((sourcePageId: PageId, sourceSectionId: string, name: string) => {
    setCanvas(prev => {
      // Check if block already exists
      const exists = prev.blocks.some(
        b => b.sourcePageId === sourcePageId && b.sourceSectionId === sourceSectionId
      );
      if (exists) return prev;

      const newBlock: CanvasBlock = {
        id: `${sourcePageId}_${sourceSectionId}_${Date.now()}`,
        sourcePageId,
        sourceSectionId,
        name,
        order: prev.blocks.length,
        size: 'wide',
        visible: true,
      };

      const newCanvas = { ...prev, blocks: [...prev.blocks, newBlock] };
      persistCanvas(newCanvas);
      return newCanvas;
    });
  }, [persistCanvas]);

  // Remove a block from the canvas
  const removeBlock = useCallback((blockId: string) => {
    setCanvas(prev => {
      const newBlocks = prev.blocks
        .filter(b => b.id !== blockId)
        .map((b, i) => ({ ...b, order: i }));
      const newCanvas = { ...prev, blocks: newBlocks };
      persistCanvas(newCanvas);
      return newCanvas;
    });
  }, [persistCanvas]);

  // Reorder blocks
  const reorderBlocks = useCallback((fromIndex: number, toIndex: number) => {
    setCanvas(prev => {
      const newBlocks = [...prev.blocks];
      const [removed] = newBlocks.splice(fromIndex, 1);
      newBlocks.splice(toIndex, 0, removed);
      const reordered = newBlocks.map((b, i) => ({ ...b, order: i }));
      const newCanvas = { ...prev, blocks: reordered };
      persistCanvas(newCanvas);
      return newCanvas;
    });
  }, [persistCanvas]);

  // Move block up
  const moveBlockUp = useCallback((blockId: string) => {
    setCanvas(prev => {
      const idx = prev.blocks.findIndex(b => b.id === blockId);
      if (idx <= 0) return prev;
      const newBlocks = [...prev.blocks];
      [newBlocks[idx - 1], newBlocks[idx]] = [newBlocks[idx], newBlocks[idx - 1]];
      const reordered = newBlocks.map((b, i) => ({ ...b, order: i }));
      const newCanvas = { ...prev, blocks: reordered };
      persistCanvas(newCanvas);
      return newCanvas;
    });
  }, [persistCanvas]);

  // Move block down
  const moveBlockDown = useCallback((blockId: string) => {
    setCanvas(prev => {
      const idx = prev.blocks.findIndex(b => b.id === blockId);
      if (idx < 0 || idx >= prev.blocks.length - 1) return prev;
      const newBlocks = [...prev.blocks];
      [newBlocks[idx], newBlocks[idx + 1]] = [newBlocks[idx + 1], newBlocks[idx]];
      const reordered = newBlocks.map((b, i) => ({ ...b, order: i }));
      const newCanvas = { ...prev, blocks: reordered };
      persistCanvas(newCanvas);
      return newCanvas;
    });
  }, [persistCanvas]);

  // Resize a block
  const resizeBlock = useCallback((blockId: string, size: LayoutBlockSize) => {
    setCanvas(prev => {
      const newBlocks = prev.blocks.map(b =>
        b.id === blockId ? { ...b, size } : b
      );
      const newCanvas = { ...prev, blocks: newBlocks };
      persistCanvas(newCanvas);
      return newCanvas;
    });
  }, [persistCanvas]);

  // Toggle block visibility
  const toggleBlockVisibility = useCallback((blockId: string) => {
    setCanvas(prev => {
      const newBlocks = prev.blocks.map(b =>
        b.id === blockId ? { ...b, visible: !b.visible } : b
      );
      const newCanvas = { ...prev, blocks: newBlocks };
      persistCanvas(newCanvas);
      return newCanvas;
    });
  }, [persistCanvas]);

  // Ordered blocks
  const orderedBlocks = useMemo(() => {
    return [...canvas.blocks].sort((a, b) => a.order - b.order);
  }, [canvas.blocks]);

  return {
    blocks: orderedBlocks,
    isEditing,
    isLibraryOpen,
    isLoading,
    hasBlocks: canvas.blocks.length > 0,
    setIsEditing,
    setIsLibraryOpen,
    addBlock,
    removeBlock,
    reorderBlocks,
    moveBlockUp,
    moveBlockDown,
    resizeBlock,
    toggleBlockVisibility,
  };
}

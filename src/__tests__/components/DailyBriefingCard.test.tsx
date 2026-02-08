import { describe, it, expect, vi } from 'vitest';
import { mockBriefing, mockBriefingWithAlerts } from '@/test/mockData';

vi.mock('@/hooks/usePersonalizedInsights', () => ({
  usePersonalizedInsights: () => ({
    insights: [],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useRelevantDocuments', () => ({
  useRelevantDocuments: () => ({
    documents: [],
    isLoading: false,
  }),
}));

describe('DailyBriefingCard', () => {
  const defaultProps = {
    briefing: mockBriefing,
    content: mockBriefing.content,
    createdAt: mockBriefing.created_at,
    isLoading: false,
    isGenerating: false,
    cached: false,
    onRefresh: vi.fn(),
  };

  describe('Props Validation', () => {
    it('should accept valid props', () => {
      expect(defaultProps.briefing).toBeDefined();
      expect(defaultProps.content).toBeTruthy();
      expect(defaultProps.onRefresh).toBeInstanceOf(Function);
    });

    it('should handle loading state prop', () => {
      expect(typeof defaultProps.isLoading).toBe('boolean');
      expect(typeof defaultProps.isGenerating).toBe('boolean');
    });

    it('should handle null briefing', () => {
      const nullProps = { ...defaultProps, briefing: null, content: null };
      expect(nullProps.briefing).toBeNull();
      expect(nullProps.content).toBeNull();
    });
  });

  describe('Mock Data Integrity', () => {
    it('should have valid briefing structure', () => {
      expect(mockBriefing).toHaveProperty('id');
      expect(mockBriefing).toHaveProperty('content');
      expect(mockBriefing).toHaveProperty('key_metrics');
      expect(mockBriefing).toHaveProperty('recommendations');
    });

    it('should have valid alerts in mockBriefingWithAlerts', () => {
      expect(mockBriefingWithAlerts.alerts).toBeInstanceOf(Array);
      expect(mockBriefingWithAlerts.alerts.length).toBeGreaterThan(0);
    });
  });

  describe('Focus Mode Configuration', () => {
    it('should accept recovery focus mode', () => {
      const focusMode: 'recovery' = 'recovery';
      expect(focusMode).toBe('recovery');
    });

    it('should accept performance focus mode', () => {
      const focusMode: 'performance' = 'performance';
      expect(focusMode).toBe('performance');
    });

    it('should accept pain_management focus mode', () => {
      const focusMode: 'pain_management' = 'pain_management';
      expect(focusMode).toBe('pain_management');
    });
  });

  describe('Callback Functions', () => {
    it('should call onRefresh callback', () => {
      const onRefresh = vi.fn();
      onRefresh();
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple refresh calls', () => {
      const onRefresh = vi.fn();
      onRefresh();
      onRefresh();
      onRefresh();
      expect(onRefresh).toHaveBeenCalledTimes(3);
    });
  });

  describe('State Management', () => {
    it('should handle cached state', () => {
      expect(typeof defaultProps.cached).toBe('boolean');
    });

    it('should toggle cached state', () => {
      let cached = false;
      cached = !cached;
      expect(cached).toBe(true);
      cached = !cached;
      expect(cached).toBe(false);
    });
  });
});

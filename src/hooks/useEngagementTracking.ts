import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type EventType =
  | "recommendation_viewed"
  | "recommendation_followed"
  | "recommendation_dismissed"
  | "recommendation_helpful"
  | "recommendation_not_helpful"
  | "symptom_logged"
  | "chat_initiated"
  | "briefing_viewed"
  | "app_opened";

interface TrackEventParams {
  event_type: EventType;
  target_id?: string;
  target_type?: string;
  metadata?: Record<string, unknown>;
}

export function useEngagementTracking() {
  const trackEvent = useCallback(async ({ event_type, target_id, target_type, metadata }: TrackEventParams) => {
    try {
      const { error } = await supabase.functions.invoke("track-engagement", {
        body: { event_type, target_id, target_type, metadata },
      });

      if (error) {
        console.error("[useEngagementTracking] Error tracking event:", error);
        return false;
      }

      return true;
    } catch (err) {
      console.error("[useEngagementTracking] Exception:", err);
      return false;
    }
  }, []);

  const trackRecommendationViewed = useCallback((recommendationId: string) => {
    return trackEvent({ event_type: "recommendation_viewed", target_id: recommendationId, target_type: "recommendation" });
  }, [trackEvent]);

  const trackRecommendationFollowed = useCallback((recommendationId: string, notes?: string) => {
    return trackEvent({ 
      event_type: "recommendation_followed", 
      target_id: recommendationId, 
      target_type: "recommendation",
      metadata: notes ? { notes } : undefined,
    });
  }, [trackEvent]);

  const trackRecommendationHelpful = useCallback((recommendationId: string, helpful: boolean) => {
    return trackEvent({ 
      event_type: helpful ? "recommendation_helpful" : "recommendation_not_helpful", 
      target_id: recommendationId, 
      target_type: "recommendation" 
    });
  }, [trackEvent]);

  const trackBriefingViewed = useCallback((briefingId?: string) => {
    return trackEvent({ event_type: "briefing_viewed", target_id: briefingId, target_type: "briefing" });
  }, [trackEvent]);

  const trackChatInitiated = useCallback(() => {
    return trackEvent({ event_type: "chat_initiated" });
  }, [trackEvent]);

  const trackAppOpened = useCallback(() => {
    return trackEvent({ event_type: "app_opened" });
  }, [trackEvent]);

  return {
    trackEvent,
    trackRecommendationViewed,
    trackRecommendationFollowed,
    trackRecommendationHelpful,
    trackBriefingViewed,
    trackChatInitiated,
    trackAppOpened,
  };
}

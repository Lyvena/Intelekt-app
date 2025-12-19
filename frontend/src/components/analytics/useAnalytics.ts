import { useCallback, useEffect, useRef } from 'react';
import { analyticsAPI } from '../../services/api';

interface UseAnalyticsOptions {
  userId?: string;
  autoTrackPageViews?: boolean;
}

export const useAnalytics = (options: UseAnalyticsOptions = {}) => {
  const { userId, autoTrackPageViews = true } = options;
  const sessionIdRef = useRef<string | null>(null);

  // Start session on mount
  useEffect(() => {
    const startSession = async () => {
      try {
        const deviceType = getDeviceType();
        const browser = getBrowser();
        const os = getOS();
        const utmParams = getUTMParams();
        
        const result = await analyticsAPI.startSession({
          user_id: userId,
          entry_page: window.location.pathname,
          device_type: deviceType,
          browser,
          os,
          ...utmParams
        });
        
        if (result.success) {
          sessionIdRef.current = result.session_id;
        }
      } catch (error) {
        console.error('Failed to start analytics session:', error);
      }
    };

    startSession();

    // End session on unmount
    return () => {
      if (sessionIdRef.current) {
        analyticsAPI.endSession({
          session_id: sessionIdRef.current,
          exit_page: window.location.pathname
        }).catch(console.error);
      }
    };
  }, [userId]);

  // Auto track page views
  useEffect(() => {
    if (!autoTrackPageViews) return;

    const trackPageView = () => {
      analyticsAPI.trackPageView({
        page_url: window.location.pathname,
        user_id: userId,
        session_id: sessionIdRef.current || undefined,
        referrer: document.referrer
      }).catch(console.error);
    };

    // Track initial page view
    trackPageView();

    // Listen for navigation changes
    const handlePopState = () => trackPageView();
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [userId, autoTrackPageViews]);

  // Track custom event
  const trackEvent = useCallback(async (
    category: string,
    action: string,
    label?: string,
    value?: number,
    properties?: Record<string, unknown>
  ) => {
    try {
      await analyticsAPI.trackEvent({
        event_type: 'custom',
        event_category: category,
        event_action: action,
        user_id: userId,
        session_id: sessionIdRef.current || undefined,
        event_label: label,
        event_value: value,
        properties,
        page_url: window.location.pathname
      });
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }, [userId]);

  // Track feature usage
  const trackFeature = useCallback(async (featureName: string, featureCategory: string) => {
    try {
      await analyticsAPI.trackFeature({
        feature_name: featureName,
        feature_category: featureCategory,
        user_id: userId
      });
    } catch (error) {
      console.error('Failed to track feature:', error);
    }
  }, [userId]);

  // Track AI usage
  const trackAIUsage = useCallback(async (
    provider: string,
    requestType: string,
    options?: {
      inputTokens?: number;
      outputTokens?: number;
      responseTimeMs?: number;
      success?: boolean;
      projectId?: string;
      model?: string;
      errorType?: string;
    }
  ) => {
    try {
      await analyticsAPI.trackAIUsage({
        provider,
        request_type: requestType,
        user_id: userId,
        project_id: options?.projectId,
        input_tokens: options?.inputTokens,
        output_tokens: options?.outputTokens,
        response_time_ms: options?.responseTimeMs,
        success: options?.success ?? true,
        model: options?.model,
        error_type: options?.errorType
      });
    } catch (error) {
      console.error('Failed to track AI usage:', error);
    }
  }, [userId]);

  // Track funnel step
  const trackFunnelStep = useCallback(async (
    funnelName: string,
    stepName: string,
    stepOrder: number,
    completed: boolean = true,
    timeToCompleteSeconds?: number
  ) => {
    try {
      await analyticsAPI.trackFunnelStep({
        funnel_name: funnelName,
        step_name: stepName,
        step_order: stepOrder,
        user_id: userId,
        session_id: sessionIdRef.current || undefined,
        completed,
        time_to_complete_seconds: timeToCompleteSeconds
      });
    } catch (error) {
      console.error('Failed to track funnel step:', error);
    }
  }, [userId]);

  // Track page view manually
  const trackPageView = useCallback(async (pageUrl?: string) => {
    try {
      await analyticsAPI.trackPageView({
        page_url: pageUrl || window.location.pathname,
        user_id: userId,
        session_id: sessionIdRef.current || undefined,
        referrer: document.referrer
      });
    } catch (error) {
      console.error('Failed to track page view:', error);
    }
  }, [userId]);

  return {
    sessionId: sessionIdRef.current,
    trackEvent,
    trackFeature,
    trackAIUsage,
    trackFunnelStep,
    trackPageView
  };
};

// Helper functions
function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('Opera')) return 'Opera';
  return 'Unknown';
}

function getOS(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Unknown';
}

function getUTMParams(): { utm_source?: string; utm_medium?: string; utm_campaign?: string } {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined
  };
}

export default useAnalytics;

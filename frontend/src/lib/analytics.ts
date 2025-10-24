/**
 * Segment Analytics Utility
 * 
 * This module provides type-safe wrappers for Segment analytics tracking.
 * Events are automatically sent to all connected destinations (Mixpanel, etc.)
 */

// Segment Analytics type definitions
interface AnalyticsJS {
  identify(userId: string, traits?: Record<string, any>): void;
  track(event: string, properties?: Record<string, any>): void;
  page(name?: string, properties?: Record<string, any>): void;
  reset(): void;
  group(groupId: string, traits?: Record<string, any>): void;
}

// Extend Window interface to include analytics
declare global {
  interface Window {
    analytics: AnalyticsJS;
  }
}

// Analytics event types
export type AnalyticsEvent = 
  | 'User Registered'
  | 'User Logged In'
  | 'User Logged Out'
  | 'Project Created'
  | 'Project Deleted'
  | 'Project Exported'
  | 'Chat Message Sent'
  | 'AI Response Received'
  | 'Code Generated'
  | 'File Viewed'
  | 'Error Occurred';

// Event properties interface
export interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

// User traits interface
export interface UserTraits {
  email?: string;
  username?: string;
  name?: string;
  createdAt?: string;
  plan?: string;
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Check if Segment analytics is loaded
 */
export const isAnalyticsLoaded = (): boolean => {
  return typeof window !== 'undefined' && !!window.analytics;
};

/**
 * Identify a user
 * @param userId - Unique user identifier
 * @param traits - User properties
 */
export const identifyUser = (userId: string, traits?: UserTraits): void => {
  if (!isAnalyticsLoaded()) {
    console.warn('Segment analytics not loaded');
    return;
  }

  try {
    window.analytics.identify(userId, traits);
    console.log('User identified:', userId);
  } catch (error) {
    console.error('Error identifying user:', error);
  }
};

/**
 * Track an event
 * @param event - Event name
 * @param properties - Event properties
 */
export const trackEvent = (event: AnalyticsEvent, properties?: EventProperties): void => {
  if (!isAnalyticsLoaded()) {
    console.warn('Segment analytics not loaded');
    return;
  }

  try {
    window.analytics.track(event, properties);
    console.log('Event tracked:', event, properties);
  } catch (error) {
    console.error('Error tracking event:', error);
  }
};

/**
 * Track a page view
 * @param name - Page name
 * @param properties - Page properties
 */
export const trackPage = (name?: string, properties?: EventProperties): void => {
  if (!isAnalyticsLoaded()) {
    console.warn('Segment analytics not loaded');
    return;
  }

  try {
    window.analytics.page(name, properties);
    console.log('Page tracked:', name, properties);
  } catch (error) {
    console.error('Error tracking page:', error);
  }
};

/**
 * Reset analytics (on logout)
 */
export const resetAnalytics = (): void => {
  if (!isAnalyticsLoaded()) {
    console.warn('Segment analytics not loaded');
    return;
  }

  try {
    window.analytics.reset();
    console.log('Analytics reset');
  } catch (error) {
    console.error('Error resetting analytics:', error);
  }
};

/**
 * Group a user (for team/organization tracking)
 * @param groupId - Group identifier
 * @param traits - Group properties
 */
export const identifyGroup = (groupId: string, traits?: EventProperties): void => {
  if (!isAnalyticsLoaded()) {
    console.warn('Segment analytics not loaded');
    return;
  }

  try {
    window.analytics.group(groupId, traits);
    console.log('Group identified:', groupId);
  } catch (error) {
    console.error('Error identifying group:', error);
  }
};

// Convenience functions for common events

export const analytics = {
  // User events
  userRegistered: (userId: string, email: string, username: string) => {
    identifyUser(userId, { email, username });
    trackEvent('User Registered', { email, username });
  },

  userLoggedIn: (userId: string, email: string) => {
    identifyUser(userId, { email });
    trackEvent('User Logged In', { email });
  },

  userLoggedOut: () => {
    trackEvent('User Logged Out');
    resetAnalytics();
  },

  // Project events
  projectCreated: (projectId: string, name: string, techStack: string, aiProvider: string) => {
    trackEvent('Project Created', {
      projectId,
      projectName: name,
      techStack,
      aiProvider,
    });
  },

  projectDeleted: (projectId: string, name: string) => {
    trackEvent('Project Deleted', {
      projectId,
      projectName: name,
    });
  },

  projectExported: (projectId: string, name: string) => {
    trackEvent('Project Exported', {
      projectId,
      projectName: name,
    });
  },

  // Chat events
  chatMessageSent: (projectId: string, messageLength: number) => {
    trackEvent('Chat Message Sent', {
      projectId,
      messageLength,
    });
  },

  aiResponseReceived: (projectId: string, aiProvider: string, responseTime: number) => {
    trackEvent('AI Response Received', {
      projectId,
      aiProvider,
      responseTime,
    });
  },

  codeGenerated: (projectId: string, aiProvider: string, linesOfCode: number) => {
    trackEvent('Code Generated', {
      projectId,
      aiProvider,
      linesOfCode,
    });
  },

  // File events
  fileViewed: (projectId: string, fileName: string, fileType: string) => {
    trackEvent('File Viewed', {
      projectId,
      fileName,
      fileType,
    });
  },

  // Error tracking
  errorOccurred: (errorMessage: string, errorType: string, context?: string) => {
    trackEvent('Error Occurred', {
      errorMessage,
      errorType,
      context,
    });
  },

  // Page tracking
  page: trackPage,
};

export default analytics;

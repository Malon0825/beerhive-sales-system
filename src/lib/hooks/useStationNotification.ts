'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Station notification configuration
 */
interface StationNotificationConfig {
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
  soundFile?: string;
  vibrationPattern?: number[];
}

/**
 * Default vibration patterns for different notification types
 */
const VIBRATION_PATTERNS = {
  // Short single vibration for new orders
  newOrder: [200, 100, 200],
  // Double vibration for urgent updates
  urgent: [100, 50, 100, 50, 100],
  // Triple vibration for ready items
  ready: [150, 100, 150, 100, 150],
} as const;

/**
 * Custom hook for station notifications (Kitchen, Bartender, Waiter)
 * Provides vibration and sound notifications for mobile and desktop devices
 * 
 * @param config - Configuration for notifications
 * @returns Functions to trigger notifications and check if muted
 * 
 * @example
 * ```tsx
 * const { playNotification, isMuted, toggleMute } = useStationNotification({
 *   soundFile: '/sounds/kitchen-notification.mp3',
 *   vibrationPattern: [200, 100, 200]
 * });
 * 
 * // When new order arrives
 * playNotification('newOrder');
 * ```
 */
export function useStationNotification(config: StationNotificationConfig = {}) {
  const {
    soundEnabled = true,
    vibrationEnabled = true,
    soundFile = '/sounds/notification.mp3',
    vibrationPattern = VIBRATION_PATTERNS.newOrder,
  } = config;

  const [isMuted, setIsMuted] = useState(false);

  /**
   * Load mute preference from localStorage
   */
  useEffect(() => {
    const savedMuteState = localStorage.getItem('station_notifications_muted');
    if (savedMuteState !== null) {
      setIsMuted(savedMuteState === 'true');
    }
  }, []);

  /**
   * Trigger vibration on supported devices
   */
  const triggerVibration = useCallback((pattern: number[]) => {
    if (!vibrationEnabled || isMuted) return;

    // Check if vibration API is supported
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
        console.log('📳 Vibration triggered:', pattern);
      } catch (error) {
        console.warn('Vibration failed:', error);
      }
    } else {
      console.log('📳 Vibration API not supported on this device');
    }
  }, [vibrationEnabled, isMuted]);

  /**
   * Play notification sound
   */
  const playSound = useCallback((soundPath: string) => {
    if (!soundEnabled || isMuted) return;

    try {
      const audio = new Audio(soundPath);
      audio.volume = 0.6; // Moderate volume for station notifications
      
      audio.play().catch(err => {
        // User might need to interact with page first for autoplay to work
        console.warn('Could not play notification sound:', err.message);
      });
      
      console.log('🔊 Sound played:', soundPath);
    } catch (error) {
      console.warn('Sound playback failed:', error);
    }
  }, [soundEnabled, isMuted]);

  /**
   * Play complete notification (sound + vibration)
   * 
   * @param type - Type of notification to determine vibration pattern
   */
  const playNotification = useCallback((type: 'newOrder' | 'urgent' | 'ready' = 'newOrder') => {
    if (isMuted) {
      console.log('🔇 Station notifications are muted');
      return;
    }

    // Play sound
    playSound(soundFile);
    
    // Trigger vibration based on type
    const pattern = type === 'newOrder' 
      ? vibrationPattern 
      : VIBRATION_PATTERNS[type];
    
    triggerVibration(pattern);
  }, [isMuted, soundFile, vibrationPattern, playSound, triggerVibration]);

  /**
   * Toggle mute state and persist to localStorage
   */
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newState = !prev;
      localStorage.setItem('station_notifications_muted', String(newState));
      console.log(newState ? '🔇 Station notifications muted' : '🔔 Station notifications unmuted');
      return newState;
    });
  }, []);

  /**
   * Request notification permissions (for browser notifications)
   * This is useful for when the tab is not in focus
   */
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('Browser notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }, []);

  /**
   * Show browser notification (works even when tab is not focused)
   */
  const showBrowserNotification = useCallback(async (
    title: string,
    message: string,
    icon?: string
  ) => {
    if (isMuted || !('Notification' in window)) return;

    const hasPermission = await requestNotificationPermission();
    
    if (hasPermission) {
      new Notification(title, {
        body: message,
        icon: icon || '/beerhive-logo.png',
        badge: '/beerhive-logo.png',
        tag: 'station-notification',
        requireInteraction: false,
        silent: false, // Allow system sound
      });
      
      console.log('📬 Browser notification shown:', title);
    }
  }, [isMuted, requestNotificationPermission]);

  return {
    playNotification,
    playSound,
    triggerVibration,
    showBrowserNotification,
    isMuted,
    toggleMute,
    requestNotificationPermission,
  };
}

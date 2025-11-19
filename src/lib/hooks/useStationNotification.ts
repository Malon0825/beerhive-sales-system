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
   * Play notification sound with repetition for better audibility
   * 
   * @param soundPath - Path to the sound file
   * @param repeat - Number of times to repeat the sound (default: 3)
   * @param interval - Delay between repetitions in ms (default: 1000)
   */
  const playSound = useCallback((soundPath: string, repeat: number = 3, interval: number = 1000) => {
    if (!soundEnabled || isMuted) return;

    let playCount = 0;
    
    const playNext = () => {
      if (playCount >= repeat) return;
      
      try {
        const audio = new Audio(soundPath);
        audio.volume = 1.0; // Maximum volume for noisy restaurant environment
        
        audio.play().catch(err => {
          // User might need to interact with page first for autoplay to work
          console.warn('Could not play notification sound:', err.message);
        });
        
        playCount++;
        console.log(`🔊 Sound played (${playCount}/${repeat}):`, soundPath);
        
        // Schedule next repetition
        if (playCount < repeat) {
          setTimeout(playNext, interval);
        }
      } catch (error) {
        console.warn('Sound playback failed:', error);
      }
    };
    
    playNext();
  }, [soundEnabled, isMuted]);

  /**
   * Play complete notification (sound + vibration)
   * 
   * @param type - Type of notification to determine vibration pattern
   * @param repeat - Number of times to repeat the sound (default: 3)
   */
  const playNotification = useCallback((type: 'newOrder' | 'urgent' | 'ready' = 'newOrder', repeat: number = 3) => {
    if (isMuted) {
      console.log('🔇 Station notifications are muted');
      return;
    }

    // Play sound with repetition
    playSound(soundFile, repeat);
    
    // Trigger vibration based on type (convert to mutable array)
    const pattern = type === 'newOrder' 
      ? [...vibrationPattern]
      : [...VIBRATION_PATTERNS[type]];
    
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
   * Uses unique tag to allow multiple notifications to appear simultaneously
   */
  const showBrowserNotification = useCallback(async (
    title: string,
    message: string,
    icon?: string
  ) => {
    if (isMuted || !('Notification' in window)) return;

    const hasPermission = await requestNotificationPermission();
    
    if (hasPermission) {
      // Use unique tag with timestamp to allow multiple notifications
      // Without unique tag, Windows will replace the previous notification
      const uniqueTag = `station-notification-${Date.now()}`;
      
      const notification = new Notification(title, {
        body: message,
        icon: icon || '/beerhive-logo.png',
        badge: '/beerhive-logo.png',
        tag: uniqueTag,
        requireInteraction: false,
        silent: false, // Allow system sound
      });
      
      // Auto-close notification after 10 seconds to prevent buildup
      setTimeout(() => {
        notification.close();
      }, 10000);
      
      console.log('🔔 Browser notification shown:', title, '(tag:', uniqueTag, ')');
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

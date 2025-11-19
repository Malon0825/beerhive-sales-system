'use client';

import { useState, useEffect } from 'react';
import { Volume2, X } from 'lucide-react';

/**
 * AudioEnablePrompt Component
 * Prompts users to enable audio on page load to bypass browser autoplay restrictions
 * Once enabled, the prompt is hidden and preference is saved
 */
export function AudioEnablePrompt() {
  const [show, setShow] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);

  useEffect(() => {
    // Check if audio was previously enabled
    const wasEnabled = localStorage.getItem('station_audio_enabled');
    
    if (wasEnabled === 'true') {
      setAudioEnabled(true);
      return;
    }

    // Show prompt after a short delay
    const timer = setTimeout(() => {
      setShow(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleEnableAudio = async () => {
    try {
      // Play a silent test sound to enable audio context
      const testAudio = new Audio('/sounds/notification.mp3');
      testAudio.volume = 0.01; // Very quiet test
      
      await testAudio.play();
      
      // Success - audio is now enabled
      localStorage.setItem('station_audio_enabled', 'true');
      setAudioEnabled(true);
      setShow(false);
      
      console.log('✅ Station audio enabled successfully');
    } catch (error) {
      console.warn('⚠️ Audio enable failed:', error);
      // Still hide the prompt - user might need to try again later
      setShow(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    // Don't save to localStorage - will show again on next page load
  };

  if (!show || audioEnabled) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 relative">
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition"
          aria-label="Dismiss"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="bg-blue-100 rounded-full p-4">
            <Volume2 className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
          Enable Sound Notifications
        </h2>

        {/* Description */}
        <p className="text-gray-600 text-center mb-6">
          To receive audio alerts for new orders, please click the button below to enable sound notifications.
        </p>

        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Important:</strong> Without sound enabled, you may miss new orders. 
            This is a one-time setup required by your browser.
          </p>
        </div>

        {/* Enable button */}
        <button
          onClick={handleEnableAudio}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
        >
          <Volume2 className="h-5 w-5" />
          Enable Sound Notifications
        </button>

        {/* Info text */}
        <p className="text-xs text-gray-500 text-center mt-4">
          You can mute notifications later using the mute button in the header
        </p>
      </div>
    </div>
  );
}

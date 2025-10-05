# Notification Sound

## Setup Instructions

To enable notification sounds, you need to add a subtle notification sound file.

### Option 1: Use a Subtle Ping Sound

1. Find or create a short, subtle notification sound (0.1-0.3 seconds)
2. Save it as `notification.mp3` in this directory
3. Keep the file size small (<50KB)

### Option 2: Download Free Sound

You can download a free notification sound from these sources:

- **Zapsplat**: https://www.zapsplat.com/sound-effect-category/ui-beeps-and-alerts/
- **Freesound**: https://freesound.org/search/?q=notification+ping
- **Mixkit**: https://mixkit.co/free-sound-effects/notification/

### Recommended Sound Characteristics

- **Duration**: 0.1-0.5 seconds
- **Volume**: Soft, not jarring
- **Pitch**: Mid to high (not deep bass)
- **Type**: Simple beep, ping, or chime
- **Format**: MP3 or OGG

### Option 3: Disable Sound

If you prefer to disable notification sounds entirely:

1. Open `src/core/services/notifications/NotificationService.ts`
2. In the `playNotificationSound` method, add `return;` at the beginning
3. Save the file

The notification system will still work visually without sound.

### Testing

After adding the sound file:
1. Restart your development server
2. Create a test order or notification
3. Listen for the subtle ping sound
4. Adjust volume if needed by modifying the `audio.volume` value in NotificationService

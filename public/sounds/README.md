# Station Notification Sounds

## 🔊 Robust Notification System v2.0

This system uses **3 distinct sound files** for different stations and **repeating alerts** for maximum reliability in noisy restaurant environments.

---

## Required Sound Files

You need to add **THREE** distinct notification sound files to this directory:

### 1. `notification.mp3` - General Notifications
- **Used by:** Kitchen, Bartender, Waiter (default/fallback)
- **Type:** Clear ping or beep
- **Duration:** 0.5-1.5 seconds
- **Volume:** LOUD (will play at 100% volume)
- **Characteristics:** Attention-grabbing, professional

### 2. `kitchen-alert.mp3` - Kitchen Station (Optional)
- **Used by:** Kitchen display for food orders
- **Type:** Distinctive ping sound
- **Suggestion:** Single high-pitched beep

### 3. `bartender-alert.mp3` - Bartender Station (Optional)
- **Used by:** Bartender display for drink orders
- **Type:** Distinctive bell sound
- **Suggestion:** Two-tone chime or bell

### 4. `waiter-alert.mp3` - Waiter Station (Optional)
- **Used by:** Waiter display for ready orders
- **Type:** Distinctive completion sound
- **Suggestion:** Three-tone ascending chime

---

## Important Requirements

### ⚠️ Must Be LOUD

Unlike v1.0, these sounds will play at **100% volume** and **repeat 3 times** to ensure they're heard in noisy environments:

- **Volume:** Will be played at `audio.volume = 1.0` (maximum)
- **Repetition:** Each sound plays 3 times with 1-second gaps
- **Duration:** Keep sounds SHORT (0.5-1.5 seconds) since they repeat

### Sound Characteristics

- ✅ **Loud & Clear:** Must cut through kitchen/bar noise
- ✅ **Distinct:** Each station should have unique sound (helps staff identify which station)
- ✅ **Short:** 0.5-1.5 seconds (will repeat 3x)
- ✅ **Professional:** Not annoying with repetition
- ✅ **File Size:** <100KB each for fast loading
- ✅ **Format:** MP3 preferred (best browser support)

---

## Download Free Sounds

### Recommended Sources:

1. **Zapsplat** (Free with attribution)
   - https://www.zapsplat.com/sound-effect-category/ui-beeps-and-alerts/
   - High-quality, professional sounds
   - Search: "notification beep", "alert ping", "order bell"

2. **Freesound** (Creative Commons)
   - https://freesound.org/search/?q=notification
   - Community-created sounds
   - Search: "ping", "bell", "chime", "alert"

3. **Mixkit** (Free for commercial use)
   - https://mixkit.co/free-sound-effects/notification/
   - Professional sound effects
   - No attribution required

4. **Notification Sounds** (Free)
   - https://notificationsounds.com/
   - Large collection of alert sounds

### Sound Suggestions:

| File | Type | Example Search Terms |
|------|------|---------------------|
| `notification.mp3` | Generic alert | "notification ping", "alert beep" |
| `kitchen-alert.mp3` | Kitchen orders | "kitchen bell", "order ping", "ding" |
| `bartender-alert.mp3` | Drink orders | "bar bell", "service bell", "chime" |
| `waiter-alert.mp3` | Ready orders | "completion sound", "success chime", "ready bell" |

---

## Installation Steps

### Step 1: Download Sounds

1. Visit one of the recommended sources above
2. Download 3-4 distinct notification sounds
3. Ensure they meet the requirements (loud, short, clear)

### Step 2: Add to Project

1. Place the downloaded files in this directory:
   ```
   public/sounds/
   ├── notification.mp3        ← REQUIRED (general fallback)
   ├── kitchen-alert.mp3       ← Optional (kitchen-specific)
   ├── bartender-alert.mp3     ← Optional (bartender-specific)
   └── waiter-alert.mp3        ← Optional (waiter-specific)
   ```

2. If you only have one sound file, copy it to all 4 names:
   ```bash
   cp your-sound.mp3 notification.mp3
   cp your-sound.mp3 kitchen-alert.mp3
   cp your-sound.mp3 bartender-alert.mp3
   cp your-sound.mp3 waiter-alert.mp3
   ```

### Step 3: Test

1. Restart your development server
2. Open a station display (Kitchen/Bartender/Waiter)
3. Create a test order
4. **You should hear the sound play 3 times** with 1-second gaps

---

## How the System Works

### On New Order:

1. **Sound plays 3 times** (1 second apart) at **100% volume**
2. **Vibration** triggers (mobile devices only)
3. **Browser notification** shows (even when tab not focused)
4. **UI toast** appears in the app

### For Unacknowledged Orders:

- If staff doesn't open the order, sound **re-alerts every 30 seconds**
- Up to **5 repeat alerts** maximum
- Stops once staff views the order

### Visual Escalation:

- Orders > 5 minutes: **Yellow warning banner**
- Orders > 10 minutes: **Red flashing banner** + screen flash

---

## Customization

### Adjust Repetition Count

In `src/lib/hooks/useStationNotification.ts`:
```typescript
playSound(soundFile, 3); // Change 3 to desired count (1-5 recommended)
```

### Adjust Repeat Interval

In station displays (Kitchen/Bartender/Waiter):
```typescript
useOrderAcknowledgment({
  repeatInterval: 30, // Change to desired seconds (15-60 recommended)
  maxRepeats: 5,      // Maximum number of re-alerts
});
```

### Disable Repetition

Set repeat count to 1:
```typescript
playSound(soundFile, 1); // Play once only
```

---

## Troubleshooting

### No Sound Playing?

1. **Check file exists:** Ensure `notification.mp3` is in `public/sounds/`
2. **Check browser autoplay:** Click "Enable Sound" prompt on page load
3. **Check mute button:** Ensure station is not muted (volume icon in header)
4. **Check console:** Look for audio playback errors in browser console

### Sound Too Loud?

The system plays at 100% volume by design for noisy environments. To reduce:
1. Lower your device/speaker volume
2. OR modify `audio.volume = 1.0` to `0.7` in `useStationNotification.ts`

### Sound Too Quiet?

1. Increase your device/speaker volume
2. Try different sound files (some are naturally louder)
3. Use sound editing software to amplify the audio file

---

## License Notes

- Ensure any downloaded sounds are licensed for commercial use
- Some sources require attribution - check license terms
- Mixkit and many Freesound files are free for commercial use
- When in doubt, use royalty-free sounds from Mixkit

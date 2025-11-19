# Station Notification System - Current Implementation & Improvement Plan

**Date:** November 19, 2025  
**Stations:** Kitchen, Bartender, Waiter

---

## Current Implementation Overview

### Architecture

The notification system uses a **multi-layered approach** with:

1. **Custom Hook** (`useStationNotification`) - Reusable notification logic
2. **Realtime Subscriptions** (Supabase) - Database change detection
3. **Multiple Notification Channels** - Sound, vibration, browser notifications, UI toasts
4. **Per-station Configuration** - Each station has customized alerts

### How It Currently Works

#### 1. Real-time Database Monitoring

Each station subscribes to `kitchen_orders` table changes via **Supabase Realtime**:

```typescript
supabase
  .channel('kitchen-orders-realtime')
  .on('postgres_changes', {
    event: '*', // INSERT, UPDATE, DELETE
    schema: 'public',
    table: 'kitchen_orders',
  }, async (payload) => {
    // Handle the change
  })
```

#### 2. Notification Trigger Points

| Station | Trigger Event | Condition |
|---------|--------------|-----------|
| **Kitchen** | `INSERT` | New order sent to kitchen |
| **Bartender** | `INSERT` | New order sent to bartender |
| **Waiter** | `UPDATE` | Order status changed to 'ready' |

#### 3. Notification Channels (Per New Order)

When a new order arrives, **4 notifications** fire simultaneously:

| Channel | Method | Current Implementation |
|---------|--------|----------------------|
| **1. Sound** | HTML5 Audio API | `audio.volume = 0.6` (60% volume) |
| **2. Vibration** | Vibration API | Pattern: `[200, 100, 200]` ms |
| **3. Browser Notification** | Notification API | System-level alert (even when tab not focused) |
| **4. UI Toast** | In-app toast | Visual alert within the app |

---

## Current Issues & Limitations

### 🔴 **Critical Issues**

#### 1. **Sound File Missing**
- **Problem:** `/sounds/notification.mp3` doesn't exist (only `.gitkeep` in folder)
- **Impact:** Sound notifications silently fail with console warning
- **Location:** `public/sounds/` directory is empty

#### 2. **Volume Too Low (60%)**
```typescript
// Current - lib/hooks/useStationNotification.ts:92
audio.volume = 0.6; // Moderate volume - TOO QUIET for busy kitchen
```
- **60% volume** is insufficient in noisy restaurant environment
- Users must constantly monitor screen instead of relying on audio cues

#### 3. **Single, Short Sound**
- Only plays **ONCE** when order arrives
- Easy to miss in busy/noisy environment
- No **repeating alerts** for unacknowledged orders

#### 4. **Browser Autoplay Restrictions**
```typescript
audio.play().catch(err => {
  // User might need to interact with page first
  console.warn('Could not play notification sound:', err.message);
});
```
- Modern browsers **block audio autoplay** until user interacts with page
- First notification may not play sound if page just loaded
- No visual feedback when sound is blocked

### 🟡 **Medium Priority Issues**

#### 5. **No Escalation for Missed Notifications**
- If staff misses the initial notification, **nothing happens**
- Orders can sit unnoticed for extended periods
- No visual/audio escalation for aging orders

#### 6. **Generic Sound for All Stations**
- Kitchen, Bartender, Waiter all use **same sound**
- Staff can't distinguish which station has new order without looking

#### 7. **Inconsistent Filtering**
- Subscription listens to **ALL** `kitchen_orders` changes
- Each station must filter for their destination
- Causes unnecessary network traffic and processing

#### 8. **Limited Browser Notification Control**
- Browser notifications require user permission
- No persistence if permission denied
- Limited customization options

### 🟢 **Minor Issues**

#### 9. **Vibration Patterns Not Device-Tested**
- Vibration works on mobile only
- Desktop/tablet staff get no vibration feedback
- Patterns may be too subtle

#### 10. **Mute State Only in LocalStorage**
- Mute setting doesn't sync across devices
- If staff uses multiple tablets, must mute each separately

---

## Recommended Improvements

### **Priority 1: Sound Robustness** 🔊

#### 1.1 Add Actual Sound Files
Create 3 distinct notification sounds:

```
public/sounds/
├── kitchen-alert.mp3     # Kitchen orders (e.g., ping sound)
├── bartender-alert.mp3   # Bartender orders (e.g., bell sound)
├── waiter-alert.mp3      # Ready orders (e.g., chime sound)
└── urgent-alert.mp3      # Overdue orders (e.g., louder alarm)
```

**Requirements:**
- **Loud & Clear:** Must be audible in noisy environment
- **Distinct:** Each station has unique sound
- **Short:** 0.5-1.5 seconds duration
- **Quality:** Professional, not annoying with repetition
- **File Size:** <100KB each for fast loading

#### 1.2 Increase Volume to Maximum
```typescript
// Recommended change
audio.volume = 1.0; // 100% volume for maximum audibility
```

#### 1.3 Implement Repeating Alerts
```typescript
// Repeat sound 3 times with 1-second gaps
const repeatSound = (soundPath: string, times: number = 3, interval: number = 1000) => {
  let count = 0;
  const play = () => {
    if (count < times) {
      const audio = new Audio(soundPath);
      audio.volume = 1.0;
      audio.play().catch(console.warn);
      count++;
      setTimeout(play, interval);
    }
  };
  play();
};
```

**Benefits:**
- Harder to miss (3x louder overall)
- Better attention-grabbing
- Customizable repetition count

#### 1.4 Add User Interaction Prompt
```typescript
// On page load, request user to enable audio
const enableAudio = () => {
  const dummy = new Audio('/sounds/kitchen-alert.mp3');
  dummy.volume = 0.01; // Very quiet test
  dummy.play()
    .then(() => console.log('✅ Audio enabled'))
    .catch(() => {
      // Show prominent "Enable Sound" button
      showEnableAudioPrompt();
    });
};
```

---

### **Priority 2: Visual Escalation** 🚨

#### 2.1 Flashing Header for Pending Orders
```typescript
// Flash header background when orders are pending > 5 minutes
const useOrderAgeAlert = (orders) => {
  const hasOverdueOrders = orders.some(order => {
    const age = (Date.now() - new Date(order.sent_at).getTime()) / 60000;
    return age > 5; // 5 minutes threshold
  });
  
  return hasOverdueOrders;
};

// In component
{hasOverdueOrders && (
  <div className="animate-pulse bg-red-500 text-white p-2">
    ⚠️ ORDERS WAITING OVER 5 MINUTES!
  </div>
)}
```

#### 2.2 Screen Flash Effect
```typescript
// Full-screen flash for critical alerts
const flashScreen = () => {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-red-500 opacity-50 pointer-events-none z-50 animate-ping';
  document.body.appendChild(overlay);
  setTimeout(() => overlay.remove(), 1000);
};
```

---

### **Priority 3: Persistent Audio for Unacknowledged Orders** ⏰

#### 3.1 Implement Alert Acknowledgment System
```typescript
// Add acknowledgment tracking
interface OrderAlert {
  orderId: string;
  timestamp: number;
  acknowledged: boolean;
  soundPlayed: number; // Count of times sound played
}

const unacknowledgedAlerts = new Map<string, OrderAlert>();

// On new order
const handleNewOrder = (orderId: string) => {
  unacknowledgedAlerts.set(orderId, {
    orderId,
    timestamp: Date.now(),
    acknowledged: false,
    soundPlayed: 0
  });
  
  playRepeatingSound();
};

// Acknowledge when staff opens/views the order
const acknowledgeOrder = (orderId: string) => {
  unacknowledgedAlerts.delete(orderId);
};
```

#### 3.2 Auto-Repeat for Unacknowledged Orders
```typescript
// Every 30 seconds, re-alert for unacknowledged orders
setInterval(() => {
  const now = Date.now();
  
  unacknowledgedAlerts.forEach((alert, orderId) => {
    const age = (now - alert.timestamp) / 1000; // seconds
    
    // Re-alert every 30 seconds, up to 5 times
    if (!alert.acknowledged && age >= 30 && alert.soundPlayed < 5) {
      playRepeatingSound();
      alert.soundPlayed++;
    }
  });
}, 30000); // Check every 30 seconds
```

---

### **Priority 4: Station-Specific Filtering** 🎯

#### 4.1 Filter at Subscription Level
```typescript
// Kitchen - Only subscribe to kitchen_orders WHERE destination = 'kitchen'
const channel = supabase
  .channel('kitchen-orders-realtime')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'kitchen_orders',
    filter: `destination=eq.kitchen` // 🎯 Filter at database level
  }, handleChange)
```

**Benefits:**
- **Less bandwidth:** Only relevant orders transmitted
- **Faster processing:** No client-side filtering needed
- **Reduced CPU:** Fewer event handlers triggered

---

### **Priority 5: Enhanced Browser Notifications** 🔔

#### 5.1 Persistent Notifications with Actions
```typescript
const showPersistentNotification = async (title: string, body: string) => {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    const registration = await navigator.serviceWorker.ready;
    
    await registration.showNotification(title, {
      body,
      icon: '/beerhive-logo.png',
      badge: '/beerhive-logo.png',
      tag: 'kitchen-order',
      requireInteraction: true, // ✅ Notification persists until dismissed
      vibrate: [200, 100, 200],
      actions: [
        { action: 'view', title: 'View Order' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });
  }
};
```

#### 5.2 Wake Lock API (Keep Screen On)
```typescript
// Prevent screen from turning off during shifts
const requestWakeLock = async () => {
  if ('wakeLock' in navigator) {
    try {
      const wakeLock = await navigator.wakeLock.request('screen');
      console.log('✅ Screen will stay on');
      
      // Release when tab is hidden
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          navigator.wakeLock.request('screen');
        }
      });
    } catch (err) {
      console.warn('Wake Lock not supported:', err);
    }
  }
};
```

---

## Implementation Phases

### **Phase 1: Quick Wins (1-2 hours)**
1. ✅ Add notification sound files to `/public/sounds/`
2. ✅ Increase volume from 0.6 → 1.0
3. ✅ Implement 3x sound repetition
4. ✅ Add distinct sounds per station

### **Phase 2: Enhanced Alerts (3-4 hours)**
1. ✅ Add order age tracking
2. ✅ Implement flashing alerts for old orders
3. ✅ Add acknowledgment system
4. ✅ Auto-repeat alerts every 30 seconds

### **Phase 3: Advanced Features (4-6 hours)**
1. ✅ Implement station-specific subscription filtering
2. ✅ Add persistent browser notifications
3. ✅ Implement Wake Lock API
4. ✅ Add sound enablement prompt on page load

---

## Testing Plan

### Manual Testing

1. **Sound Test:**
   - Create order → Verify 3 repetitions
   - Test with muted state
   - Test different station sounds

2. **Escalation Test:**
   - Create order → Wait 5 minutes → Verify visual alert
   - Create order → Don't acknowledge → Wait 30s → Verify re-alert

3. **Browser Notification Test:**
   - Test with tab focused
   - Test with tab in background
   - Test with browser minimized

4. **Cross-device Test:**
   - Test on mobile device (vibration)
   - Test on tablet (no vibration)
   - Test on desktop browser

### Automated Testing

```typescript
describe('Station Notifications', () => {
  it('should play sound 3 times for new orders', async () => {
    const mockAudio = jest.fn();
    global.Audio = mockAudio;
    
    playNotification('newOrder');
    
    await waitFor(() => {
      expect(mockAudio).toHaveBeenCalledTimes(3);
    });
  });
  
  it('should escalate unacknowledged orders', async () => {
    // Test logic here
  });
});
```

---

## Summary of Benefits

| Current State | With Improvements |
|--------------|------------------|
| ❌ Silent (no sound file) | ✅ Loud, distinct sounds |
| ❌ 60% volume | ✅ 100% volume |
| ❌ Single play | ✅ 3x repetition |
| ❌ Easy to miss | ✅ Re-alerts every 30s |
| ❌ No visual escalation | ✅ Flashing alerts for old orders |
| ❌ Generic for all stations | ✅ Station-specific sounds |
| ❌ May not play (autoplay block) | ✅ User prompt to enable audio |

**Result:** Staff will be immediately and persistently alerted to new orders without needing to constantly monitor the screen.

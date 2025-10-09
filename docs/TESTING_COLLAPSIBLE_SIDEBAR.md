# Testing Guide: Collapsible Sidebar Feature

**Date**: October 9, 2025  
**Feature**: Collapsible Sidebar  
**Priority**: Medium  
**Estimated Testing Time**: 15 minutes

---

## Quick Start

### Prerequisites
- [ ] Development server running (`npm run dev`)
- [ ] Logged in as any user role
- [ ] Desktop browser window (≥1024px width)

---

## Test Cases

### 1. Initial State ✅

**Steps:**
1. Log in to the system
2. Navigate to any dashboard page

**Expected Results:**
- ✅ Sidebar is visible on desktop (≥1024px)
- ✅ Sidebar shows full width (256px)
- ✅ All menu items show icons AND labels
- ✅ Toggle button visible at bottom showing "◀ Collapse"
- ✅ Brand text "BeerHive POS" visible at top

---

### 2. Collapse Functionality ✅

**Steps:**
1. Click the "◀ Collapse" button at the bottom of sidebar

**Expected Results:**
- ✅ Sidebar smoothly transitions from 256px to 64px (300ms animation)
- ✅ Menu item labels disappear
- ✅ Only icons remain visible
- ✅ Toggle button now shows only "▶" icon
- ✅ Brand text "BeerHive POS" disappears, only logo remains
- ✅ Copyright text changes from "© 2025 BeerHive POS" to "©"
- ✅ Main content area expands to use freed space

---

### 3. Expand Functionality ✅

**Steps:**
1. With sidebar collapsed, click the "▶" toggle button

**Expected Results:**
- ✅ Sidebar smoothly transitions from 64px to 256px
- ✅ Menu item labels appear next to icons
- ✅ Toggle button shows "◀ Collapse" text
- ✅ Brand text "BeerHive POS" appears
- ✅ Full copyright text appears
- ✅ Main content area adjusts width

---

### 4. Tooltips in Collapsed State ✅

**Steps:**
1. Collapse the sidebar
2. Hover over each menu icon

**Expected Results:**
- ✅ Tooltip appears showing full menu label
- ✅ Tooltips work for all menu items
- ✅ Toggle button shows "Expand sidebar" tooltip when hovered

---

### 5. Navigation in Collapsed State ✅

**Steps:**
1. Collapse the sidebar
2. Click on any menu icon (e.g., POS, Kitchen, etc.)

**Expected Results:**
- ✅ Navigation works correctly
- ✅ Page navigates to correct route
- ✅ Active state highlighting works
- ✅ Sidebar remains collapsed after navigation

---

### 6. Active State Highlighting ✅

**Steps:**
1. Navigate to different pages in both expanded and collapsed states
2. Observe the active menu item

**Expected Results:**
- ✅ Active item highlighted with amber background
- ✅ Highlighting works in expanded state
- ✅ Highlighting works in collapsed state
- ✅ Active state visually clear in both modes

---

### 7. Keyboard Navigation ✅

**Steps:**
1. Press Tab key to focus on sidebar elements
2. Navigate through menu items
3. Press Enter on toggle button

**Expected Results:**
- ✅ Focus ring visible on all interactive elements
- ✅ Can tab through all menu items
- ✅ Toggle button accessible via keyboard
- ✅ Enter key toggles collapse state
- ✅ Focus remains visible in both states

---

### 8. Mobile Responsiveness ✅

**Steps:**
1. Resize browser to mobile width (<1024px)
2. Click hamburger menu icon
3. Open mobile drawer

**Expected Results:**
- ✅ Sidebar hidden by default on mobile
- ✅ Hamburger menu appears in header
- ✅ Mobile drawer opens with full-width sidebar
- ✅ NO collapse toggle button visible in mobile drawer
- ✅ Mobile drawer always shows full labels
- ✅ Clicking menu item closes drawer

---

### 9. Tablet/Small Desktop (1024px-1280px) ✅

**Steps:**
1. Resize browser to 1024px-1280px width
2. Test collapsed and expanded states

**Expected Results:**
- ✅ Sidebar behaves same as larger desktops
- ✅ Toggle button available
- ✅ Collapse functionality works
- ✅ No layout breaks or overflow issues

---

### 10. Animation Smoothness ✅

**Steps:**
1. Rapidly toggle collapse/expand multiple times
2. Observe animation behavior

**Expected Results:**
- ✅ Smooth 300ms transition
- ✅ No janky or stuttering animations
- ✅ Content shifts smoothly
- ✅ No visual glitches or flashing

---

### 11. State Persistence ✅

**Steps:**
1. Collapse sidebar
2. Navigate to different page
3. Refresh the browser

**Expected Results:**
- ✅ Collapsed state persists during page navigation
- ✅ State resets to expanded after browser refresh
- ⚠️ (Expected: No localStorage persistence in v1)

---

### 12. Role-Based Access ✅

**Steps:**
1. Test with different user roles
2. Verify collapse functionality for each role

**Test Matrix:**

| Role | Sidebar Visible | Collapse Works | Menu Items Filtered |
|------|----------------|----------------|---------------------|
| ADMIN | ✅ | ✅ | All items visible |
| MANAGER | ✅ | ✅ | Manager items |
| CASHIER | ✅ | ✅ | Cashier items |
| KITCHEN | ✅ | ✅ | Kitchen items |
| BARTENDER | ✅ | ✅ | Bartender items |
| WAITER | ✅ | ✅ | Waiter items |

---

### 13. Accessibility Testing ✅

**Steps:**
1. Use screen reader (NVDA/JAWS/VoiceOver)
2. Navigate sidebar with keyboard only
3. Check ARIA labels

**Expected Results:**
- ✅ Screen reader announces menu items correctly
- ✅ Screen reader announces "Expand sidebar" / "Collapse sidebar"
- ✅ `aria-label` present on collapsed menu items
- ✅ `title` attributes provide tooltips
- ✅ Focus management works properly
- ✅ All interactive elements accessible

---

### 14. Multiple Tabs/Windows ✅

**Steps:**
1. Open application in two browser tabs
2. Collapse sidebar in one tab
3. Check other tab

**Expected Results:**
- ✅ Each tab maintains independent state
- ✅ Collapsing in one tab doesn't affect other
- ✅ No state synchronization between tabs

---

### 15. Logo/Brand Display ✅

**Steps:**
1. Test with logo image available
2. Test with logo image missing/error
3. Toggle collapse state

**Expected Results:**
- ✅ Logo image displays when available
- ✅ Fallback Beer icon shows on error
- ✅ Logo remains visible in collapsed state
- ✅ Brand text hides in collapsed state
- ✅ Logo size consistent (32x32px)

---

## Browser Compatibility

Test on the following browsers:

### Desktop Browsers
- [ ] **Chrome** (Latest) - Windows/Mac
- [ ] **Firefox** (Latest) - Windows/Mac
- [ ] **Safari** (Latest) - Mac
- [ ] **Edge** (Latest) - Windows

### Mobile Browsers
- [ ] **Chrome Mobile** - Android
- [ ] **Safari Mobile** - iOS
- [ ] **Samsung Internet** - Android

---

## Performance Checks

### 1. Animation Performance
- [ ] No frame drops during transition
- [ ] Smooth 60fps animation
- [ ] No layout thrashing

### 2. Memory Usage
- [ ] No memory leaks on toggle
- [ ] State updates don't cause re-renders of unrelated components

### 3. Bundle Size
- [ ] Added icons don't significantly increase bundle
- [ ] Code splitting works correctly

---

## Known Issues / Expected Behavior

### ✅ Expected (Not Issues)

1. **State Resets on Refresh**
   - Collapse state is session-based
   - Intentionally resets to expanded on page load
   - Future enhancement: localStorage persistence

2. **Desktop Only**
   - Collapse feature only on desktop (≥1024px)
   - Mobile always uses drawer overlay
   - This is by design for better mobile UX

3. **No Animation on Initial Load**
   - Sidebar starts expanded without transition
   - Transition only on user interaction
   - Prevents jarring initial page load

---

## Regression Testing

Ensure existing features still work:

- [ ] **Navigation** - All links work correctly
- [ ] **Role Filtering** - Menu items filtered by role
- [ ] **Active States** - Current page highlighted
- [ ] **Mobile Drawer** - Hamburger menu + overlay works
- [ ] **Header** - Notification bell and user menu work
- [ ] **Logout** - User can log out successfully
- [ ] **Page Content** - No layout breaks on any page

---

## Quick Test Script

Copy-paste this checklist for rapid testing:

```
□ Log in to system
□ Verify sidebar expanded by default
□ Click "Collapse" button → sidebar shrinks to icons
□ Hover icons → tooltips appear
□ Click menu icons → navigation works
□ Click "Expand" button → sidebar expands
□ Navigate to 3+ different pages → state persists
□ Resize to mobile → drawer works, no collapse button
□ Resize to desktop → collapse button appears
□ Tab through menu with keyboard → focus visible
□ Refresh page → sidebar resets to expanded
```

---

## Bug Reporting Template

If issues found, use this template:

```markdown
**Issue Title**: [Brief description]

**Severity**: Critical / High / Medium / Low

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Result**: 
[What should happen]

**Actual Result**: 
[What actually happened]

**Environment**:
- Browser: [e.g., Chrome 120]
- OS: [e.g., Windows 11]
- Screen Size: [e.g., 1920x1080]
- User Role: [e.g., ADMIN]

**Screenshots/Video**: 
[Attach if available]
```

---

## Sign-Off Checklist

Before marking as complete:

- [ ] All test cases passed
- [ ] No critical bugs found
- [ ] Tested on 2+ browsers
- [ ] Tested on mobile + desktop
- [ ] Accessibility verified
- [ ] Performance acceptable
- [ ] Documentation reviewed
- [ ] Regression tests passed

---

**Tester Name**: ________________  
**Date Tested**: ________________  
**Build/Version**: ________________  
**Status**: ☐ PASS | ☐ FAIL | ☐ NEEDS REVIEW

---

**Tested By**: Pending  
**Test Date**: October 9, 2025  
**Status**: ⏳ Ready for Testing

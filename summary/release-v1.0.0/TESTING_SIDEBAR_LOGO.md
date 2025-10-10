# Testing Guide: Sidebar Logo Fix

## Prerequisites
- Ensure the development server is running
- Have access to different user roles for comprehensive testing

## Test 1: Verify Logo Displays Correctly

### Steps:
1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open browser and navigate to `http://localhost:3000`

3. Log in with any valid user credentials

4. Check the sidebar on the left side of the dashboard

### Expected Result:
✅ BeerHive logo should appear in the sidebar header (32x32px size)
✅ Logo should be displayed next to "BeerHive POS" text
✅ Logo should load quickly (marked as priority)

### If Logo Doesn't Appear:
- Check browser console (F12) for error messages
- Verify `/public/beerhive-logo.png` file exists
- You should see a Beer icon (🍺) as fallback if the image fails

---

## Test 2: Verify Fallback Behavior

### Steps:
1. Temporarily rename the logo file:
   ```bash
   # In the project root
   cd public
   rename beerhive-logo.png beerhive-logo.png.bak
   ```

2. Refresh the browser (Ctrl+Shift+R for hard refresh)

3. Check the sidebar

### Expected Result:
✅ A Beer icon (🍺) in amber color should appear instead of the logo
✅ Browser console should show: "Failed to load BeerHive logo from /beerhive-logo.png"
✅ No broken image icon should be visible

### Restore the logo:
```bash
cd public
rename beerhive-logo.png.bak beerhive-logo.png
```

---

## Test 3: Verify Across Different User Roles

### Steps:
Test with each user role to ensure logo displays consistently:

1. **ADMIN Role**:
   - Login as admin
   - Verify logo appears in sidebar

2. **MANAGER Role**:
   - Login as manager
   - Verify logo appears in sidebar

3. **CASHIER Role**:
   - Login as cashier
   - Verify logo appears in sidebar

4. **KITCHEN Role**:
   - Login as kitchen staff
   - Verify logo appears in sidebar

5. **BARTENDER Role**:
   - Login as bartender
   - Verify logo appears in sidebar

6. **WAITER Role**:
   - Login as waiter
   - Verify logo appears in sidebar

### Expected Result:
✅ Logo displays correctly for all user roles
✅ No layout issues or misalignment

---

## Test 4: Verify Responsive Behavior

### Desktop (Screen width > 1024px):
1. Open dashboard in full-screen browser window
2. Verify logo appears in left sidebar

### Mobile/Tablet (Screen width < 1024px):
1. Resize browser window to mobile size (or use mobile device)
2. Click the hamburger menu icon
3. Mobile sidebar drawer should open
4. Verify logo appears in mobile sidebar

### Expected Result:
✅ Logo displays correctly in both desktop sidebar and mobile drawer
✅ Logo maintains proper size and alignment on all screen sizes

---

## Test 5: Verify Performance

### Steps:
1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "Img"
4. Refresh the page
5. Look for `beerhive-logo.png` in the network requests

### Expected Result:
✅ Image loads successfully (Status: 200)
✅ Image size is reasonable (~480KB based on file)
✅ Image loads with high priority (check Priority column)

---

## Troubleshooting

### Issue: Logo still not appearing
**Solutions:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh the page (Ctrl+Shift+R)
3. Check if `/public/beerhive-logo.png` exists
4. Restart the development server
5. Check browser console for errors

### Issue: Fallback icon not appearing
**Solutions:**
1. Verify `Beer` icon is imported from lucide-react
2. Check browser console for import errors
3. Ensure lucide-react package is installed: `npm install lucide-react`

### Issue: Image appears broken
**Solutions:**
1. Verify image file is valid (open it directly)
2. Check file permissions
3. Try using absolute path: `http://localhost:3000/beerhive-logo.png`

---

## Verification Checklist

Use this checklist to confirm all tests pass:

- [ ] Logo displays in desktop sidebar
- [ ] Logo displays in mobile sidebar drawer
- [ ] Fallback icon works when logo is missing
- [ ] Error message appears in console when logo fails
- [ ] Logo displays for all user roles
- [ ] No broken image icons appear
- [ ] Logo loads with high priority
- [ ] Layout remains consistent with and without logo
- [ ] No TypeScript/ESLint errors in modified files

---

## Additional Notes

- The logo should be 32x32 pixels in the sidebar
- Fallback Beer icon is amber colored (#D97706)
- Logo uses `unoptimized` prop for compatibility
- Component uses proper error handling for production use

## Quick Verification Commands

```bash
# Check if logo file exists
ls -la public/beerhive-logo.png

# Verify no syntax errors in Sidebar component
npx tsc --noEmit src/views/shared/layouts/Sidebar.tsx

# Start development server
npm run dev

# Check for linting issues
npm run lint
```

---

## Success Criteria

All tests pass when:
1. ✅ Logo displays correctly in all scenarios
2. ✅ Fallback works when logo is unavailable  
3. ✅ No console errors (except expected error for fallback test)
4. ✅ Consistent behavior across all user roles
5. ✅ Responsive design works on all screen sizes

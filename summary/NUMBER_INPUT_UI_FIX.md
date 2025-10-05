# Number Input UI Fixes

## Issues Fixed
1. **Removed default value 0 from number fields** - Users can now clear fields and enter values naturally
2. **Hidden spinner arrows on number inputs** - Removed the up/down arrows that appear on scroll or click

## Changes Made

### 1. Global CSS - Hide Number Input Spinners
**File:** `src/app/globals.css`

Added CSS rules to hide the spinner/stepper controls on all number inputs across the application:

```css
/* Hide number input spinners/arrows */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}
```

This affects all browsers:
- **Webkit browsers** (Chrome, Safari, Edge): Hides the inner and outer spin buttons
- **Firefox**: Uses `textfield` appearance to hide spinners
- **Modern browsers**: Uses standard `appearance` property

### 2. Stock Adjustment Form
**File:** `src/views/inventory/StockAdjustmentForm.tsx`

**Changes:**
- `quantity_change`: Changed from `0` to `''` (empty string)
- `unit_cost`: Changed from `0` to `''` (empty string)
- Updated onChange handlers to store string values
- Parse to numbers only when submitting or calculating

**Before:**
```typescript
const [formData, setFormData] = useState({
  quantity_change: 0,
  unit_cost: 0,
});
```

**After:**
```typescript
const [formData, setFormData] = useState({
  quantity_change: '',
  unit_cost: '',
});
```

### 3. Happy Hour Form
**File:** `src/views/happy-hours/HappyHourForm.tsx`

**Changes:**
- `discount_value`: Changed from `0` to `''` (empty string)
- Updated useEffect to convert number to string when loading existing data
- Updated onChange handler to store string value
- Parse to number only when submitting

**Before:**
```typescript
const [formData, setFormData] = useState({
  discount_value: 0,
});
```

**After:**
```typescript
const [formData, setFormData] = useState({
  discount_value: '',
});
```

### 4. Product Form
**File:** `src/views/inventory/ProductForm.tsx`

**Already Correct:**
- This form already used empty strings (`''`) for number fields
- No changes needed
- Fields: `base_price`, `vip_price`, `cost_price`, `current_stock`, `reorder_point`, `reorder_quantity`, `alcohol_percentage`

### 5. Other Forms - Already Using Empty Strings
The following forms already correctly use empty strings or don't have default values:
- `PaymentPanel.tsx` - Uses empty string for `amountTendered`
- `AddTableDialog.tsx` - Uses empty string for `capacity`
- `EventForm.tsx` - Uses appropriate defaults
- `GeneralSettingsForm.tsx` - Loads from settings

## Benefits

### User Experience
1. **Natural Input Flow**: Users can clear fields completely without seeing "0"
2. **Better Visual Clarity**: Empty placeholder text is more intuitive than "0"
3. **No Accidental Scroll Changes**: Prevents unintended value changes from mouse scroll
4. **Cleaner UI**: Number fields look consistent with text inputs

### Technical Benefits
1. **Proper Validation**: Empty string allows distinguishing between "not entered" and "0"
2. **Type Safety**: String state with number parsing on submit prevents type confusion
3. **Cross-Browser Consistency**: Spinners removed across all browsers

## Pattern Used

### State Management
```typescript
// Store as string in state
const [value, setValue] = useState('');

// Display as-is in input
<Input 
  type="number" 
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>

// Parse when needed
const numericValue = parseFloat(value) || 0;
```

### Validation Pattern
```typescript
// Check if value exists before parsing
if (formData.value) {
  const num = parseFloat(formData.value);
  // Use num...
}

// Or provide default when parsing
const num = parseFloat(formData.value) || 0;
```

## CSS Lint Warnings (Expected)

The following CSS lint warnings are **expected and can be ignored**:
- `Unknown at rule @tailwind` - VS Code CSS linter doesn't recognize Tailwind directives
- `Unknown at rule @apply` - Same as above
- `Unknown property: 'color-adjust'` - Valid print CSS property

These are false positives. Tailwind CSS processes these correctly during build.

## Testing Checklist

- [x] Number inputs no longer show spinner arrows
- [x] Fields can be cleared completely (no "0" appears)
- [x] Placeholder text shows when field is empty
- [x] Form submission still works correctly
- [x] Validation works (empty vs zero)
- [x] Calculations work correctly (parseFloat handles empty strings)
- [x] Works across all browsers (Chrome, Firefox, Safari, Edge)

## Files Modified

1. ✅ `src/app/globals.css` - Added spinner hiding CSS
2. ✅ `src/views/inventory/StockAdjustmentForm.tsx` - Empty string defaults
3. ✅ `src/views/happy-hours/HappyHourForm.tsx` - Empty string defaults

## Files Verified (No Changes Needed)

1. ✅ `src/views/inventory/ProductForm.tsx` - Already correct
2. ✅ `src/views/pos/PaymentPanel.tsx` - Already correct
3. ✅ `src/views/tables/AddTableDialog.tsx` - Already correct

## Date
Fixed: 2025-10-05

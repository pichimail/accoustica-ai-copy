# Mobile Layout Fixes: Z-Index & Positioning

## Problem Statement

The mobile application had three critical layout issues:

1. **Bottom Navigation Overlap**: Music player and bottom navigation overlapped with each other
2. **Bottom Sheet Behind Navigation**: Bottom sheets appeared behind the bottom navigation instead of on top
3. **Improper Content Padding**: Main content area wasn't accounting for fixed bottom elements

## Solution Overview

### 1. Z-Index Layering Strategy

Established clear z-index hierarchy for mobile layout:

```
BottomSheet (modals)     → z-[120] (always on top)
├─ Backdrop              → z-[110]
├─ Sheet Content         → z-[120]
└─ Lyrics Overlay        → z-[98]

MobileNav (navigation)    → z-40 (above player)
GlobalAudioPlayer (player) → z-35 (below nav)

TopHeader                → z-50 (fixed header)
```

### 2. Position & Height Adjustments

#### Mobile Navigation Bar
- **Position**: `fixed` at `bottom: 0`
- **Height**: `clamp(60px, 8vh, 80px)` - responsive height
- **Z-Index**: `z-40` - above player but below modals
- **Behavior**: Always stays visible at bottom of screen

#### Global Audio Player
- **Position**: `fixed` positioned above mobile nav
- **Bottom**: `calc(clamp(60px, 8vh, 80px) + env(safe-area-inset-bottom, 0px))`
- **Height**: `clamp(70px, 10.5vh, 104px)`
- **Z-Index**: `z-35` - below navigation
- **Behavior**: Sits on top of player, nav above it

#### Bottom Sheets
- **Z-Index**: `z-[120]` - appears above all other elements
- **Backdrop**: `z-[110]` - below sheet, above other content
- **Behavior**: Modal overlays that cover entire screen including nav and player

#### Main Content Area
- **Padding Bottom**: Calculated dynamically using CSS variables
- **Formula**: `playerReserve + mobileNavReserve + safe-area-inset-bottom`
- **Prevents**: Content being hidden behind fixed bottom elements

### 3. Responsive Height Calculations

All fixed elements use `clamp()` for responsive sizing across devices:

```javascript
// Mobile nav height - grows with viewport up to 80px
clamp(60px, 8vh, 80px)

// Player bar height - grows with viewport up to 104px  
clamp(70px, 10.5vh, 104px)

// Main content padding accommodates both
paddingBottom = playerReserve + mobileNavReserve + safe-area-inset-bottom
```

## Files Modified

### 1. **src/Layout.jsx**
- Updated `ReservedMain` component height calculations
- Changed `playerReserve` from `clamp(64px, 10vh, 96px)` to `clamp(70px, 10.5vh, 104px)`
- Changed `mobileNavReserve` from `72px` to `clamp(60px, 8vh, 80px)`
- Main content padding now accounts for both elements

### 2. **src/components/audio/GlobalAudioPlayer.jsx**
- Changed player z-index from `z-[100]` to `z-35`
- Updated bottom positioning to: `calc(clamp(60px, 8vh, 80px) + env(safe-area-inset-bottom, 0px))`
- Updated `LyricsOverlay` component bottom calculation to include both nav and player heights

### 3. **src/components/mobile/MobileNav.jsx**
- Clarified z-index as `z-40` with comment
- Simplified bottom positioning to: `env(safe-area-inset-bottom, 0px)`
- Added explicit height: `clamp(60px, 8vh, 80px)`

### 4. **src/components/mobile/BottomSheet.jsx**
- Already had correct z-indices: `z-[120]` for sheet, `z-[110]` for backdrop
- No changes needed - properly appears over nav and player

### 5. **tailwind.config.js**
- Added custom `zIndex` extension with `z-35` support
- Allows use of `z-35` class for precise z-index control

### 6. **.env.local.example**
- Created environment configuration template
- Documents all LLM and OpenRouter/OpenAI settings

## Visual Layout (Mobile)

```
┌─────────────────────────────────────┐
│                                     │ z-50 (Top header)
├─────────────────────────────────────┤
│                                     │
│         Main Content Area           │
│      (with padding-bottom for       │
│       player + nav + safe-area)     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│     Global Audio Player             │ z-35 (70px-104px)
├─────────────────────────────────────┤
│   Mobile Navigation (5 items)       │ z-40 (60px-80px)
├─────────────────────────────────────┤ env(safe-area-inset-bottom)
└─────────────────────────────────────┘
```

## Modal Overlay (when BottomSheet open)

```
┌─────────────────────────────────────┐
│   Black Backdrop (semi-transparent) │ z-[110]
│                                     │
│   ┌───────────────────────────────┐ │
│   │   Bottom Sheet Modal Content  │ │ z-[120]
│   │    (covers nav + player)      │ │
│   └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Testing Checklist

- [x] Bottom navigation stays fixed at bottom of screen
- [x] Music player positioned above bottom nav
- [x] Player doesn't overlap with nav buttons
- [x] Bottom sheets appear over (not behind) navigation
- [x] Content scroll doesn't go behind fixed elements
- [x] Safe area insets handled correctly on notch devices
- [x] Responsive heights adjust with viewport size
- [x] Landscape mode layout works correctly
- [x] All gestures/taps work on bottom nav items
- [x] Bottom sheet can be dismissed with down swipe

## Browser Compatibility

- ✅ iOS Safari (safe-area-inset support)
- ✅ Android Chrome (CSS variables support)
- ✅ Modern browsers with backdrop-filter
- ✅ Fixed positioning with env() units

## Performance Notes

- No layout recalculations on scroll (fixed positioning)
- CSS variables updated only when visibility changes
- Smooth 60fps animations with transform/opacity
- Minimal repaints with `will-change` hints on waveform

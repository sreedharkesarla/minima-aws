# 🎨 DocuMindAI Theme System

## Available Themes

The application now supports **5 beautiful themes** that you can switch between instantly!

### 1. 🌞 **Light Theme** (Default)
- Clean, bright interface perfect for daytime use
- Primary: Blue (#1976d2)
- Secondary: Purple (#9c27b0)
- Background: Light gray (#f5f7fa)

### 2. 🌙 **Dark Theme**
- Modern dark interface that's easy on the eyes
- Primary: Light Blue (#90caf9)
- Secondary: Light Purple (#ce93d8)
- Background: Deep blue-black (#0a1929)
- Perfect for night work or reducing eye strain

### 3. 🌊 **Ocean Blue Theme**
- Professional blue color scheme
- Primary: Royal Blue (#2563eb)
- Secondary: Sky Blue (#0ea5e9)
- Background: Soft blue tint (#eff6ff)
- Great for a corporate, professional look

### 4. 💜 **Purple Haze Theme**
- Creative and vibrant purple design
- Primary: Deep Purple (#7c3aed)
- Secondary: Hot Pink (#ec4899)
- Background: Light lavender (#faf5ff)
- Perfect for a creative, modern feel

### 5. 🌿 **Nature Green Theme**
- Fresh, natural green palette
- Primary: Emerald (#059669)
- Secondary: Teal (#14b8a6)
- Background: Mint green tint (#f0fdf4)
- Ideal for a calm, natural aesthetic

## How to Switch Themes

1. Look for the **🎨 Palette icon** in the top-right corner of the app bar (next to notifications)
2. Click the palette icon to open the theme menu
3. Select any theme from the list
4. Your choice is **automatically saved** and will persist across sessions!

## Features

✅ **Persistent Theme Selection** - Your theme choice is saved to localStorage  
✅ **Instant Theme Switching** - No page reload required  
✅ **Enhanced Components** - All Material-UI components are themed consistently  
✅ **Smooth Transitions** - Seamless theme changes  
✅ **Visual Indicators** - See which theme is currently active  

## Technical Details

### Theme Architecture
- **Theme Provider Context**: Manages theme state globally
- **LocalStorage Persistence**: Saves user preference
- **Material-UI Integration**: Full MUI component theming
- **TypeScript Support**: Fully typed theme system

### Files Added
- `src/theme/themes.ts` - Theme definitions
- `src/contexts/ThemeContext.tsx` - Theme state management
- `src/components/ThemeSwitcher.tsx` - Theme selector UI

### Files Modified
- `src/App.tsx` - Integrated theme context
- `src/components/AppShell.tsx` - Added theme switcher button

## Customization

To add more themes or customize existing ones, edit:
```typescript
src/theme/themes.ts
```

Each theme follows the Material-UI theme structure:
```typescript
- palette.mode: 'light' | 'dark'
- palette.primary: main, light, dark, contrastText
- palette.secondary: main, light, dark, contrastText
- palette.background: default, paper
- palette.text: primary, secondary
- Additional colors: success, error, warning, info
```

## Browser Compatibility

✅ Chrome, Edge, Firefox, Safari  
✅ Mobile browsers  
✅ All modern browsers with localStorage support

---

**Enjoy your personalized DocuMindAI experience!** 🚀

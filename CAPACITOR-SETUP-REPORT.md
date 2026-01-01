# Capacitor Setup Complete - Manual Tasks Report

## What Was Done (Automated)

- [x] Installed Capacitor core, CLI, iOS, Android, SplashScreen, StatusBar
- [x] Initialized Capacitor with `com.jruss.curseddice`
- [x] Configured `capacitor.config.ts` with splash screen and status bar settings
- [x] Added iOS and Android native projects
- [x] Added `SplashScreen.hide()` to MenuScene.ts
- [x] Locked orientation to portrait (iOS Info.plist + Android AndroidManifest.xml)
- [x] Built and synced web assets to native projects

---

## What You Need To Do (Manual)

### 1. Create App Icon (Required)

**Source needed:** 1024×1024 PNG with no transparency

**Tool:** https://appicon.co - upload your 1024×1024, download all sizes

**Copy to:**
- iOS: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Android: `android/app/src/main/res/mipmap-*/`

### 2. Create Splash Screen Image (Required)

**Recommended:** 2732×2732 PNG with your logo centered on `#0a0a1a` background

**Copy to:**
- iOS: `ios/App/App/Assets.xcassets/Splash.imageset/`
- Android: `android/app/src/main/res/drawable/splash.png`

### 3. Test on Devices

```bash
# iOS (requires Mac + Xcode)
npx cap open ios
# Build: Cmd+B, Run: Cmd+R

# Android (requires Android Studio)
npx cap open android
# Build and run via Android Studio
```

### 4. Developer Accounts (Required for Store Release)

| Store | Cost | URL |
|-------|------|-----|
| Apple Developer | $99/year | https://developer.apple.com/programs/enroll/ |
| Google Play | $25 one-time | https://play.google.com/console/signup |

### 5. App Store Submission Assets

**iOS App Store Connect:**
- Screenshots: 6.7" (1290×2796), 6.5" (1242×2688), 5.5" (1242×2208)
- App description (up to 4000 chars)
- Keywords (100 chars)
- Privacy policy URL
- Support URL

**Google Play Console:**
- Screenshots: phone + 7" tablet (optional)
- Feature graphic: 1024×500
- Short description (80 chars)
- Full description (4000 chars)
- Privacy policy URL

### 6. Privacy Policy

Create and host a privacy policy. Minimal template if app doesn't collect data:

> "Cursed Dice does not collect, store, or share any personal information.
> The app runs entirely on your device with no data transmission to external servers."

Host on: GitHub Pages, your website, or a free hosting service.

---

## Quick Commands Reference

```bash
# After making web changes
npm run build && npx cap sync

# Open native projects
npx cap open ios
npx cap open android

# Update native plugins
npx cap update
```

---

## Files Created/Modified

| File | Status |
|------|--------|
| `package.json` | Modified (added Capacitor deps) |
| `capacitor.config.ts` | Created |
| `src/scenes/MenuScene.ts` | Modified (SplashScreen.hide) |
| `ios/` | Created (native iOS project) |
| `android/` | Created (native Android project) |
| `ios/App/App/Info.plist` | Modified (portrait lock) |
| `android/app/src/main/AndroidManifest.xml` | Modified (portrait lock) |

---

## Next Steps

1. Create 1024×1024 app icon
2. Create splash screen image
3. Run `npx cap open ios` and test on simulator
4. Run `npx cap open android` and test on emulator
5. Sign up for developer accounts
6. Create privacy policy
7. Prepare store screenshots and descriptions
8. Submit for review

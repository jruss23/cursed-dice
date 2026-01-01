import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jruss.curseddice',
  appName: 'Cursed Dice',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0a0a1a',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0a0a1a',
    },
    SafeArea: {
      insetsHandling: 'disable',
    },
  },
  ios: {
    contentInset: 'never', // Edge-to-edge, CSS handles safe areas
    backgroundColor: '#0a0a1a',
  },
  android: {
    backgroundColor: '#0a0a1a',
  },
};

export default config;

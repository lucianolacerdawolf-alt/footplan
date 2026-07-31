import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.footplan.app',
  appName: 'FootPlan',
  webDir: 'dist',
  android: {
    // Mesma cor do theme_color do manifest PWA — evita flash branco entre o
    // splash e o primeiro paint do React.
    backgroundColor: '#060b14',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false, // App.tsx esconde após montar (ver main.tsx)
      backgroundColor: '#060b14',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK', // conteúdo claro sobre fundo escuro
      backgroundColor: '#060b14',
    },
  },
};

export default config;

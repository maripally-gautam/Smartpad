
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartpad.app',
  appName: 'Smartpad',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    backgroundColor: "#0F172A",
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#0F172A",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      overlaysWebView: false,
      style: "DARK",
      backgroundColor: "#0F172A",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF",
    }
  }
};

export default config;

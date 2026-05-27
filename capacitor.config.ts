import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.postnotout.tugui',
  appName: '투기의 정석',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;

import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.voxlab.app2026',
    appName: 'VoxLab',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    },
    plugins: {
        SplashScreen: {
            launchShowDuration: 2000,
            backgroundColor: "#0f172a",
            showSpinner: false,
            androidSpinnerStyle: "large",
            iosSpinnerStyle: "large",
            spinnerColor: "#ffffff"
        }
    }
};

export default config;

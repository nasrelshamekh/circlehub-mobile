import '@expo/metro-runtime';

// Register background task and notification listeners in the global module scope
// so Headless JS can execute them immediately upon waking on Android.
import './src/services/discordNotificationService';
import './src/services/pushNotifications';

import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

renderRootComponent(App);

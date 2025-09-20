import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { AppStoreProvider } from "./store/AppStore";
import { registerServiceWorker, showUpdateAvailableNotification } from "./utils/serviceWorker";
import { initializeAssetOptimizations } from "./utils/assetOptimization";
import "./index.css";

// Initialize asset optimizations early
initializeAssetOptimizations();

// Register service worker for PWA functionality
if (import.meta.env.PROD) {
  registerServiceWorker({
    onUpdate: showUpdateAvailableNotification,
    onSuccess: (registration) => {
      console.log('Content cached for offline use:', registration);
    },
    onError: (error) => {
      console.error('Service worker registration failed:', error);
    },
  });
}

createRoot(document.getElementById("root")!).render(
	<AppStoreProvider>
			<App />
	</AppStoreProvider>
);

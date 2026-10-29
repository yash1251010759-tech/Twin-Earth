import { createStandaloneApplication } from './standalone/application.js';
import { describeError } from './standalone/errors.js';
import { initQuickGuide } from './ui/quickGuide.js';
import { initDisasterHub } from './disasters/disasterHub.js';
import { initDisasterUI } from './disasters/disasterUI.js';

const application = createStandaloneApplication({
  googleApiKey: import.meta.env.GOOGLE_MAPS_API_KEY,
  cesiumToken: import.meta.env.CESIUM_ION_TOKEN,
  allowQaRegistration: import.meta.env.DEV,
});

initQuickGuide();
initDisasterUI();

application.start().then((components) => {
  const viewer = components?.scene?.viewer;
  if (viewer) {
    initDisasterHub(viewer);
  }
}).catch((error) => {
  console.error("Twin Earth initialization failed:", error);
  const loaderStatus = document.querySelector('#loading-screen .loader-status');
  loaderStatus.textContent = `Error: ${describeError(error)}`;
  loaderStatus.style.color = '#ff4444';
});

export { application };

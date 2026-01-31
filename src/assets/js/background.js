import {
  App
} from '@wazo/euc-plugins-sdk';


let url;

const app = new App();

// Storage keys
const STORAGE_KEY_INTERNAL = "ringInternal";
const STORAGE_KEY_EXTERNAL = "ringExternal";

const ringStorage = (key, action, ring) => {
  switch(action) {
    case "set":
      localStorage.setItem(key, ring);
      break;
    case "delete":
      localStorage.removeItem(key);
      break;
  }
  return localStorage.getItem(key);
}

const setRing = (ring) => {
  app.configureSounds({
    ring: ring
  });
}

const handleRing = (msg) => {
  const ring = msg.data;
  const type = msg.type; // 'internal' or 'external'
  const storageKey = type === 'internal' ? STORAGE_KEY_INTERNAL : STORAGE_KEY_EXTERNAL;

  switch(ring) {
    case "original":
      ringStorage(storageKey, "delete");
      break;
    default:
      const sound = `${url}/sounds/${ring}`;
      ringStorage(storageKey, "set", sound);
  }
}

// Handle incoming call and set the appropriate ringtone based on call direction
const handleIncomingCall = (direction) => {
  const ringInternal = ringStorage(STORAGE_KEY_INTERNAL);
  const ringExternal = ringStorage(STORAGE_KEY_EXTERNAL);

  if (direction === 'internal' && ringInternal) {
    setRing(ringInternal);
  } else if (direction === 'inbound' && ringExternal) {
    setRing(ringExternal);
  } else {
    // Fallback: use any configured ringtone or reset to default
    if (ringExternal) {
      setRing(ringExternal);
    } else if (ringInternal) {
      setRing(ringInternal);
    } else {
      app.resetSounds();
    }
  }
}

// Listen for WebSocket messages to detect call direction
app.onWebsocketMessage = (message) => {
  try {
    const data = typeof message === 'string' ? JSON.parse(message) : message;

    // Check for call_created event (incoming call)
    if (data?.name === 'call_created' && data?.data) {
      const callData = data.data;

      // Only handle incoming calls (is_caller: false means we're receiving the call)
      if (callData.is_caller === false && callData.direction) {
        console.log('ring background - incoming call detected, direction:', callData.direction);
        handleIncomingCall(callData.direction);
      }
    }
  } catch (e) {
    // Not a JSON message or parsing error, ignore
  }
}

app.onBackgroundMessage = msg => {
  switch(msg.value) {
    case "ring":
      handleRing(msg);
      break;
    case "config":
      const ringInternal = ringStorage(STORAGE_KEY_INTERNAL);
      const ringExternal = ringStorage(STORAGE_KEY_EXTERNAL);
      app.sendMessageToIframe({
        value: 'config',
        ringInternal: ringInternal,
        ringExternal: ringExternal
      });
      break;
  }
}

(async () => {
  await app.initialize();
  const context = app.getContext();
  url = context.app.extra.baseUrl;

  // Set initial ringtone (external as default, or internal if only that is set)
  const ringExternal = ringStorage(STORAGE_KEY_EXTERNAL);
  const ringInternal = ringStorage(STORAGE_KEY_INTERNAL);

  if (ringExternal) {
    setRing(ringExternal);
  } else if (ringInternal) {
    setRing(ringInternal);
  }

  console.log('ring background - background launched');
})();

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
  console.log('ring background - setting ringtone:', ring);
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
      // Apply default sound immediately
      applyDefaultRingtone();
      break;
    default:
      const sound = `${url}/sounds/${ring}`;
      ringStorage(storageKey, "set", sound);
      // Apply the new ringtone immediately (use external as default active ringtone)
      applyDefaultRingtone();
      break;
  }
}

// Apply the default ringtone (external preferred, then internal)
const applyDefaultRingtone = () => {
  const ringExternal = ringStorage(STORAGE_KEY_EXTERNAL);
  const ringInternal = ringStorage(STORAGE_KEY_INTERNAL);

  if (ringExternal) {
    setRing(ringExternal);
  } else if (ringInternal) {
    setRing(ringInternal);
  } else {
    app.resetSounds();
  }
}

// Handle incoming call and set the appropriate ringtone based on call direction
const handleIncomingCall = (direction) => {
  const ringInternal = ringStorage(STORAGE_KEY_INTERNAL);
  const ringExternal = ringStorage(STORAGE_KEY_EXTERNAL);

  console.log('ring background - handleIncomingCall, direction:', direction);
  console.log('ring background - ringInternal:', ringInternal);
  console.log('ring background - ringExternal:', ringExternal);

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
// Message structure: {"op": "event", "code": 0, "data": {"name": "call_created", "data": {"direction": "internal", ...}}}
app.onWebsocketMessage = (message) => {
  try {
    const wsMessage = typeof message === 'string' ? JSON.parse(message) : message;

    // Navigate to the event data: wsMessage.data contains {name, data: {direction, is_caller, ...}}
    const eventData = wsMessage?.data;

    // Check for call_created event (incoming call)
    if (eventData?.name === 'call_created' && eventData?.data) {
      const callData = eventData.data;

      // Only handle incoming calls (is_caller: false means we're receiving the call)
      if (callData.is_caller === false && callData.direction) {
        console.log('ring background - incoming call detected, direction:', callData.direction);
        handleIncomingCall(callData.direction);
      }
    }
  } catch (e) {
    // Not a JSON message or parsing error, ignore
    console.log('ring background - websocket parse error:', e);
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

  // Set initial ringtone
  applyDefaultRingtone();

  console.log('ring background - background launched');
})();

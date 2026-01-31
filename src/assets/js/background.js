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
      applyDefaultRingtone();
      break;
    default:
      const sound = `${url}/sounds/${ring}`;
      ringStorage(storageKey, "set", sound);
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

// Determine if a call is internal based on the caller number
// Internal extensions are typically short (3-5 digits)
const isInternalCall = (callerNumber) => {
  if (!callerNumber) return false;
  // Remove any non-digit characters
  const digits = callerNumber.replace(/\D/g, '');
  // Internal extensions are typically 3-5 digits
  return digits.length >= 3 && digits.length <= 5;
}

// Handle incoming call and set the appropriate ringtone
const handleIncomingCall = (direction, callerNumber) => {
  const ringInternal = ringStorage(STORAGE_KEY_INTERNAL);
  const ringExternal = ringStorage(STORAGE_KEY_EXTERNAL);

  console.log('ring background - handleIncomingCall');
  console.log('ring background - direction:', direction);
  console.log('ring background - callerNumber:', callerNumber);
  console.log('ring background - ringInternal:', ringInternal);
  console.log('ring background - ringExternal:', ringExternal);

  // Determine if internal: use direction if available, otherwise analyze caller number
  let isInternal = false;
  if (direction) {
    isInternal = (direction === 'internal');
  } else if (callerNumber) {
    isInternal = isInternalCall(callerNumber);
  }

  console.log('ring background - isInternal:', isInternal);

  if (isInternal && ringInternal) {
    setRing(ringInternal);
  } else if (!isInternal && ringExternal) {
    setRing(ringExternal);
  } else {
    // Fallback
    if (ringExternal) {
      setRing(ringExternal);
    } else if (ringInternal) {
      setRing(ringInternal);
    } else {
      app.resetSounds();
    }
  }
}

// Track call direction from WebSocket messages
let lastCallDirection = null;

// Listen for WebSocket messages to get call direction
app.onWebsocketMessage = (message) => {
  console.log('ring background - websocket message received:', message);
  try {
    const wsMessage = typeof message === 'string' ? JSON.parse(message) : message;
    console.log('ring background - parsed websocket:', JSON.stringify(wsMessage));

    // Try different message structures
    // Structure 1: {op, code, data: {name, data: {direction}}}
    // Structure 2: {name, data: {direction}}
    let eventName = null;
    let callData = null;

    if (wsMessage?.data?.name && wsMessage?.data?.data) {
      // Structure 1
      eventName = wsMessage.data.name;
      callData = wsMessage.data.data;
    } else if (wsMessage?.name && wsMessage?.data) {
      // Structure 2
      eventName = wsMessage.name;
      callData = wsMessage.data;
    }

    if (eventName === 'call_created' && callData) {
      console.log('ring background - call_created event detected');
      console.log('ring background - callData:', JSON.stringify(callData));

      if (callData.is_caller === false && callData.direction) {
        lastCallDirection = callData.direction;
        console.log('ring background - stored direction:', lastCallDirection);
        handleIncomingCall(callData.direction, callData.peer_caller_id_number);
      }
    }
  } catch (e) {
    console.log('ring background - websocket error:', e);
  }
}

// Listen for SDK call incoming event
app.onCallIncoming = (call) => {
  console.log('ring background - onCallIncoming triggered');
  console.log('ring background - call object:', JSON.stringify(call));

  // Use stored direction from websocket if available, otherwise analyze number
  const callerNumber = call.callerNumber || call.number;
  handleIncomingCall(lastCallDirection, callerNumber);

  // Reset for next call
  lastCallDirection = null;
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

  applyDefaultRingtone();

  console.log('ring background - background launched, listening for calls...');
})();

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

const handleRing = (msg) => {
  const ring = msg.data;
  const type = msg.type; // 'internal' or 'external'
  const storageKey = type === 'internal' ? STORAGE_KEY_INTERNAL : STORAGE_KEY_EXTERNAL;

  switch(ring) {
    case "original":
      ringStorage(storageKey, "delete");
      break;
    case "custom":
      // Custom file: store the base64 data directly
      if (msg.customData) {
        ringStorage(storageKey, "set", msg.customData);
      }
      break;
    default:
      const sound = `${url}/sounds/${ring}`;
      ringStorage(storageKey, "set", sound);
      break;
  }
}

// Determine if a call is internal based on the caller number
const isInternalCall = (callerNumber) => {
  if (!callerNumber) return false;
  const digits = callerNumber.replace(/\D/g, '');
  return digits.length >= 3 && digits.length <= 5;
}

// Handle incoming call - configure and play the appropriate ringtone
const handleIncomingCall = (direction, callerNumber) => {
  const ringInternal = ringStorage(STORAGE_KEY_INTERNAL);
  const ringExternal = ringStorage(STORAGE_KEY_EXTERNAL);

  console.log('ring background - handleIncomingCall');
  console.log('ring background - direction:', direction);
  console.log('ring background - callerNumber:', callerNumber);
  console.log('ring background - ringInternal:', ringInternal);
  console.log('ring background - ringExternal:', ringExternal);

  // Determine if internal
  let isInternal = false;
  if (direction) {
    isInternal = (direction === 'internal');
  } else if (callerNumber) {
    isInternal = isInternalCall(callerNumber);
  }

  console.log('ring background - isInternal:', isInternal);

  // Determine which ringtone to use
  let ringtoneToPlay = null;

  if (isInternal && ringInternal) {
    ringtoneToPlay = ringInternal;
  } else if (!isInternal && ringExternal) {
    ringtoneToPlay = ringExternal;
  } else if (ringExternal) {
    ringtoneToPlay = ringExternal;
  } else if (ringInternal) {
    ringtoneToPlay = ringInternal;
  }

  if (ringtoneToPlay) {
    console.log('ring background - configuring and playing:', ringtoneToPlay);

    // Stop current sound, configure new ringtone, then play it
    app.stopCurrentSound();
    app.configureSounds({ ring: ringtoneToPlay });
    app.playIncomingCallSound();
  }
}

// Track if we already handled the current call
let handledCallIds = new Set();

// Listen for WebSocket messages to get call direction
app.onWebsocketMessage = (message) => {
  try {
    const wsMessage = typeof message === 'string' ? JSON.parse(message) : message;

    // Structure: {name: "call_created", data: {direction, is_caller, sip_call_id, ...}}
    if (wsMessage?.name === 'call_created' && wsMessage?.data) {
      const callData = wsMessage.data;

      // Only handle incoming calls (is_caller: false)
      if (callData.is_caller === false && callData.direction) {
        const callId = callData.sip_call_id || callData.call_id;

        // Avoid handling the same call twice
        if (!handledCallIds.has(callId)) {
          handledCallIds.add(callId);
          console.log('ring background - call_created, handling call:', callId);
          handleIncomingCall(callData.direction, callData.peer_caller_id_number);

          // Clean up old call IDs after 30 seconds
          setTimeout(() => handledCallIds.delete(callId), 30000);
        }
      }
    }
  } catch (e) {
    console.log('ring background - websocket error:', e);
  }
}

// Listen for SDK call events
app.onCallIncoming = (call) => {
  console.log('ring background - onCallIncoming:', call.sipCallId);

  const callId = call.sipCallId || call.callId;

  // Only handle if not already handled by websocket
  if (!handledCallIds.has(callId)) {
    handledCallIds.add(callId);
    const callerNumber = call.callerNumber || call.number;
    handleIncomingCall(null, callerNumber);

    setTimeout(() => handledCallIds.delete(callId), 30000);
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
  // Remove trailing slash if present to avoid double slashes
  url = (context.app.extra.baseUrl || '').replace(/\/$/, '');

  console.log('ring background - background launched, url:', url);
})();

import { App } from 'https://esm.sh/@wazo/euc-plugins-sdk@0.0.23';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

let audio = null;
let currentPlayingButton = null;
let url;

const app = new App();

// Elements for internal calls
const ringInternalElem = document.getElementById("ring-internal");
const playButtonInternal = document.getElementById("playButton-internal");
const browseButtonInternal = document.getElementById("browseButton-internal");
const fileInputInternal = document.getElementById("fileInput-internal");
const customNameInternal = document.getElementById("customName-internal");

// Elements for external calls
const ringExternalElem = document.getElementById("ring-external");
const playButtonExternal = document.getElementById("playButton-external");
const browseButtonExternal = document.getElementById("browseButton-external");
const fileInputExternal = document.getElementById("fileInput-external");
const customNameExternal = document.getElementById("customName-external");

// Storage keys for custom files
const CUSTOM_FILE_INTERNAL = "customFileInternal";
const CUSTOM_FILE_EXTERNAL = "customFileExternal";
const CUSTOM_NAME_INTERNAL = "customNameInternal";
const CUSTOM_NAME_EXTERNAL = "customNameExternal";

const options = {
  "original": "Reset to original",
  "custom": "-- Personnalis\u00e9 --",
  "iphone.mp3": "Iphone",
  "iphone6.mp3": "Iphone 6",
  "landline1.wav": "Landline 1",
  "landline2.wav": "Landline 2",
  "marimba.wav": "Marimba 1",
  "marimba.mp3": "Marimba 2",
  "ring3.wav": "Ring 3",
  "ring4.wav": "Ring 4",
  "ring5.wav": "Ring 5",
  "bird2.mp3": "Bird",
  "sf-oiseau-24.mp3": "Bird 1",
  "oiseau2.mp3": "Bird 2",
  "sf_oiseau_seul_01.mp3": "Bird 3",
  "sf_oiseaux.mp3": "Bird 4",
  "sf_canari.mp3": "Canary",
  "lg_bubble.mp3": "Bubble",
  "huawei.mp3": "Huawei",
  "lg_peanut.mp3": "Peanut",
  "xylo.mp3": "Xylophone"
};

app.onIframeMessage = (msg) => {
  if (msg.value === 'config') {
    if (msg.ringInternal) {
      // Check if it's base64 data (custom file) before splitting
      if (msg.ringInternal.startsWith('data:')) {
        ringInternalElem.value = 'custom';
      } else {
        const ring = msg.ringInternal.split("/").pop();
        ringInternalElem.value = ring;
      }
    }
    if (msg.ringExternal) {
      if (msg.ringExternal.startsWith('data:')) {
        ringExternalElem.value = 'custom';
      } else {
        const ring = msg.ringExternal.split("/").pop();
        ringExternalElem.value = ring;
      }
    }
  }
  updateCustomNames();
}

const addOptionMenu = (options, idMenu) => {
  const menu = document.getElementById(idMenu);
  for (const option in options) {
    const newOption = document.createElement("option");
    newOption.text = options[option];
    newOption.value = option;
    menu.add(newOption);
  }
}

const stopAudio = () => {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    audio = null;
  }
  if (currentPlayingButton) {
    currentPlayingButton.classList.remove('playing');
    currentPlayingButton = null;
  }
}

const getAudioPath = (ringElem, type) => {
  const ring = ringElem.value;
  if (ring === 'original') {
    return null;
  }
  if (ring === 'custom') {
    const customKey = type === 'internal' ? CUSTOM_FILE_INTERNAL : CUSTOM_FILE_EXTERNAL;
    return localStorage.getItem(customKey);
  }
  return `${url}/sounds/${ring}`;
}

const togglePlay = (button, ringElem, type) => {
  const isCurrentlyPlaying = button.classList.contains('playing');
  stopAudio();

  if (isCurrentlyPlaying) {
    return;
  }

  const path = getAudioPath(ringElem, type);
  if (!path) {
    return;
  }

  audio = new Audio(path);
  audio.loop = false;
  audio.addEventListener('ended', () => stopAudio());

  audio.play().then(() => {
    button.classList.add('playing');
    currentPlayingButton = button;
  }).catch(e => {
    console.log('Audio play error:', e);
  });
}

const handleFileSelect = (file, type) => {
  if (!file) return;

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    alert(i18next.t('file_too_large'));
    return;
  }

  // Check file type
  if (!file.type.startsWith('audio/')) {
    alert(i18next.t('invalid_format'));
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result;
    const customFileKey = type === 'internal' ? CUSTOM_FILE_INTERNAL : CUSTOM_FILE_EXTERNAL;
    const customNameKey = type === 'internal' ? CUSTOM_NAME_INTERNAL : CUSTOM_NAME_EXTERNAL;
    const ringElem = type === 'internal' ? ringInternalElem : ringExternalElem;

    // Store in localStorage
    try {
      localStorage.setItem(customFileKey, base64);
      localStorage.setItem(customNameKey, file.name);

      // Select "custom" option
      ringElem.value = 'custom';

      // Send to background
      app.sendMessageToBackground({value: 'ring', type: type, data: 'custom', customData: base64});

      updateCustomNames();
    } catch (e) {
      alert(i18next.t('storage_error'));
      console.error('Storage error:', e);
    }
  };
  reader.readAsDataURL(file);
}

const updateCustomNames = () => {
  const nameInternal = localStorage.getItem(CUSTOM_NAME_INTERNAL);
  const nameExternal = localStorage.getItem(CUSTOM_NAME_EXTERNAL);

  customNameInternal.textContent = nameInternal && ringInternalElem.value === 'custom' ? nameInternal : '';
  customNameExternal.textContent = nameExternal && ringExternalElem.value === 'custom' ? nameExternal : '';
}

const addEventsListener = () => {
  // Internal ring events
  ringInternalElem.addEventListener("change", function() {
    const ring = ringInternalElem.value;
    stopAudio();
    updateCustomNames();

    if (ring === 'custom') {
      const customData = localStorage.getItem(CUSTOM_FILE_INTERNAL);
      if (customData) {
        app.sendMessageToBackground({value: 'ring', type: 'internal', data: 'custom', customData: customData});
      }
    } else {
      app.sendMessageToBackground({value: 'ring', type: 'internal', data: ring});
    }
  });

  playButtonInternal.addEventListener("click", () => {
    togglePlay(playButtonInternal, ringInternalElem, 'internal');
  });

  browseButtonInternal.addEventListener("click", () => {
    fileInputInternal.click();
  });

  fileInputInternal.addEventListener("change", (e) => {
    handleFileSelect(e.target.files[0], 'internal');
    e.target.value = ''; // Reset for same file selection
  });

  // External ring events
  ringExternalElem.addEventListener("change", function() {
    const ring = ringExternalElem.value;
    stopAudio();
    updateCustomNames();

    if (ring === 'custom') {
      const customData = localStorage.getItem(CUSTOM_FILE_EXTERNAL);
      if (customData) {
        app.sendMessageToBackground({value: 'ring', type: 'external', data: 'custom', customData: customData});
      }
    } else {
      app.sendMessageToBackground({value: 'ring', type: 'external', data: ring});
    }
  });

  playButtonExternal.addEventListener("click", () => {
    togglePlay(playButtonExternal, ringExternalElem, 'external');
  });

  browseButtonExternal.addEventListener("click", () => {
    fileInputExternal.click();
  });

  fileInputExternal.addEventListener("change", (e) => {
    handleFileSelect(e.target.files[0], 'external');
    e.target.value = '';
  });
}

(async() => {
  await app.initialize();
  const context = app.getContext();
  const lang = context.app.locale;
  url = (context.app.extra.baseUrl || '').replace(/\/$/, '');

  addOptionMenu(options, "ring-internal");
  addOptionMenu(options, "ring-external");
  addEventsListener();

  app.sendMessageToBackground({value: 'config'});

  await i18next.init({
    lng: lang,
    fallbackLng: 'en',
    debug: false,
    resources: {
      en: {
        translation: {
          "ring_internal": "Internal calls",
          "ring_external": "External calls",
          "file_too_large": "File too large (max 2MB)",
          "invalid_format": "Invalid format (audio only)",
          "storage_error": "Storage error"
        }
      },
      fr: {
        translation: {
          "ring_internal": "Appels internes",
          "ring_external": "Appels externes",
          "file_too_large": "Fichier trop volumineux (max 2Mo)",
          "invalid_format": "Format invalide (audio uniquement)",
          "storage_error": "Erreur de stockage"
        }
      }
    }
  });

  document.getElementById('label-internal').innerHTML = i18next.t('ring_internal');
  document.getElementById('label-external').innerHTML = i18next.t('ring_external');

  updateCustomNames();
})();

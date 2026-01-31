import { App } from '@wazo/euc-plugins-sdk';

import i18next from "i18next";

const json = require('../../manifest.json');

let audio = null;
let currentPlayingButton = null;
let url;

const app = new App();

// Elements for internal calls
const ringInternalElem = document.getElementById("ring-internal");
const playButtonInternal = document.getElementById("playButton-internal");

// Elements for external calls
const ringExternalElem = document.getElementById("ring-external");
const playButtonExternal = document.getElementById("playButton-external");

const options = {
  "original": "Reset to original",
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
      const ring = msg.ringInternal.split("/").pop();
      ringInternalElem.value = ring;
    }
    if (msg.ringExternal) {
      const ring = msg.ringExternal.split("/").pop();
      ringExternalElem.value = ring;
    }
  }
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

const togglePlay = (button, ringElem) => {
  const isCurrentlyPlaying = button.classList.contains('playing');

  // Stop any playing audio first
  stopAudio();

  // If it was playing, we just stop (toggle off)
  if (isCurrentlyPlaying) {
    return;
  }

  // Start playing
  const ring = ringElem.value;
  if (ring === 'original') {
    return; // Can't preview "original"
  }

  const path = `${url}/sounds/${ring}`;
  audio = new Audio(path);
  audio.loop = false;

  // When audio ends, reset button state
  audio.addEventListener('ended', () => {
    stopAudio();
  });

  audio.play().then(() => {
    button.classList.add('playing');
    currentPlayingButton = button;
  }).catch(e => {
    console.log('Audio play error:', e);
  });
}

const addEventsListener = () => {
  // Internal ring events
  ringInternalElem.addEventListener("change", function() {
    const ring = ringInternalElem.value;
    app.sendMessageToBackground({value: 'ring', type: 'internal', data: ring});
    stopAudio();
  });

  playButtonInternal.addEventListener("click", () => {
    togglePlay(playButtonInternal, ringInternalElem);
  });

  // External ring events
  ringExternalElem.addEventListener("change", function() {
    const ring = ringExternalElem.value;
    app.sendMessageToBackground({value: 'ring', type: 'external', data: ring});
    stopAudio();
  });

  playButtonExternal.addEventListener("click", () => {
    togglePlay(playButtonExternal, ringExternalElem);
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
          "ring_external": "External calls"
        }
      },
      fr: {
        translation: {
          "ring_internal": "Appels internes",
          "ring_external": "Appels externes"
        }
      }
    }
  });

  document.getElementById('label-internal').innerHTML = i18next.t('ring_internal');
  document.getElementById('label-external').innerHTML = i18next.t('ring_external');
})();

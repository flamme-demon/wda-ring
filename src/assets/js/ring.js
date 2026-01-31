import { App } from '@wazo/euc-plugins-sdk';

import i18next from "i18next";

const json = require('../../manifest.json');

let audio;
let url;

const app = new App();

// Elements for internal calls
const ringInternalElem = document.getElementById("ring-internal");
const playButtonInternal = document.getElementById("playButton-internal");
const stopButtonInternal = document.getElementById("stopButton-internal");

// Elements for external calls
const ringExternalElem = document.getElementById("ring-external");
const playButtonExternal = document.getElementById("playButton-external");
const stopButtonExternal = document.getElementById("stopButton-external");

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

const listenRingbackTone = (path) => {
  audio = new Audio(path);
  audio.play();
}

const stopListenRingbackTone = () => {
  if (audio) {
    audio.pause();
  }
}

const addEventsListener = () => {
  // Internal ring events
  ringInternalElem.addEventListener("change", function() {
    const ring = ringInternalElem.value;
    app.sendMessageToBackground({value: 'ring', type: 'internal', data: ring});
    stopListenRingbackTone();
  });

  playButtonInternal.addEventListener("click", () => {
    const ring = ringInternalElem.value;
    const path = `${url}/sounds/${ring}`;
    stopListenRingbackTone();
    listenRingbackTone(path);
  });

  stopButtonInternal.addEventListener("click", () => {
    stopListenRingbackTone();
  });

  // External ring events
  ringExternalElem.addEventListener("change", function() {
    const ring = ringExternalElem.value;
    app.sendMessageToBackground({value: 'ring', type: 'external', data: ring});
    stopListenRingbackTone();
  });

  playButtonExternal.addEventListener("click", () => {
    const ring = ringExternalElem.value;
    const path = `${url}/sounds/${ring}`;
    stopListenRingbackTone();
    listenRingbackTone(path);
  });

  stopButtonExternal.addEventListener("click", () => {
    stopListenRingbackTone();
  });
}

(async() => {
  await app.initialize();
  const context = app.getContext();
  const lang = context.app.locale;
  url = context.app.extra.baseUrl;

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
          "ring_internal": "Internal calls ringtone",
          "ring_external": "External calls ringtone"
        }
      },
      fr: {
        translation: {
          "ring_internal": "Sonnerie appels internes",
          "ring_external": "Sonnerie appels externes"
        }
      }
    }
  });

  document.getElementById('label-internal').innerHTML = i18next.t('ring_internal');
  document.getElementById('label-external').innerHTML = i18next.t('ring_external');
})();

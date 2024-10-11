import { App } from '@wazo/euc-plugins-sdk';

import i18next from "i18next";

const json = require('../../manifest.json');

let audio;
let url;

const app = new App();
const ringElem = document.getElementById("ring");
const playButton = document.getElementById("playButton");
const stopButton = document.getElementById("stopButton");

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
  "dark_side_ringtone.mp3": "Star Wars",
  "bird2.mp3": "Bird",
  "sf-oiseau-24.mp3": "Bird 1",
  "oiseau2.mp3": "Bird 2",
  "sf_oiseau_seul_01.mp3": "Bird 3",
  "sf_oiseaux.mp3": "Bird 4",
  "sf_canari.mp3": "Canary",
  "zelda_lost_woods.mp3": "Zelda 1",
  "hedwigs.mp3": "Harry Potter",
  "lg_bubble.mp3": "Bubble",
  "marimba.wav": "Marimba",
  "stranger_things.mp3": "Stranger Things",
  "breaking_bad.mp3": "Breaking Bad",
  "Helldivers2.mp3": "Helldivers2",
  "huawei.mp3": "Huawei",
  "lg_peanut.mp3": "Peanut",
  "xylo.mp3": "Xylophone"
};

app.onIframeMessage = (msg) => {
  if (msg.ring) {
    const ring = msg.ring.split("/").pop();
    ringElem.value = ring;
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
  ring.addEventListener("change", function() {
    const ring = ringElem.value;
    app.sendMessageToBackground({value: 'ring', data: ring});
    stopListenRingbackTone();
  });

  playButton.addEventListener("click", () => {
    const ring = ringElem.value;
    const path = `${url}/sounds/${ring}`;
    stopListenRingbackTone();
    listenRingbackTone(path);
  });

  stopButton.addEventListener("click", () => {
    stopListenRingbackTone();
  });
}

(async() => {
  await app.initialize();
  const context = app.getContext();
  const lang = context.app.locale;
  url = context.app.extra.baseUrl;

  addOptionMenu(options, "ring");
  addEventsListener();

  app.sendMessageToBackground({value: 'config'});

  await i18next.init({
    lng: lang,
    fallbackLng: 'en',
    debug: false,
    resources: {
      en: {
        translation: {
          "choose_ring": "Select your ringtone"
        }
      },
      fr: {
        translation: {
          "choose_ring": "Choisissez votre sonnerie"
        }
      }
    }
  });

  document.getElementById('choose-ring').innerHTML = i18next.t('choose_ring');
})();

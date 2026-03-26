(() => {
  const defaults = {
    speed: 1,
    reverb: 0,
    bassEnabled: false,
    bassGain: 8,
    volume: 100
  };

  const state = { ...defaults };
  const trackedMedia = new WeakMap();

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return;
  }

  const context = new AudioCtx();
  const master = context.createGain();
  const dryGain = context.createGain();
  const wetGain = context.createGain();
  const convolver = context.createConvolver();
  const bass = context.createBiquadFilter();

  bass.type = 'lowshelf';
  bass.frequency.value = 150;

  dryGain.connect(bass);
  wetGain.connect(convolver);
  convolver.connect(bass);
  bass.connect(master);
  master.connect(context.destination);

  function createImpulseResponse(seconds = 2.5, decay = 2.4) {
    const sampleRate = context.sampleRate;
    const length = Math.floor(sampleRate * seconds);
    const impulse = context.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i += 1) {
        const progress = i / length;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - progress, decay);
      }
    }

    return impulse;
  }

  convolver.buffer = createImpulseResponse();

  function connectMediaElement(media) {
    if (trackedMedia.has(media)) return;

    try {
      const source = context.createMediaElementSource(media);
      source.connect(dryGain);
      source.connect(wetGain);
      trackedMedia.set(media, source);

      media.playbackRate = state.speed;
      media.preservesPitch = false;

      media.addEventListener('play', () => {
        context.resume().catch(() => {});
      });
    } catch {
      // Ignore unsupported media elements.
    }
  }

  function scanAndConnect() {
    const mediaNodes = document.querySelectorAll('audio, video');
    mediaNodes.forEach(connectMediaElement);
  }

  function applyState() {
    dryGain.gain.value = 1 - state.reverb / 100;
    wetGain.gain.value = state.reverb / 100;
    master.gain.value = state.volume / 100;
    bass.gain.value = state.bassEnabled ? state.bassGain : 0;

    document.querySelectorAll('audio, video').forEach((media) => {
      media.playbackRate = state.speed;
      media.preservesPitch = false;
    });
  }

  browser.runtime.onMessage.addListener((message) => {
    if (message?.type !== 'APPLY_AUDIO_SETTINGS' || !message.payload) return;

    Object.assign(state, message.payload);
    scanAndConnect();
    applyState();
    context.resume().catch(() => {});
  });

  const observer = new MutationObserver(() => {
    scanAndConnect();
    applyState();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  scanAndConnect();
  applyState();
})();

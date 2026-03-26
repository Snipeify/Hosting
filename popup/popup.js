const defaults = {
  speed: 1,
  reverb: 0,
  bassEnabled: false,
  bassGain: 8,
  volume: 100,
  preset: 'custom'
};

const elements = {
  speed: document.getElementById('speed'),
  speedValue: document.getElementById('speedValue'),
  reverb: document.getElementById('reverb'),
  reverbValue: document.getElementById('reverbValue'),
  bass: document.getElementById('bass'),
  bassValue: document.getElementById('bassValue'),
  bassToggle: document.getElementById('bassToggle'),
  volume: document.getElementById('volume'),
  volumeValue: document.getElementById('volumeValue'),
  status: document.getElementById('status'),
  resetBtn: document.getElementById('resetBtn'),
  presetButtons: [...document.querySelectorAll('.preset')]
};

let state = { ...defaults };

const presets = {
  slowedReverb: { speed: 0.82, reverb: 58, bassEnabled: false, bassGain: 8, volume: 115 },
  nightcore: { speed: 1.25, reverb: 24, bassEnabled: false, bassGain: 8, volume: 110 },
  clean: { ...defaults, bassGain: 8 }
};

async function getActiveTab() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function sendToTab(payload) {
  const tab = await getActiveTab();
  if (!tab?.id) return;

  try {
    await browser.tabs.sendMessage(tab.id, { type: 'APPLY_AUDIO_SETTINGS', payload });
    setStatus('Effect applied');
  } catch {
    setStatus('Open a media tab and reload once if needed');
  }
}

function setStatus(message) {
  elements.status.textContent = message;
}

function render() {
  elements.speed.value = state.speed;
  elements.reverb.value = state.reverb;
  elements.bass.value = state.bassGain;
  elements.bassToggle.checked = state.bassEnabled;
  elements.volume.value = state.volume;

  elements.speedValue.textContent = `${state.speed.toFixed(2)}x`;
  elements.reverbValue.textContent = `${state.reverb}%`;
  elements.bassValue.textContent = `${state.bassEnabled ? state.bassGain : 0} dB`;
  elements.volumeValue.textContent = `${state.volume}%`;

  elements.presetButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.preset === state.preset);
  });
}

async function persistAndApply() {
  await browser.storage.local.set({ audioMorphState: state });
  await sendToTab(state);
}

function bindInputs() {
  elements.speed.addEventListener('input', async (e) => {
    state.speed = Number(e.target.value);
    state.preset = 'custom';
    render();
    await persistAndApply();
  });

  elements.reverb.addEventListener('input', async (e) => {
    state.reverb = Number(e.target.value);
    state.preset = 'custom';
    render();
    await persistAndApply();
  });

  elements.bass.addEventListener('input', async (e) => {
    state.bassGain = Number(e.target.value);
    state.preset = 'custom';
    render();
    await persistAndApply();
  });

  elements.bassToggle.addEventListener('change', async (e) => {
    state.bassEnabled = e.target.checked;
    state.preset = 'custom';
    render();
    await persistAndApply();
  });

  elements.volume.addEventListener('input', async (e) => {
    state.volume = Number(e.target.value);
    state.preset = 'custom';
    render();
    await persistAndApply();
  });

  elements.resetBtn.addEventListener('click', async () => {
    state = { ...defaults };
    render();
    await persistAndApply();
  });

  elements.presetButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const presetKey = button.dataset.preset;
      const preset = presets[presetKey];
      if (!preset) return;
      state = { ...state, ...preset, preset: presetKey };
      render();
      await persistAndApply();
    });
  });
}

async function init() {
  const data = await browser.storage.local.get('audioMorphState');
  state = { ...defaults, ...(data.audioMorphState || {}) };
  render();
  bindInputs();
  await sendToTab(state);
}

init();

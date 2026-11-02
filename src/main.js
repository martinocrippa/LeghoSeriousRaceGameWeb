import { BINDINGS_STORAGE_KEY, KEY_ACTIONS, defaultBindings, parseBindings, validateBindings, assignBinding, keyLabel } from './keybindings.js';
// Two families, latin subset only: Bungee draws the wordmark and the big numbers, Inter does the rest.
import '@fontsource/bungee/latin-400.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import './style.css';
import { CAR_PRESETS, SAMPLE_CARS } from './cars.js';
import { CAR_PARTS, normalizeParts } from './parts.js';
import { GARAGE_STORAGE_KEY, parseGarage } from './garage.js';
import { RaceSimulation, BASE_SPEED, hasExpertControls } from './race.js';
import { TRACKS, TRACK_DEFINITIONS, DEFAULT_TRACK, getTrack, createTrack, LANE_SIGN } from './track.js';
import { racerPose } from './sections.js';
import { createCup, cupTrackIds, recordRaceResult, sortStandings, isCupFinished, raceSeed, pointsForRank } from './cup.js';
import { raceTimes, formatRaceTime, formatGap } from './gaps.js';
import { GameRenderer } from './renderer.js';
import { PILOT_COLORS, PILOTS_STORAGE_KEY, MAX_PILOT_NAME, cleanPilotName, rememberPilot, parsePilots } from './pilots.js';
import { RECORDS_STORAGE_KEY, recordKey as trackRecordKey, parseRecords, beatsRecord } from './records.js';
import { createAudio, AUDIO_MODE_LABELS } from './audio.js';
import { musicForTheme } from './music-tracks.js';
import { QUALITY_LEVELS, QUALITY_ORDER, loadQuality, saveQuality, lowerQuality, createFrameMonitor } from './quality.js';

const $ = (s) => document.querySelector(s);
const escape = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = (name, size=22) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${{
  keyboard:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"/>',
  brick:'<path d="M3 8h18v13H3zM6 8V4h4v4m4 0V4h4v4M3 12h18"/>',
  flag:'<path d="M5 22V3m0 0c5-4 9 4 15 0v11c-6 4-10-4-15 0"/><path d="M10 3v11m5-10v11M5 8c5-4 9 4 15 0"/>',
  camera:'<path d="M8 5l2-3h4l2 3h5v16H3V5z"/><circle cx="12" cy="12" r="4"/>',
  arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  sound:'<path d="m11 4-6 5H2v6h3l6 5zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute:'<path d="m11 4-6 5H2v6h3l6 5zM16 9l6 6m0-6-6 6"/>',
  sfx:'<path d="m11 4-6 5H2v6h3l6 5zM15 8a6 6 0 0 1 0 8"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 0 1 6 1c0 2-3 2-3 5m0 3h.01"/>',
  person:'<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
  people:'<circle cx="9" cy="7" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M16 4a3 3 0 0 1 0 6m2 4a6 6 0 0 1 4 6"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  pause:'<path d="M8 5v14M16 5v14"/>',
  back:'<path d="M20 12H4m6-6-6 6 6 6"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  gamepad:'<path d="M7 6h10c4 0 7 13 3 13-2 0-3-4-5-4H9c-2 0-3 4-5 4C0 19 3 6 7 6Z"/><path d="M8 9v5m-2.5-2.5h5M16 10h.01M18 13h.01"/>',
  bolt:'<path d="m14 2-9 12h7l-2 8 9-12h-7z"/>',
  trophy:'<path d="M7 3h10v6a5 5 0 0 1-10 0zm5 11v7m-5 0h10M7 5H3v3a4 4 0 0 0 5 4m9-7h4v3a4 4 0 0 1-5 4"/>',
  timer:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
}[name] || ''}</svg>`;

// The saved garage is rebuilt field by field (formats 1, 2 and 3): see src/garage.js for why.
function loadCars() {
  try { return parseGarage(localStorage.getItem(GARAGE_STORAGE_KEY)); } catch { return []; }
}
// Records and the pilot roster are validated on the way in: see src/records.js and src/pilots.js for why.
function loadRecords() {
  try { return parseRecords(localStorage.getItem(RECORDS_STORAGE_KEY) || '{}'); } catch { return {}; }
}
function loadPilots() {
  try { return parsePilots(localStorage.getItem(PILOTS_STORAGE_KEY) || '[]'); } catch { return []; }
}
let customCars = loadCars();
let catalog = [...SAMPLE_CARS, ...CAR_PRESETS, ...customCars];
let selected = [SAMPLE_CARS[0] || CAR_PRESETS[0], CAR_PRESETS[0]];
let players = 1, activePilot = 0, difficulty = 'easy';
let trackId = DEFAULT_TRACK.id, mode = 'single', cup = null, mapPoints = [];
let lapsOverride = null, opponentsOverride = null, records = loadRecords(), pilotNames = loadPilots();
let screen = 'menu', menuScreen = 'attract', paused = false, race = null;
let editingCarId = null;
let pendingCar = null, previousFocus = null, thumbnailCache = new Map(), modalEpoch = 0;
const keys = new Set(), keyEdges = new Set(), touchInputs = [{steer:0,brake:false,useItem:false},{steer:0,brake:false,useItem:false}];
const padPrevious = [false,false], padJumpPrevious = [false,false];
const padMenu = { a:false, b:false, cooldown:0 };
const touchPointers = new Map();
const attractCars = [...SAMPLE_CARS, ...CAR_PRESETS];
let attractIndex = 0, attractTimer = 0, lapTiming = [];
/**
 * The attract screen's helicopter tour: instead of the car on its turntable, a random circuit is flown over for
 * half a minute, then another one. It is the demo reel of a cabinet, and it is how a child finds out what is in
 * the game without reading a list of names.
 */
let tour = null;
let toastTimeout;
let bindings;
try { bindings=parseBindings(localStorage.getItem(BINDINGS_STORAGE_KEY)); } catch { bindings=defaultBindings(); }
let bindingsDraft=null, bindingCapture=null, controlsOrigin='menu', controlsFocus=null;
const safeStorage = (() => { try { return window.localStorage; } catch { return null; } })();
// Dark or light: the computer decides until somebody presses the button in the bar, then the choice is remembered.
const THEMES = ['scuro', 'chiaro'];
const THEME_KEY = 'brick-racers:theme';
const lightQuery = window.matchMedia?.('(prefers-color-scheme: light)');
const systemTheme = () => (lightQuery?.matches ? 'chiaro' : 'scuro');
let themeChoice = (() => { try { const saved = safeStorage?.getItem(THEME_KEY); return THEMES.includes(saved) ? saved : null; } catch { return null; } })();
let theme = themeChoice || systemTheme();
function applyTheme(next, { remember = true } = {}) {
  theme = THEMES.includes(next) ? next : systemTheme();
  if (remember) { themeChoice = theme; try { safeStorage?.setItem(THEME_KEY, theme); } catch { /* optional */ } }
  document.documentElement.dataset.theme = theme;
  renderer?.setShowroomLook(theme);
  document.querySelectorAll('.theme-button').forEach((b) => {
    b.innerHTML = icon(theme === 'chiaro' ? 'moon' : 'sun');
    const label = theme === 'chiaro' ? 'Tema chiaro. Passa allo scuro' : 'Tema scuro. Passa al chiaro';
    b.setAttribute('aria-label', label); b.title = label;
  });
  return theme;
}
document.documentElement.dataset.theme = theme;
// Without an explicit choice the game follows the computer, even if it changes while playing.
lightQuery?.addEventListener?.('change', () => { if (!themeChoice) applyTheme(systemTheme(), { remember: false }); });
// One source for the pilots' colours: CSS (--p1/--p2), minimap and the 3D marker all follow pilots.js.
PILOT_COLORS.forEach((color, i) => document.documentElement.style.setProperty(`--p${i + 1}`, color));
// Graphics profile: saved choice, else medium (light on touch devices); a race that stays under 50 fps steps down once.
let quality = loadQuality(safeStorage, { coarsePointer: !!window.matchMedia?.('(pointer: coarse)').matches });
const frameMonitor = createFrameMonitor();
const audio = createAudio({ storage: safeStorage });
let menuDt = 0, pausedFrameDrawn = false;

const SCREEN_ORDER = ['attract','mode','cars','track'];
const STEP_LABELS = ['MODALITÀ','BOLIDE','PISTA'];
const screenBar = (step, title, extra='') => `<header class="screen-bar"><a class="brand" href="#" aria-label="Legho"><span class="brand-mark">${icon('brick',22)}</span><span class="brand-text">LEG<em>HO</em></span></a><div class="steps" aria-label="Passo ${step} di 3">${STEP_LABELS.map((label,i)=>`<span class="step ${i+1===step?'current':i+1<step?'done':''}"><b>${i+1}</b>${label}</span>`).join('')}</div><h2 class="screen-title">${title}${extra}</h2><nav class="bar-tools" aria-label="Strumenti"><button class="icon-button sound-button" aria-label="Disattiva audio" title="Audio">${icon('sound')}</button><button class="icon-button theme-button" aria-label="Cambia tema" title="Tema">${icon('sun')}</button><button class="icon-button help-button" aria-label="Come si gioca" title="Come si gioca">${icon('help')}</button><button class="icon-button controls-button" aria-label="Imposta i tasti della tastiera" title="Imposta i tasti">${icon('keyboard',20)}</button></nav></header>`;
const screenFoot = (nextId, nextLabel) => `<div class="screen-foot"><button class="button back-button" data-back>${icon('back',18)} INDIETRO</button><span class="foot-hint">ESC indietro · INVIO avanti · FRECCE per muoverti · GAMEPAD A / B</span><button id="${nextId}" class="start-button next-button">${nextLabel} ${icon('arrow',24)}</button></div>`;

$('#app').innerHTML = `
  <main id="menu" class="menu" data-screen="attract">
    <div class="backdrop" aria-hidden="true"><div class="stripes"></div><div class="halftone"></div></div>
    <section id="screen-attract" class="screen screen-attract" data-screen-id="attract" aria-label="Schermata iniziale">
      <div id="stage-attract" class="viewport-slot"><div id="viewport" class="viewport"></div></div>
      <div class="attract-overlay">
        <div class="title-block">
          <h1 class="game-title">LEG<b>HO</b></h1>
          <p class="game-subtitle">a serious game race</p>
        </div>
        <div class="attract-start"><button id="press-start" class="press-start primary-focus">PREMI START</button><p class="attract-hint">INVIO · TASTO A · TOCCA LO SCHERMO</p><button id="attract-tour" class="button small tour-button">${icon('camera',16)} GIRA LE PISTE IN ELICOTTERO</button></div>
      </div>
      <span id="attract-car-name" class="attract-car" aria-live="polite"></span>
    </section>
    <section id="screen-mode" class="screen screen-mode" data-screen-id="mode" hidden aria-label="Scelta della modalità">
      ${screenBar(1,'COME SI CORRE?')}
      <div class="screen-body mode-body">
        <div class="option-row"><span class="option-label">PILOTI</span><div class="segmented" role="group" aria-label="Numero di piloti"><button class="mode active" data-players="1" aria-pressed="true">${icon('person',20)} 1 PILOTA</button><button class="mode" data-players="2" aria-pressed="false">${icon('people',22)} 2 PILOTI</button></div></div>
        <div class="mode-grid" role="group" aria-label="Modalità di gioco">
          <button class="mode-card active primary-focus" data-mode="single" aria-pressed="true"><span class="mode-emoji">🏁</span><b>GARA SINGOLA</b><small>Una pista, fino a sei bolidi e casse piene di bonus. Si vince o si perde.</small></button>
          <button class="mode-card" data-mode="cup" aria-pressed="false"><span class="mode-emoji">🏆</span><b>CAMPIONATO</b><small>Cinque piste a sorpresa, punti 10/7/5/3/2/1, classifica e podio finale.</small></button>
          <button class="mode-card" data-mode="time" aria-pressed="false"><span class="mode-emoji">⏱️</span><b>PROVA A TEMPO</b><small>Pista libera: solo tu e il cronometro. Batti il record della pista!</small></button>
        </div>
        <div class="option-row"><span class="option-label">LIVELLO</span><div class="segmented" role="group" aria-label="Difficoltà e velocità"><button class="active" data-difficulty="easy" aria-pressed="true">PRIME CORSE</button><button data-difficulty="normal" aria-pressed="false">PICCOLI CAMPIONI</button><button data-difficulty="fast" aria-pressed="false">TURBO</button><button data-difficulty="crazy" aria-pressed="false">FOLLE</button></div><p class="control-hint">${icon('gamepad',18)} <span id="menu-controls"></span></p></div>
        <div class="option-row option-row-quality"><span class="option-label">GRAFICA</span><div class="segmented" role="group" aria-label="Qualità grafica">${QUALITY_ORDER.map(id=>`<button data-quality="${id}" aria-pressed="false">${QUALITY_LEVELS[id].label}</button>`).join('')}</div></div>
      </div>
      ${screenFoot('to-cars','SCEGLI IL BOLIDE')}
    </section>
    <section id="screen-cars" class="screen screen-cars" data-screen-id="cars" hidden aria-label="Scelta del bolide">
      ${screenBar(2,'SCEGLI IL BOLIDE','<span id="car-count" class="bar-count"></span>')}
      <div class="screen-body cars-body">
        <div id="showroom" class="showroom">
          <div class="stage-top"><span class="stage-label"><i></i> PRONTA AL VIA</span><div class="pilot-picker" id="pilot-picker" hidden><button class="active" data-pilot="0">P1 <span id="pilot1-car"></span></button><button data-pilot="1">P2 <span id="pilot2-car"></span></button></div></div>
          <div id="stage-cars" class="viewport-slot"></div>
          <div class="stage-caption"><span id="selected-source"></span><h2 id="selected-name"></h2><p id="selected-description"></p></div>
        </div>
        <div class="garage-panel">
          <div class="garage-head"><span class="eyebrow">Scorri: prima la scuderia, poi le vostre</span></div>
          <div id="car-grid" class="car-grid"></div>
        </div>
      </div>
      ${screenFoot('to-track','SCEGLI LA PISTA')}
    </section>
    <section id="screen-track" class="screen screen-track" data-screen-id="track" hidden aria-label="Scelta della pista">
      ${screenBar(3,'SCEGLI LA PISTA')}
      <div class="screen-body track-body">
        <div class="track-preview"><div id="stage-track" class="viewport-slot"></div><div class="track-info"><span class="eyebrow" id="track-eyebrow"></span><h3 id="track-title"></h3><p id="track-description"></p><div class="track-features" id="track-features"></div><button id="explore-track" class="button small explore-button">${icon('camera',18)} ESPLORA LA PISTA</button></div></div>
        <div class="track-side"><div id="track-picker" class="track-picker" role="radiogroup" aria-label="Piste"></div><div class="track-params" id="track-params"></div></div>
      </div>
      <div class="screen-foot"><button class="button back-button" data-back>${icon('back',18)} INDIETRO</button><span class="foot-hint">ESC indietro · INVIO parte · FRECCE per muoverti</span><button id="start-race" class="start-button">VIA! ${icon('arrow',24)}</button></div>
    </section>
    <section id="screen-champion" class="screen screen-champion" data-screen-id="champion" hidden aria-label="Premiazione del campionato">
      ${screenBar(4,'PREMIAZIONE')}
      <div id="champion-confetti" class="confetti" aria-hidden="true"></div>
      <div class="screen-body cars-body champion-body">
        <div class="showroom">
          <div class="stage-top"><span class="stage-label"><i></i> <span id="champion-stage-label">IL CAMPIONE</span></span></div>
          <div id="stage-champion" class="viewport-slot"></div>
          <div class="stage-caption"><span id="champion-pilot"></span><h2 id="champion-car"></h2></div>
        </div>
        <div id="champion-panel" class="champion-panel"></div>
      </div>
      <div class="screen-foot"><button id="champion-garage" class="button back-button">${icon('back',18)} TORNA AL GARAGE</button><span class="foot-hint">ESC garage · INVIO un altro campionato</span><button id="new-cup" class="start-button primary-focus">UN ALTRO CAMPIONATO! ${icon('flag',24)}</button></div>
    </section>
  </main>
  <section id="race-screen" class="race-screen" hidden aria-label="Gara">
    <div id="race-viewport" class="race-viewport"></div>
    <div class="race-top"><div><button class="icon-button sound-button" aria-label="Disattiva audio">${icon('sound')}</button><button id="pause-button" class="icon-button" aria-label="Metti in pausa">${icon('pause')}</button></div><span id="cup-badge" class="cup-badge" hidden></span></div>
    <div id="huds" class="huds"></div><div id="countdown" class="countdown"></div>
    <div class="map-panel"><canvas id="minimap" width="180" height="125" aria-label="Mappa della pista"></canvas><span id="map-label">CIRCUITO DELLE NUVOLE</span></div>
    <div id="race-notice" class="race-notice" role="status"></div><div id="touch-controls" class="touch-controls"></div>
    <div id="race-key-hint" class="race-key-hint">ACCELERIAMO NOI. TU PENSA A VINCERE! · ESC PAUSA</div>
  </section>
  <div id="modal-overlay" class="modal-overlay" hidden><section id="modal" class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"></section></div>
  <div id="toast" class="toast" role="status" hidden></div>
`;

let renderer, rendererFailed = false;
/** The 3D renderer is created right after the first paint, so START shows at once; screens that need it call this first. */
function ensureRenderer() {
  if (renderer || rendererFailed) return renderer;
  try {
    renderer = new GameRenderer($('#viewport'), undefined, { quality });
    renderer.setShowroomLook(theme);
    renderer.canvas.classList.add('fade-in');
    requestAnimationFrame(() => renderer?.canvas.classList.add('is-ready'));
  } catch (error) {
    rendererFailed = true;
    $('#viewport').innerHTML = '<div class="graphics-error"><h2>Accendiamo i motori!</h2><p>Per la grafica 3D apri il gioco in Chrome o Edge con l’accelerazione grafica attiva.</p></div>'; $('#start-race').disabled = true; console.error(error);
  }
  return renderer;
}

const thumbnailKey = car => [car.id,car.color,car.accent,car.shape,car.width,car.length,car.height,car.detail,car.version,(car.parts||[]).join(','),(car.palette||[]).join(',')].join('|');
function carThumbnail(car) {
  const key = thumbnailKey(car);
  if (thumbnailCache.has(key)) return thumbnailCache.get(key);
  let data = '';
  try { data = ensureRenderer()?.createCarThumbnail?.(car) || ''; } catch (e) { console.warn('Anteprima auto',e); }
  if (data) {
    thumbnailCache.set(key,data);
    // Editing sliders can generate hundreds of different previews in one session.
    while (thumbnailCache.size > 96) thumbnailCache.delete(thumbnailCache.keys().next().value);
  }
  return data;
}
/** The garage is one scrolling list: first the house team, then the cars born from the children's own builds. */
const garageSections = () => [
  { id: 'scuderia', title: 'SCUDERIA LEGHO', note: `${CAR_PRESETS.length} bolidi pronti al via`, cars: CAR_PRESETS },
  { id: 'vostre', title: 'COSTRUITE DA VOI', note: `${SAMPLE_CARS.length + customCars.length} nate dalle vostre costruzioni`, cars: [...SAMPLE_CARS, ...customCars] },
];
/** Cars whose card is currently showing the photo they were built from instead of their 3D model. */
const photoShown = new Set();
function carCard(car, section) {
  const isSelected = selected[activePilot]?.id === car.id;
  const image = thumbnailCache.get(thumbnailKey(car)) || '';
  const showing = photoShown.has(car.id);
  // Only the cars recreated from a photo carry one, and the file is fetched only when someone asks for it.
  const peek = car.sourceUrl ? `<span class="photo-peek${showing ? ' on' : ''}" role="button" tabindex="0" data-photo="${escape(car.id)}" aria-label="${showing ? 'Torna al modello 3D' : 'Guarda la foto vera'}" title="${showing ? 'Torna al modello 3D' : 'Guarda la foto vera'}">${icon(showing ? 'brick' : 'camera', 15)}</span>` : '';
  const badge = section === 'vostre' ? (customCars.includes(car) ? 'LA TUA FOTO' : 'DALLA FOTO') : car.tag || '';
  const line = car.tagline || (section === 'vostre' ? (customCars.includes(car) ? 'Creata dalla tua foto' : 'Costruita da te, pronta a correre') : 'Bolide di fantasia');
  return `<button class="car-card ${isSelected ? 'selected primary-focus' : ''}" data-car="${escape(car.id)}" data-section="${section}" aria-pressed="${isSelected}" style="--car-color:${escape(car.color)}"><div class="car-image">${showing ? `<img src="${escape(car.sourceUrl)}" alt="La foto della costruzione ${escape(car.name)}" loading="lazy" />` : image ? `<img src="${image}" alt="Modello 3D ${escape(car.name)}" />` : icon('brick',70)}${peek}<span class="car-selection">${icon('check',13)}</span>${badge ? `<span class="from-photo">${escape(badge)}</span>` : ''}</div><div class="car-card-bottom"><div><h3>${escape(car.name)}</h3><p>${escape(line)}</p></div><span class="color-dot"></span></div></button>`;
}
function renderGarage() {
  const sections = garageSections();
  const cars = sections.flatMap(s => s.cars);
  $('#car-count').textContent = `${catalog.length} AUTO`;
  $('#car-grid').innerHTML = sections.map(section => `<h3 class="grid-section section-${section.id}"><span>${section.title}</span><small>${section.note}</small><i aria-hidden="true"></i></h3>`
    + section.cars.map(car => carCard(car, section.id)).join('')).join('');
  $('#car-grid').querySelectorAll('[data-car]').forEach(button => button.addEventListener('click',() => { selected[activePilot] = catalog.find(c => c.id === button.dataset.car); updateSelection(); renderGarage(); $(`[data-car="${button.dataset.car}"]`)?.focus({preventScroll:true}); playTone(470,.05); }));
  $('#car-grid').querySelectorAll('[data-photo]').forEach(spot => {
    const flip = event => {
      event.preventDefault(); event.stopPropagation();
      const id = spot.dataset.photo;
      if (photoShown.has(id)) photoShown.delete(id); else photoShown.add(id);
      renderGarage();
      $(`[data-photo="${id}"]`)?.focus({preventScroll:true});
      playTone(560,.05);
    };
    spot.addEventListener('click',flip);
    spot.addEventListener('keydown',event => { if(event.key==='Enter'||event.key===' ') flip(event); });
  });
  fillThumbnails(cars);
  if(customCars.some(c=>c.id===selected[activePilot].id)) {
    const editButton = document.createElement('button');
    editButton.className='edit-custom text-button';
    editButton.textContent='Modifica la tua auto';
    editButton.addEventListener('click',()=>{
      modalEpoch++;
      const car=selected[activePilot];
      editingCarId=car.id;
      pendingCar=structuredClone(car);
      showCarEditor();
    });
    $('#car-grid').append(editButton);
    const remove = document.createElement('button');
    remove.className='remove-custom text-button';
    remove.textContent=`Elimina “${selected[activePilot].name}” dal garage`;
    remove.addEventListener('click',()=>{
      const id=selected[activePilot].id;
      const next=customCars.filter(c=>c.id!==id);
      try{localStorage.setItem(GARAGE_STORAGE_KEY,JSON.stringify(next));}catch{toast('Il browser non riesce ad aggiornare il garage.');return;}
      customCars=next;catalog=[...SAMPLE_CARS,...CAR_PRESETS,...customCars];
      selected=selected.map(c=>c.id===id?(customCars[0]||CAR_PRESETS[0]):c);
      renderGarage();toast('Auto rimossa dal garage.');
    });
    $('#car-grid').append(remove);
  }
  updateSelection();
}
let thumbnailEpoch = 0;
/** Thumbnails missing from the cache are rendered two per frame once the grid is on screen, so the garage never freezes. */
function fillThumbnails(cars) {
  const epoch = ++thumbnailEpoch;
  const pending = cars.filter(car => !thumbnailCache.has(thumbnailKey(car)));
  if (!pending.length) return;
  const step = () => {
    if (epoch !== thumbnailEpoch) return;
    for (const car of pending.splice(0, 2)) {
      const image = carThumbnail(car);
      const holder = $('#car-grid')?.querySelector(`[data-car="${car.id}"] .car-image`);
      if (!image || !holder || holder.querySelector('img')) continue;
      const img = document.createElement('img');
      img.src = image; img.alt = `Modello 3D ${car.name}`;
      holder.querySelector('svg')?.remove();
      holder.prepend(img);
    }
    if (pending.length) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function updateSelection() {
  const car = selected[activePilot];
  $('#selected-name').textContent = car.name;
  $('#selected-description').textContent = car.description || 'Mattoncini, quattro ruote e tanta voglia di correre.';
  $('#selected-source').textContent = `${players===2?`PILOTA ${activePilot+1} · `:''}${SAMPLE_CARS.includes(car) ? 'ISPIRATA ALLA TUA COSTRUZIONE' : customCars.includes(car) ? 'CREATA DALLA TUA FOTO' : 'BOLIDE DI FANTASIA'}`;
  $('#pilot1-car').textContent = selected[0].name;
  $('#pilot2-car').textContent = selected[1].name;
  // The cup draws its own circuits: from the garage it goes straight to the first race.
  $('#to-track').innerHTML = players===2 && activePilot===0 ? `PILOTA 2, TOCCA A TE ${icon('arrow',24)}` : mode==='cup' ? `VIA ALLA COPPA! ${icon('trophy',24)}` : `SCEGLI LA PISTA ${icon('arrow',24)}`;
}
function toast(message) { clearTimeout(toastTimeout); $('#toast').textContent = message; $('#toast').hidden = false; toastTimeout = setTimeout(() => $('#toast').hidden = true,4000); }
function playTone(frequency=440,duration=.12,type='sine',volume=.06) { audio.tone(frequency,duration,type,volume); }
/** The sound button cycles Musica e effetti → Solo effetti → Silenzio; the choice is saved in the browser. */
function renderSoundButtons() {
  const mode=audio.mode, name=mode==='all'?'sound':mode==='sfx'?'sfx':'mute';
  document.querySelectorAll('.sound-button').forEach(b => { b.innerHTML = icon(name); b.setAttribute('aria-label',`Audio: ${AUDIO_MODE_LABELS[mode].toLowerCase()}. Cambia`); b.title=AUDIO_MODE_LABELS[mode]; });
}
function toggleSound() {
  const mode=audio.cycleMode();
  renderSoundButtons(); toast(AUDIO_MODE_LABELS[mode]);
  if(mode==='all'){audio.sfx('on');audio.startMusic(menuMusic());}
  else if(mode==='sfx')playTone();
}
renderSoundButtons();
applyTheme(theme, { remember: false });
document.querySelectorAll('.theme-button').forEach((b) => b.addEventListener('click', () => { applyTheme(theme === 'chiaro' ? 'scuro' : 'chiaro'); playTone(520, .06, 'square', .04); }));
document.querySelectorAll('.sound-button').forEach(b => b.addEventListener('click',toggleSound));
document.querySelectorAll('.help-button').forEach(b => b.addEventListener('click',openHelp));
document.querySelectorAll('.controls-button').forEach(b => b.addEventListener('click',()=>openControls()));
document.querySelectorAll('.brand').forEach(b => b.addEventListener('click',e => { e.preventDefault(); showScreen('attract'); }));
document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click',goBack));

/* ---------- Arcade flow: START → modalità → bolide → pista → gara ---------- */
function showScreen(name) {
  if (!SCREEN_ORDER.includes(name) && name !== 'champion') return;
  const previous = menuScreen;
  if (previous === 'track' && name !== 'track' && exploring) { exploring = false; renderer?.stopFlyover?.(); }
  menuScreen = name;
  document.querySelectorAll('#menu .screen').forEach(section => { section.hidden = section.dataset.screenId !== name; });
  $('#menu').dataset.screen = name;
  const slot = { attract:'#stage-attract', cars:'#stage-cars', track:'#stage-track', champion:'#stage-champion' }[name];
  if (slot && name !== 'attract') ensureRenderer();
  if (slot && $('#viewport').parentElement !== $(slot)) { $(slot).append($('#viewport')); renderer?.resize(); }
  if (name === 'mode') renderModeScreen();
  if (name === 'cars') renderGarage();
  if (name === 'track') { renderTrackPicker(); previewSelectedTrack(); }
  if (name === 'champion') renderChampion();
  const section = $(`#screen-${name}`);
  section.classList.remove('enter'); void section.offsetWidth; section.classList.add('enter');
  if (previous !== name) playTone(name === 'attract' ? 300 : 520, .07, 'square', .03);
  (section.querySelector('.primary-focus') || section.querySelector('button:not([disabled])'))?.focus({ preventScroll:true });
  window.scrollTo(0,0);
}
/** Which loop plays outside a race: punk on the start screen, the calm garage tune once you are choosing. */
function menuMusic() {
  if (screen === 'race' && race) return musicForTheme(race.track.theme);
  return screen === 'menu' && menuScreen === 'attract' ? 'intro-punk' : 'menu';
}
function pressStart() { if (screen !== 'menu' || menuScreen !== 'attract') return; stopTour(); audio.unlock(); playTone(660,.12,'square',.05); setTimeout(()=>playTone(990,.16,'square',.05),90); audio.startMusic('menu'); showScreen('mode'); }
function goBack() {
  if (screen !== 'menu') return;
  if (menuScreen === 'champion') { showScreen('cars'); updateSelection(); return; }
  const index = SCREEN_ORDER.indexOf(menuScreen);
  if (index > 0) showScreen(SCREEN_ORDER[index-1]);
}
function advance() {
  if (screen !== 'menu') return;
  if (menuScreen === 'attract') pressStart();
  else if (menuScreen === 'mode') showScreen('cars');
  else if (menuScreen === 'cars') {
    if (players === 2 && activePilot === 0) { setActivePilot(1); toast('Pilota 2, scegli il tuo bolide!'); }
    else if (mode === 'cup') startRace();
    else showScreen('track');
  } else if (menuScreen === 'track') startRace();
  else if (menuScreen === 'champion') { cup = newCup(); startRace(); }
}
$('#press-start').addEventListener('click',pressStart);
// A click anywhere on the start screen begins the game — except on the tour button, which is its own thing.
$('#screen-attract').addEventListener('click',e => { if (e.target.closest('#attract-tour')) return; if (e.target.closest('button') !== $('#press-start')) pressStart(); });
$('#attract-tour').addEventListener('click',e => { e.stopPropagation(); toggleTour(); });
$('#to-cars').addEventListener('click',advance);
$('#to-track').addEventListener('click',advance);
$('#new-cup').addEventListener('click',()=>{cup=newCup();startRace();});
$('#champion-garage').addEventListener('click',goBack);
function moveFocus(code, container = $(`#screen-${menuScreen}`)) {
  const section = container;
  if (!section) return;
  const items = [...section.querySelectorAll('button:not([disabled]),input,select')].filter(el => el.getClientRects().length);
  if (!items.length) return;
  const current = items.includes(document.activeElement) ? document.activeElement : null;
  if (!current) { (section.querySelector('.primary-focus') || items[0]).focus(); return; }
  const from = current.getBoundingClientRect(), cx = from.left + from.width/2, cy = from.top + from.height/2;
  const [dx0, dy0] = { ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1] }[code];
  let best = null, bestScore = Infinity;
  for (const el of items) {
    if (el === current) continue;
    const r = el.getBoundingClientRect();
    const dx = r.left + r.width/2 - cx, dy = r.top + r.height/2 - cy;
    const along = dx*dx0 + dy*dy0;
    if (along < 4) continue;
    const across = Math.abs(dx*dy0) + Math.abs(dy*dx0);
    const score = along + across*2.5;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  if (best) { best.focus({ preventScroll:true }); best.scrollIntoView?.({ block:'nearest', inline:'nearest' }); playTone(700,.03,'square',.02); }
}
function handleMenuKey(e) {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const tag = document.activeElement?.tagName;
  if (['INPUT','SELECT','TEXTAREA'].includes(tag)) return;
  if (menuScreen === 'attract') { if (['Space','Enter','NumpadEnter'].includes(e.code)) { e.preventDefault(); pressStart(); } return; }
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)) { e.preventDefault(); moveFocus(e.code); return; }
  if (e.code === 'Enter' || e.code === 'NumpadEnter') {
    // A car card or a track card is a CHOICE, not an action: Enter takes it and moves on, which is what the
    // footer has always promised ("INVIO avanti"). Without this the arrow keys left you stuck on the garage,
    // because opening the screen focuses the selected card and Enter only re-selected it.
    const choice = document.activeElement?.closest?.('[data-car],[data-track]');
    if (choice) { e.preventDefault(); choice.click(); advance(); return; }
    if (tag !== 'BUTTON') { e.preventDefault(); advance(); }
  }
}
function pollMenuGamepad(dt) {
  const pad = Array.from(navigator.getGamepads?.() || []).find(Boolean);
  if (!pad) return;
  const modalOpen = !$('#modal-overlay').hidden;
  const a = !!pad.buttons[0]?.pressed, b = !!pad.buttons[1]?.pressed;
  if (a && !padMenu.a) {
    if (menuScreen === 'attract') pressStart();
    else if (!modalOpen) { const el = document.activeElement; if (el?.tagName === 'BUTTON' && $(`#screen-${menuScreen}`).contains(el)) el.click(); else moveFocus('ArrowRight'); }
  }
  if (b && !padMenu.b && !modalOpen) goBack();
  padMenu.a = a; padMenu.b = b;
  padMenu.cooldown = Math.max(0, padMenu.cooldown - dt);
  const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
  const dir = (pad.buttons[14]?.pressed || ax < -.5) ? 'ArrowLeft' : (pad.buttons[15]?.pressed || ax > .5) ? 'ArrowRight' : (pad.buttons[12]?.pressed || ay < -.5) ? 'ArrowUp' : (pad.buttons[13]?.pressed || ay > .5) ? 'ArrowDown' : null;
  if (!dir) { padMenu.cooldown = 0; return; }
  if (!modalOpen && menuScreen !== 'attract' && padMenu.cooldown === 0) { moveFocus(dir); padMenu.cooldown = .22; }
}
function startTour() {
  if (!ensureRenderer()) return;
  const ids = TRACKS.map(t => t.id);
  const next = ids[Math.floor(Math.random() * ids.length)];
  // Never the same circuit twice running, unless there is only one.
  tour = { id: tour && tour.id === next && ids.length > 1 ? ids[(ids.indexOf(next) + 1) % ids.length] : next };
  renderer.previewTrack(getTrack(tour.id));
  renderer.startFlyover(10 + Math.random() * 4);
  $('#attract-car-name').textContent = getTrack(tour.id).name;
  $('#attract-tour').classList.add('is-on');
  showFlyoverName(getTrack(tour.id).name);
}
function stopTour() {
  if (!tour) return;
  tour = null;
  renderer?.stopFlyover?.();
  showFlyoverName(null);
  $('#attract-tour').classList.remove('is-on');
  updateAttractCar();
}
function toggleTour() { if (tour) stopTour(); else { audio.unlock(); startTour(); } playTone(tour ? 720 : 400, .09); }

function updateAttractCar() {
  const car = attractCars[attractIndex];
  $('#attract-car-name').textContent = car.name;
}

/* ---------- Modalità ---------- */
function renderModeScreen() {
  document.querySelectorAll('[data-players]').forEach(x => { const on = Number(x.dataset.players) === players; x.classList.toggle('active',on); x.setAttribute('aria-pressed',on); });
  document.querySelectorAll('[data-mode]').forEach(x => { const on = x.dataset.mode === mode; x.classList.toggle('active',on); x.classList.toggle('primary-focus',on); x.setAttribute('aria-pressed',on); });
  document.querySelectorAll('[data-difficulty]').forEach(x => { const on = x.dataset.difficulty === difficulty; x.classList.toggle('active',on); x.setAttribute('aria-pressed',on); });
  document.querySelectorAll('[data-quality]').forEach(x => { const on = x.dataset.quality === quality; x.classList.toggle('active',on); x.setAttribute('aria-pressed',on); });
  updateControlHints();
}
function applyQuality(level, { announce = false } = {}) {
  if (!QUALITY_LEVELS[level] || level === quality) return;
  quality = level; saveQuality(safeStorage, level); frameMonitor.reset();
  renderer?.setQuality(level); renderModeScreen();
  if (announce) toast(`Grafica ${QUALITY_LEVELS[level].label.toLowerCase()}: così la gara resta fluida.`);
}
function setActivePilot(index) {
  activePilot = index;
  document.querySelectorAll('[data-pilot]').forEach(x => x.classList.toggle('active',Number(x.dataset.pilot) === activePilot));
  renderGarage();
}
document.querySelectorAll('[data-players]').forEach(b => b.addEventListener('click',() => {
  players = Number(b.dataset.players); activePilot = 0;
  $('#pilot-picker').hidden = players !== 2;
  renderModeScreen(); setActivePilot(0); playTone(470,.05);
}));
document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click',() => { mode = b.dataset.mode; renderModeScreen(); playTone(560,.06,'square',.04); showScreen('cars'); }));
document.querySelectorAll('[data-difficulty]').forEach(b => b.addEventListener('click',() => { difficulty = b.dataset.difficulty; renderModeScreen(); playTone(470,.05); }));
document.querySelectorAll('[data-quality]').forEach(b => b.addEventListener('click',() => { applyQuality(b.dataset.quality); playTone(470,.05); }));
document.querySelectorAll('[data-pilot]').forEach(b => b.addEventListener('click',() => { setActivePilot(Number(b.dataset.pilot)); playTone(470,.05); }));

/* ---------- Pista e parametri ---------- */
const hex6=n=>'#'+n.toString(16).padStart(6,'0');
const LEVEL_LABEL = { easy:'PRIME CORSE', normal:'CAMPIONI', fast:'TURBO', crazy:'FOLLE' };
const derivedTracks = new Map();
const currentTrackDef = () => TRACK_DEFINITIONS.find(d => d.id === trackId) || TRACK_DEFINITIONS[0];
const effectiveLaps = () => lapsOverride ?? currentTrackDef().laps;
const effectiveOpponents = () => mode === 'time' ? 0 : Math.max(0, Math.min(5, opponentsOverride ?? 6 - players));
const recordKey = (id=trackId, laps=effectiveLaps()) => trackRecordKey(id, laps);
/** The chosen circuit, re-compiled with the selected lap count when it differs from the default. */
function raceTrack(id, laps = effectiveLaps()) {
  const def = TRACK_DEFINITIONS.find(d => d.id === id);
  if (!def || laps === def.laps) return getTrack(id);
  const key = `${id}:${laps}`;
  if (!derivedTracks.has(key)) derivedTracks.set(key, createTrack({ ...def, laps }));
  return derivedTracks.get(key);
}
function trackOutline(track){
  const pts=track.points(72),xs=pts.map(p=>p.x),zs=pts.map(p=>p.z),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs),s=Math.min(70/(maxX-minX),42/(maxZ-minZ));
  const d=pts.map((p,i)=>`${i?'L':'M'}${(42+(p.x-(minX+maxX)/2)*s).toFixed(1)} ${(28+(p.z-(minZ+maxZ)/2)*s).toFixed(1)}`).join(' ')+' Z';
  return `<svg viewBox="0 0 84 56" aria-hidden="true"><path d="${d}" fill="none" stroke="var(--road)" stroke-width="5.5" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#ffffffaa" stroke-width="1" stroke-dasharray="3 3"/></svg>`;
}
let exploring=false;
function previewSelectedTrack(){ exploring=false; try { renderer?.previewTrack(getTrack(trackId)); } catch (e) { console.warn('Anteprima pista', e); } updateExploreButton(); }
/**
 * "Esplora le piste": ten seconds or so of helicopter over the circuit you are looking at. It replaces the slow
 * orbit of the preview until it has flown a whole lap, and any other click on this screen puts it back.
 */
function updateExploreButton(){
  const button=$('#explore-track');
  if(!button)return;
  button.classList.toggle('is-on',exploring);
  button.innerHTML=exploring?`${icon('pause',18)} TORNA ALLA MAPPA`:`${icon('camera',18)} ESPLORA LA PISTA`;
}
function toggleExplore(){
  if(!renderer)return;
  exploring=exploring?false:!!renderer.startFlyover();
  if(!exploring)renderer.stopFlyover?.();
  showFlyoverName(exploring?getTrack(trackId).name:null);
  updateExploreButton();
  playTone(exploring?680:420,.09);
}
/**
 * The circuit's name over the flight. The 3D panel fills the screen while the helicopter is up, and without this
 * you are watching a place you cannot name — on the start screen there is no other label at all.
 */
function showFlyoverName(name){
  let caption=$('#flyover-name');
  if(!caption){
    caption=document.createElement('div');
    caption.id='flyover-name';
    caption.className='flyover-name';
    $('#viewport').append(caption);
  }
  caption.textContent=name||'';
  caption.hidden=!name;
  if(name){caption.classList.remove('enter');void caption.offsetWidth;caption.classList.add('enter');}
}
function renderTrackPicker(){
  const focused = document.activeElement?.dataset || {};
  const current=getTrack(trackId);
  $('#track-eyebrow').textContent=mode==='time'?'PROVA A TEMPO · BATTI IL RECORD':`GARA SINGOLA · ${players===2?'DUE PILOTI':'UN PILOTA'}`;
  $('#track-title').textContent=current.name;$('#track-description').textContent=current.description;
  const record=records[recordKey()];
  $('#track-features').innerHTML=`<span><b>${effectiveLaps()}</b>giri</span><span><b>${current.ramps.length}</b>rampe</span><span><b>${current.boxes.length}</b>casse</span><span><b>${current.length}</b>metri</span>${mode==='time'?`<span class="record"><b>${record?formatLap(record.time):'--:--'}</b>${record&&cleanPilotName(record.pilot)?`record di ${escape(cleanPilotName(record.pilot))}`:'record'}</span>`:''}`;
  $('#track-picker').innerHTML=TRACKS.map(t=>`<button class="track-card ${t.id===trackId?'primary-focus':''}" role="radio" data-track="${t.id}" aria-checked="${t.id===trackId}" style="--sky:${hex6(t.theme.sky)};--ground:${hex6(t.theme.ground)};--road:${hex6(t.theme.road)}"><span class="track-swatch">${trackOutline(t)}</span><span class="track-card-text"><b>${escape(t.name)}</b><span class="track-card-sub"><small>${escape(t.tagline)}</small>${t.theme.stars?'<span class="track-badge">NOTTE</span>':t.theme.dust?'<span class="track-badge dust">STERRATO</span>':t.sections?.some(s=>s.kind==='loop')?'<span class="track-badge loop">GIRO DELLA MORTE</span>':t.sections?.some(s=>s.kind==='bridge')?'<span class="track-badge bridge">SCORCIATOIE</span>':''}</span></span></button>`).join('');
  $('#track-picker').querySelectorAll('[data-track]').forEach(b=>b.addEventListener('click',()=>{
    if(trackId!==b.dataset.track){trackId=b.dataset.track;lapsOverride=null;}
    renderTrackPicker();previewSelectedTrack();playTone(470,.05);
    $(`[data-track="${trackId}"]`)?.focus({preventScroll:true});
  }));
  const laps=effectiveLaps(),opponents=effectiveOpponents(),timeMode=mode==='time';
  $('#track-params').innerHTML=`
    <div class="param"><span>GIRI</span><div class="stepper"><button data-step="laps" data-delta="-1" aria-label="Meno giri" ${laps<=1?'disabled':''}>−</button><b id="laps-value">${laps}</b><button data-step="laps" data-delta="1" aria-label="Più giri" ${laps>=5?'disabled':''}>+</button></div></div>
    <div class="param ${timeMode?'is-off':''}"><span>AVVERSARI</span><div class="stepper"><button data-step="opponents" data-delta="-1" aria-label="Meno avversari" ${timeMode||opponents<=0?'disabled':''}>−</button><b id="opponents-value">${opponents}</b><button data-step="opponents" data-delta="1" aria-label="Più avversari" ${timeMode||opponents>=5?'disabled':''}>+</button></div></div>
    <div class="param"><span>PILOTI</span><b class="param-value">${players}</b></div>
    <div class="param"><span>LIVELLO</span><b class="param-value small">${LEVEL_LABEL[difficulty]||difficulty}</b><small class="param-note">${Math.round(BASE_SPEED[difficulty]*3.6)} km/h</small></div>`;
  $('#track-params').querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>{
    const delta=Number(b.dataset.delta);
    if(b.dataset.step==='laps')lapsOverride=Math.max(1,Math.min(5,effectiveLaps()+delta));
    else opponentsOverride=Math.max(0,Math.min(5,effectiveOpponents()+delta));
    renderTrackPicker();playTone(600,.04);
  }));
  if(focused.step)$(`[data-step="${focused.step}"][data-delta="${focused.delta}"]:not([disabled])`)?.focus({preventScroll:true});
  $('#start-race').innerHTML=timeMode?`VIA COL CRONOMETRO! ${icon('timer',24)}`:`VIA! ${icon('arrow',24)}`;
  $('#explore-track').onclick=toggleExplore;
  updateExploreButton();
}

function openModal(content, className='') {
  previousFocus = document.activeElement; $('#modal').className = `modal ${className}`; $('#modal').innerHTML=content; $('#modal-overlay').hidden=false;
  $('#modal').querySelector('[data-close]')?.addEventListener('click',closeModal);
  $('#modal').querySelector('button,input,select')?.focus();
}
function closeModal() { if(bindingsDraft){closeControls();return;} modalEpoch++; if (screen === 'race' && paused) { resumeRace(); return; } $('#modal-overlay').hidden=true; previousFocus?.focus(); }
const modalClose = `<button class="icon-button modal-close" data-close aria-label="Chiudi">${icon('close')}</button>`;

function updateControlHints() {
  $('#menu-controls').textContent=bindings.slice(0,players).map((p,i)=>`${players===2?`P${i+1}: `:''}${keyLabel(p.left)} ${keyLabel(p.right)} · Bonus ${keyLabel(p.bonus)}`).join('   |   ');
  bindings.forEach((p,i)=>{const hint=$(`#item-${i} small`);if(hint)hint.textContent=`${keyLabel(p.bonus).toUpperCase()} · USA IL BONUS`;});
}
function openControls(origin='menu') {
  controlsOrigin=screen==='race'?'pause':origin;controlsFocus=document.activeElement;
  bindingsDraft=bindings.map(p=>({...p}));bindingCapture=null;
  keys.clear();keyEdges.clear();renderControls();
}
function renderControls(message='',focusTarget=null) {
  const panels=bindingsDraft.map((p,i)=>`<fieldset class="keyboard-player"><legend><span>P${i+1}</span> Pilota ${i+1}</legend>${KEY_ACTIONS.map(a=>{
    const listening=bindingCapture?.player===i&&bindingCapture?.action===a.id;
    return `<div class="binding-row ${a.expert?'is-expert':''}"><span>${a.label}${a.expert?' <em>TURBO+</em>':''}</span><button class="binding-key ${listening?'listening':''}" data-bind-player="${i}" data-bind-action="${a.id}" aria-label="Pilota ${i+1}: ${a.label}, ${keyLabel(p[a.id])}${a.expert?', solo dal livello Turbo':''}" aria-pressed="${listening}">${listening?'Premi un tasto…':escape(keyLabel(p[a.id]))}</button></div>`;
  }).join('')}</fieldset>`).join('');
  openModal(`${modalClose}<span class="modal-symbol">${icon('keyboard',34)}</span><span class="eyebrow">PANNELLO COMANDI · OGNI PILOTA I SUOI TASTI</span><h2 id="modal-title">La tua tastiera, le tue regole.</h2><p>Premi il pulsante di un comando, poi premi il tasto che vuoi usare. Ogni comando deve avere un tasto diverso.</p><p class="help-footnote">Salto e derapata funzionano dal livello <b>TURBO</b> in su: ai primi livelli l’auto si guida con due soli tasti.</p><div class="keyboard-panels">${panels}</div><p id="binding-status" class="binding-status ${message?'form-error':''}" role="status" aria-live="polite">${escape(message|| (bindingCapture?'In ascolto… Esc annulla questa scelta.':'L’auto accelera da sola. Esc resta il tasto pausa.'))}</p><div class="keyboard-actions"><button id="reset-bindings" class="button">Ripristina predefiniti</button><button id="cancel-bindings" class="button">Annulla</button></div><button id="save-bindings" class="start-button">Salva i tasti ${icon('check',21)}</button>`,'keyboard-modal');
  $('#modal').querySelectorAll('[data-bind-action]').forEach(button=>button.addEventListener('click',()=>{
    bindingCapture={player:Number(button.dataset.bindPlayer),action:button.dataset.bindAction};renderControls('',bindingCapture);
  }));
  $('#reset-bindings').addEventListener('click',()=>{bindingsDraft=defaultBindings();bindingCapture=null;renderControls();$('#reset-bindings').focus();});
  $('#cancel-bindings').addEventListener('click',closeControls);
  $('#save-bindings').addEventListener('click',()=>{
    const error=validateBindings(bindingsDraft);if(error){renderControls(error);return;}
    bindings=bindingsDraft.map(p=>({...p}));let saved=true;
    try{localStorage.setItem(BINDINGS_STORAGE_KEY,JSON.stringify({version:1,players:bindings}));}catch{saved=false;}
    updateControlHints();closeControls();toast(saved?'Tasti salvati. Pronti a correre!':'Tasti aggiornati per questa sessione. Il browser non consente il salvataggio.');
  });
  if(focusTarget)$(`[data-bind-player="${focusTarget.player}"][data-bind-action="${focusTarget.action}"]`)?.focus();
}
function closeControls() {
  bindingsDraft=null;bindingCapture=null;keys.clear();keyEdges.clear();
  if(controlsOrigin==='pause'){showPauseMenu();return;}
  if(controlsOrigin==='help'){openHelp();$('#help-keyboard')?.focus();return;}
  $('#modal-overlay').hidden=true;controlsFocus?.focus();
}
function captureControlKey(e) {
  if(!bindingsDraft||!bindingCapture)return false;
  if(e.code==='Tab'){bindingCapture=null;renderControls();return false;}
  e.preventDefault();e.stopPropagation();if(e.repeat)return true;
  const target=bindingCapture;
  if(e.code==='Escape'){bindingCapture=null;renderControls('',target);return true;}
  if(e.altKey||e.ctrlKey||e.metaKey){renderControls('Premi un solo tasto, senza Ctrl, Alt o Windows.',target);return true;}
  const result=assignBinding(bindingsDraft,target.player,target.action,e.code);
  if(result.error){renderControls(result.error,target);return true;}
  bindingsDraft=result.bindings;bindingCapture=null;renderControls('',target);return true;
}
function helpKeyboardHTML() {
  // The expert keys are listed only when the chosen level actually uses them, so nothing on screen is a promise the game does not keep.
  const expert=hasExpertControls(difficulty);
  return `<div class="help-controls">${bindings.map((p,i)=>`<div><b>PILOTA ${i+1}</b><p><kbd>${escape(keyLabel(p.left))}</kbd> <kbd>${escape(keyLabel(p.right))}</kbd> Sterza</p><p><kbd>${escape(keyLabel(p.bonus))}</kbd> Usa il bonus</p><p><kbd>${escape(keyLabel(p.brake))}</kbd> Rallenta</p>${expert?`<p><kbd>${escape(keyLabel(p.jump))}</kbd> Salta</p><p><kbd>${escape(keyLabel(p.drift))}</kbd> Derapa</p>`:''}</div>`).join('')}</div>${expert?'<p class="help-footnote">Salto e derapata sono accesi perché hai scelto un livello veloce.</p>':''}<button class="button wide" id="help-keyboard">${icon('keyboard',19)} Personalizza i tasti</button>`;
}

function openHelp() {
  openModal(`${modalClose}<span class="modal-symbol">${icon('gamepad',34)}</span><span class="eyebrow">POCHI TASTI, TANTA ADRENALINA</span><h2 id="modal-title">Pronti, piloti?</h2><p>L’auto accelera e segue le curve da sola. Tu sterzi per scegliere la traiettoria, prendere i bonus e superare gli avversari!</p>${helpKeyboardHTML()}<div class="bonus-guide"><span>⚡ <b>Turbo</b><small>Vai velocissimo</small></span><span>🚀 <b>Razzo</b><small>Raggiunge chi è davanti</small></span><span>💣 <b>Bomba</b><small>Una sorpresa dietro di te</small></span><span>🫧 <b>Scudo</b><small>Ti protegge dai colpi</small></span><span>🍬 <b>Spara caramelle</b><small>Una pioggia di caramelle per 5 secondi</small></span><span>🟢 <b>Gelatina</b><small>Incolla chi ci passa per mezzo secondo</small></span><span>🛢️ <b>Olio</b><small>Si slitta senza sterzo, e a volte è testacoda</small></span><span>🚀 <b>Tre razzi</b><small>Una raffica di tre, uno dietro l’altro</small></span><span>🎆 <b>Fontana</b><small>Scintille sulla strada: chi ci passa rallenta</small></span><span>🎇 <b>Girandola</b><small>Zigzaga da un bordo all’altro</small></span><span>🍦 <b>Spara gelato</b><small>Tre palline in faccia: si va piano e si sterza male</small></span><span>🌾 <b>Tre balle di fieno</b><small>Rotolano avanti e schiacciano chi trovano</small></span><span>🚁 <b>Elica</b><small>Per 7 secondi resti in aria: dalle rampe voli lontanissimo</small></span><span>🌈 <b>Arcobaleno</b><small>Per 6 secondi più veloce: chi tocchi esplode</small></span><span>🪂 <b>Paracadute</b><small>Aprilo durante un salto: voli avanti 5 secondi. A terra ti frena!</small></span><span>🪁 <b>Deltaplano</b><small>Dalle rampe plani lontanissimo</small></span><span>⛈️ <b>Nuvoletta</b><small>Rarissima! Un temporale rallenta tutti gli altri per 5 secondi</small></span></div><p class="help-footnote">Da 1 a 5 giri · fino a 6 bolidi · ${TRACKS.length} piste · Campionato su 5 piste a sorpresa · Prova a tempo con record · <kbd>Esc</kbd> Pausa<br>Nei menu: frecce per muoverti, Invio per confermare, Esc per tornare indietro. Gamepad: levetta o croce, A conferma, B indietro; in gara levetta sinistra, A per il bonus e B per rallentare. Su schermo touch compaiono i pulsanti.</p><button class="start-button" id="help-done">Ho capito! ${icon('check',21)}</button>`,'help-modal');
  $('#help-done').addEventListener('click',closeModal);
  $('#help-keyboard').addEventListener('click',()=>openControls('help'));
}
/** Edits a car already in the garage. New cars are no longer made in the game: the photo import was removed. */
function showCarEditor() {
  const car=pendingCar;
  // Format 3 keeps its wheels through an edit: the editor only touches what it shows.
  car.version=Math.max(2,Number(car.version)||0);car.parts=normalizeParts(car.parts);
  const clampValue=(value,min,max,fallback)=>Math.min(max,Math.max(min,Number(value)||fallback));
  car.length=clampValue(car.length,2.3,3.8,3.2);car.width=clampValue(car.width,1.3,2.3,1.7);car.height=clampValue(car.height,.7,1.7,1.15);
  const range=(id,label,min,max,value)=>`<label class="range-label">${label}<input id="${id}" type="range" min="${min}" max="${max}" step="0.05" value="${value}" /></label>`;
  const chips=CAR_PARTS.map(part=>`<label class="part-chip" title="${escape(part.hint)}"><input type="checkbox" name="part" value="${part.id}" ${car.parts.includes(part.id)?'checked':''} /><span class="chip-emoji" aria-hidden="true">${part.emoji}</span><span>${escape(part.label)}</span></label>`).join('');
  openModal(`${modalClose}<span class="eyebrow">LA TUA AUTO</span><h2 id="modal-title">Un ritocco da meccanico.</h2><div class="car-editor-preview"><img id="generated-car" src="${carThumbnail(car)}" alt="Il tuo bolide 3D"/></div><form id="car-form"><label>Come la chiami?<input id="car-name" maxlength="28" value="${escape(car.name)}" required autocomplete="off" /></label><div class="form-row"><label>Carrozzeria<select id="car-shape"><option value="buggy">Buggy</option><option value="racer">Da corsa</option><option value="truck">Camioncino</option><option value="classic">Semplice</option></select></label><label>Colore<input id="car-color" type="color" value="${escape(car.color)}" /></label><label>Dettagli<input id="car-accent" type="color" value="${escape(car.accent)}" /></label></div><div class="range-row">${range('car-length','Lunghezza',2.3,3.8,car.length)}${range('car-width','Larghezza',1.3,2.3,car.width)}${range('car-height','Altezza',.7,1.7,car.height)}</div><fieldset class="parts-grid"><legend class="eyebrow">PEZZI</legend>${chips}</fieldset><p id="save-error" class="form-error" role="alert"></p><button class="start-button" type="submit">Salva le modifiche ${icon('check',21)}</button></form>`,'photo-modal');
  $('#car-shape').value=car.shape;
  let previewFrame=0;
  const editorEpoch=modalEpoch;
  const refresh=()=>{
    const oldColor=car.color,oldAccent=car.accent;
    car.name=$('#car-name').value.trim();car.color=$('#car-color').value;car.accent=$('#car-accent').value;car.shape=$('#car-shape').value;
    if(car.color!==oldColor || car.accent!==oldAccent)car.palette=[car.color,car.accent,...(car.palette||[]).slice(2)];
    car.length=Number($('#car-length').value);car.width=Number($('#car-width').value);car.height=Number($('#car-height').value);
    car.parts=normalizeParts([...$('#car-form').querySelectorAll('input[name=part]:checked')].map(input=>input.value));
    // Sliders fire continuously; render one thumbnail per frame.
    if(!previewFrame)previewFrame=requestAnimationFrame(()=>{previewFrame=0;const preview=$('#generated-car');if(preview && editorEpoch===modalEpoch)preview.src=carThumbnail(car);});
  };
  ['input','change'].forEach(type=>$('#car-form').addEventListener(type,refresh));
  $('#car-form').addEventListener('submit',e=>{e.preventDefault();refresh();if(!car.name){$('#car-name').focus();return;}const next=customCars.map(c=>c.id===editingCarId?car:c);try{localStorage.setItem(GARAGE_STORAGE_KEY,JSON.stringify(next));}catch{$('#save-error').textContent='Il browser non riesce a salvare le modifiche. Libera spazio o abilita la memoria locale.';return;}customCars=next;catalog=[...SAMPLE_CARS,...CAR_PRESETS,...customCars];selected=selected.map(c=>c.id===editingCarId?car:c);selected[activePilot]=car;closeModal();if(menuScreen!=='cars')showScreen('cars');else renderGarage();toast('Modifiche salvate. Pronta a correre!');playTone(660,.2);});
}

/* ---------- Gara ---------- */
const formatTime=t=>`${Math.floor((t||0)/60)}:${String(Math.floor((t||0)%60)).padStart(2,'0')}`;
const formatLap=t=>`${Math.floor((t||0)/60)}:${String(Math.floor((t||0)%60)).padStart(2,'0')}.${Math.floor(((t||0)%1)*10)}`;
/**
 * The gap column of a results row, measured from Pilot 1 (with two pilots, Pilot 2's row shows its gap from Pilot 1).
 * The reference row shows `own` instead (its time, or nothing), so the column stays aligned.
 */
function gapCell(time, reference, own=''){
  if(!time||!reference)return '<i class="gap"></i>';
  if(time===reference)return `<i class="gap gap-own">${own}</i>`;
  const gap=formatGap(time,reference);
  return `<i class="gap gap-${gap.kind}">${gap.text}</i>`;
}
function saveRecords(){ try{localStorage.setItem(RECORDS_STORAGE_KEY,JSON.stringify(records));}catch{ /* records are a bonus */ } }
function savePilots(){ try{localStorage.setItem(PILOTS_STORAGE_KEY,JSON.stringify(pilotNames));}catch{ /* the roster is a convenience */ } }
/** "di Ada con Maggiolino" — the pilot when we know it, otherwise just the car. Records saved before names exist. */
function recordHolder(record){
  const pilot=cleanPilotName(record?.pilot),car=record?.name?escape(record.name):'';
  if(pilot&&car)return `di <b>${escape(pilot)}</b> con ${car}`;
  if(pilot)return `di <b>${escape(pilot)}</b>`;
  return car?`con ${car}`:'';
}
/** The name field shown after a new record, with the names already used as one-tap buttons: children type slowly. */
function recordNameHTML(current){
  const chips=pilotNames.map(name=>`<button type="button" class="pilot-chip" data-pilot="${escape(name)}">${escape(name)}</button>`).join('');
  return `<div class="pilot-ask"><label for="record-pilot">Chi ha fatto il record?</label><input id="record-pilot" type="text" maxlength="${MAX_PILOT_NAME}" autocomplete="off" spellcheck="false" placeholder="Il tuo nome" value="${escape(current||'')}">${chips?`<div class="pilot-chips">${chips}</div>`:''}</div>`;
}
function bindRecordName(key){
  const field=$('#record-pilot');
  if(!field)return;
  const store=(raw)=>{
    const name=cleanPilotName(raw);
    if(!records[key])return;
    records[key].pilot=name;saveRecords();
    if(name){pilotNames=rememberPilot(pilotNames,name);savePilots();}
  };
  field.addEventListener('change',()=>store(field.value));
  field.addEventListener('blur',()=>store(field.value));
  document.querySelectorAll('.pilot-chip').forEach(chip=>chip.addEventListener('click',()=>{field.value=chip.dataset.pilot;store(field.value);field.focus();}));
}
function startRace() {
  if(!ensureRenderer())return;
  modalEpoch++; noticeTimer=0;
  keys.clear();keyEdges.clear();touchPointers.clear();touchInputs.forEach(x=>{x.steer=0;x.useItem=false;x.brake=false;});
  if(mode==='cup'&&!cup)cup=newCup();
  const track=raceTrack(cup?cup.trackIds[cup.index]:trackId);
  renderer.setTrack(track);
  race=new RaceSimulation({players,difficulty,cars:selected.slice(0,players),aiCars:[...CAR_PRESETS,...SAMPLE_CARS],seed:cup?raceSeed(cup,cup.index):Date.now(),fieldSeed:cup?cup.seed:null,track,opponents:effectiveOpponents()});
  lapTiming=Array.from({length:players},()=>({start:0,best:null,last:null}));
  mapPoints=track.points(90);$('#map-label').textContent=track.name.toUpperCase();
  $('#cup-badge').hidden=!cup&&mode!=='time';
  if(cup)$('#cup-badge').textContent=`COPPA · GARA ${cup.index+1}/${cup.trackIds.length}`;else if(mode==='time')$('#cup-badge').textContent='PROVA A TEMPO';
  frameMonitor.reset();pausedFrameDrawn=false;
  paused=false;screen='race';lastCountdown='';$('#modal-overlay').hidden=true;$('#menu').hidden=true;$('#race-screen').hidden=false;
  $('#race-screen').classList.toggle('split-race',players===2);
  // Move the viewport, preserving the renderer's canvas and resize observer.
  $('#race-viewport').append($('#viewport'));
  $('#viewport').classList.add('in-race');renderer.setMode(players);renderer.resize();
  $('#huds').classList.toggle('two-players',players===2);
  const position=(i)=>mode==='time'?`<div class="position time-mode"><strong id="rank-${i}">--</strong><span>giro migliore</span></div>`:`<div class="position"><strong id="rank-${i}">1</strong><span> / ${race.racers.length}</span></div>`;
  $('#huds').innerHTML=Array.from({length:players},(_,i)=>`<div class="player-hud player-${i+1}"><div class="hud-head"><span class="hud-tag">P${i+1}</span><b class="hud-name">${escape(selected[i].name)}</b><span class="timer" id="timer-${i}">0:00</span></div><div class="hud-stats">${position(i)}<div class="lap"><span>GIRO</span><strong id="lap-${i}"><b>1</b> <small>/ ${race.totalLaps}</small></strong><em class="trip" id="trip-${i}">0 m</em></div><div class="gauge"><svg viewBox="-7 -7 134 86" aria-hidden="true"><path class="gauge-bg" d="M12 62 A48 48 0 0 1 108 62"/><path id="gauge-${i}" class="gauge-fill" d="M12 62 A48 48 0 0 1 108 62"/><line id="needle-${i}" class="gauge-needle" x1="60" y1="62" x2="60" y2="24" transform="rotate(-90 60 62)"/></svg><b id="speed-${i}">0</b><small>km/h</small></div></div><div class="item-slot" id="item-${i}"><span class="item-emoji">?</span><div><b>Prendi una cassa</b><small>${escape(keyLabel(bindings[i].bonus).toUpperCase())} · USA IL BONUS</small></div></div><div class="status" id="status-${i}"></div></div>`).join('');
  bindHUD();prepareMap();makeTouchControls(); window.scrollTo(0,0);playTone(320,.12);
  audio.setIntensity({});audio.setPaused(false);audio.startMusic(musicForTheme(track.theme));
}
$('#start-race').addEventListener('click',startRace);
$('#pause-button').addEventListener('click',pauseRace);
function pauseRace() {
  if(screen!=='race'||paused||race.state==='finished')return;
  paused=true;keys.clear();keyEdges.clear();touchPointers.clear();touchInputs.forEach(i=>{i.steer=0;i.brake=false;i.useItem=false;});
  audio.setPaused(true);
  showPauseMenu();
}
function showPauseMenu(){
  openModal(`<span class="modal-symbol">${icon('pause',32)}</span><span class="eyebrow">AI BOX</span><h2 id="modal-title">Pausa!</h2><p>La pista ti aspetta. Ripartiamo quando vuoi.</p><button id="resume-race" class="start-button">Continua la gara ${icon('arrow',21)}</button><button id="restart-race" class="button wide">${cup?'Ricomincia questa gara':'Ricomincia'}</button><button id="pause-keyboard" class="button wide">${icon('keyboard',19)} Imposta i tasti</button><button id="exit-race" class="text-button">${backLabel()}</button>`,'pause-modal');
  $('#pause-keyboard').addEventListener('click',()=>openControls('pause'));
  $('#resume-race').addEventListener('click',resumeRace);$('#restart-race').addEventListener('click',startRace);$('#exit-race').addEventListener('click',exitRace);
}
function resumeRace(){paused=false;keys.clear();keyEdges.clear();$('#modal-overlay').hidden=true;previousTime=performance.now();audio.setPaused(false);}
function exitRace(){
  if(cup&&!isCupFinished(cup))toast('Campionato interrotto. Torna in pista quando vuoi!');
  leaveRace();
  showScreen(mode==='cup'?'cars':'track');updateSelection();
}
/** Out of the race and back to the menus (the screen to show is the caller's). */
function leaveRace(){
  cup=null;screen='menu';paused=false;race=null;
  audio.setPaused(false);audio.setIntensity({});audio.startMusic(menuMusic());
  $('#modal-overlay').hidden=true;$('#race-screen').hidden=true;$('#menu').hidden=false;
  $('#viewport').classList.remove('in-race');renderer.setMode(1);
}
/** A new cup: five circuits drawn at random, and the field of opponents, from the same seed. */
const backLabel=()=>mode==='cup'?'Torna al garage':'Torna alla scelta della pista';
function newCup(){const seed=Date.now()>>>0;return createCup({trackIds:cupTrackIds(TRACKS.map(t=>t.id),seed),seed});}
/** Where the pilots finished, in words: the line under the results' title. */
function placeSummary(humans,total){
  if(humans.length===1)return humans[0].rank===1?'1° posto: hai vinto!':`Al traguardo: ${humans[0].rank}° posto su ${total}.`;
  return `${humans.map(r=>`Pilota ${r.playerIndex+1}: ${r.rank}° posto`).join(' · ')} su ${total}.`;
}
function showResults(){
  paused=true;
  const humans=race.racers.slice(0,players),ranked=[...race.racers].sort((a,b)=>a.rank-b.rank);
  const times=raceTimes(race.racers,race.time,race.finishDistance),reference=times.get(humans[0].id);
  const humanTag=r=>`<small>${players===2?`PILOTA ${r.playerIndex+1}`:'IL TUO BOLIDE'}</small>`;
  const title=humans.some(h=>h.rank===1)?'Che vittoria!':'Che gara!';
  audio.stopMusic();audio.sfx('finish');
  if(mode==='time'){
    const key=recordKey(race.track.id,race.totalLaps);
    const fastest=humans.reduce((best,r)=>r.finished&&(best===null||r.finishTime<best.finishTime)?r:best,null);
    const previous=records[key];
    const isRecord=!!fastest&&beatsRecord(previous,fastest.finishTime);
    // A new record keeps the previous holder's name as the suggestion: usually it is the same child, racing again.
    if(isRecord){records[key]={time:fastest.finishTime,lap:lapTiming[fastest.playerIndex]?.best??null,name:fastest.name,pilot:previous?.pilot||pilotNames[0]||'',date:new Date().toISOString().slice(0,10)};saveRecords();}
    const rows=humans.map(r=>`<div class="result-row is-human"><strong>${players===2?`P${r.playerIndex+1}`:'⏱'}</strong><span>${escape(r.name)}<small>GIRO MIGLIORE ${lapTiming[r.playerIndex]?.best?formatLap(lapTiming[r.playerIndex].best):'--'}</small></span><b>${r.finished?formatLap(r.finishTime):'In pista'}</b></div>`).join('');
    openModal(`<div class="confetti-decoration">✦ <span>✧</span> ✦</div><span class="modal-symbol gold">${icon('timer',40)}</span><span class="eyebrow">PROVA A TEMPO · ${escape(race.track.name.toUpperCase())} · ${race.totalLaps} GIRI</span><h2 id="modal-title">${isRecord?'NUOVO RECORD!':'Tempo fermato!'}</h2><p>${isRecord?'Nessuno era mai stato così veloce su questa pista.':`Record della pista: ${formatLap(records[key].time)} ${recordHolder(records[key])}.`}</p><div class="result-list">${rows}</div>${isRecord?recordNameHTML(records[key].pilot):''}<button id="play-again" class="start-button">Riprova! ${icon('flag',21)}</button><button id="results-garage" class="text-button">${icon('back',17)} Cambia pista</button>`,'results-modal');
    if(isRecord)bindRecordName(key);
    $('#play-again').addEventListener('click',startRace);$('#results-garage').addEventListener('click',exitRace);
    return;
  }
  if(cup){
    cup=recordRaceResult(cup,race.racers,times);
    const finished=isCupFinished(cup),standings=sortStandings(cup.standings);
    openModal(`<span class="modal-symbol gold">${icon('trophy',40)}</span><span class="eyebrow">COPPA · GARA ${cup.index}/${cup.trackIds.length} · ${escape(race.track.name.toUpperCase())}</span><h2 id="modal-title">${title}</h2><p>${placeSummary(humans,race.racers.length)} ${finished?'Tutte le piste sono state corse!':'I punti si sommano: il campionato continua.'}</p><div class="result-list">${ranked.map(r=>`<div class="result-row ${humans.includes(r)?'is-human':''}"><strong>${r.rank}°</strong><span>${escape(r.name)}${humans.includes(r)?humanTag(r):''}</span>${gapCell(times.get(r.id),reference,formatRaceTime(reference))}<b>+${pointsForRank(r.rank)}</b></div>`).join('')}</div><span class="eyebrow">CLASSIFICA · DISTACCHI SUL TEMPO TOTALE</span>${standingsHTML(standings)}${finished?`<button id="cup-podium" class="start-button">Vai al podio! ${icon('trophy',21)}</button>`:`<button id="next-race" class="start-button">Prossima pista: ${escape(getTrack(cup.trackIds[cup.index]).name)} ${icon('arrow',21)}</button>`}<button id="results-garage" class="text-button">${icon('back',17)} ${backLabel()}</button>`,'results-modal');
    $('#next-race')?.addEventListener('click',startRace);$('#cup-podium')?.addEventListener('click',showCupPodium);$('#results-garage').addEventListener('click',exitRace);
    return;
  }
  openModal(`<div class="confetti-decoration">✦ <span>✧</span> ✦</div><span class="modal-symbol gold">${icon('trophy',40)}</span><span class="eyebrow">BANDIERA A SCACCHI!</span><h2 id="modal-title">${title}</h2><p>${placeSummary(humans,race.racers.length)} ${players===2?'Due piloti, il doppio della sfida.':'Ogni giro è una battaglia.'}</p><div class="result-list">${ranked.map(r=>`<div class="result-row ${humans.includes(r)?'is-human':''}"><strong>${r.rank}°</strong><span>${escape(r.name)}${humans.includes(r)?humanTag(r):''}</span>${gapCell(times.get(r.id),reference)}<b>${formatRaceTime(times.get(r.id))}</b></div>`).join('')}</div><button id="play-again" class="start-button">Un’altra corsa! ${icon('flag',21)}</button><button id="results-garage" class="text-button">${icon('back',17)} Cambia pista</button>`,'results-modal');
  $('#play-again').addEventListener('click',startRace);$('#results-garage').addEventListener('click',exitRace);
}
/** Cup standings: points decide the order, the gap is on the total time, from Pilot 1, whose row shows that total. */
function standingsHTML(standings){
  const reference=standings.find(s=>s.playerIndex===0)?.total;
  return `<div class="result-list standings">${standings.map((s,i)=>`<div class="result-row ${s.isPlayer?'is-human':''}"><strong>${i+1}°</strong><span>${escape(s.name)}</span>${gapCell(s.total,reference,reference?formatRaceTime(reference):'')}<b>${s.points} pt</b></div>`).join('')}</div>`;
}
/**
 * The prize-giving at the end of a cup, a screen of its own ("una schermata di vittoria per il campionato"): the
 * winning car turning in the showroom, confetti, the podium, where each pilot finished on every circuit and the
 * final standings. `champion` keeps the cup's results once the cup itself is closed.
 */
let champion=null;
function showCupPodium(){
  champion={standings:sortStandings(cup.standings),trackIds:[...cup.trackIds]};
  leaveRace();
  showScreen('champion');
  audio.sfx('podium');
  if(champion.standings[0]?.isPlayer)[523,659,784,1046,1318].forEach((f,i)=>setTimeout(()=>playTone(f,i===4?.5:.14,'square',.05),700+i*140));
}
function renderChampion(){
  if(!champion)return;
  const {standings,trackIds}=champion,top=standings.slice(0,3),order=[1,0,2],winner=standings[0];
  const humans=standings.filter(s=>s.isPlayer).sort((a,b)=>a.playerIndex-b.playerIndex);
  const place=(s)=>standings.indexOf(s)+1,won=!!winner?.isPlayer;
  const line=humans.length===1
    ?(won?`Hai vinto il campionato con ${winner.points} punti!`:`${place(humans[0])}° posto nel campionato, con ${humans[0].points} punti.`)
    :humans.map(h=>`Pilota ${h.playerIndex+1}: ${place(h)}° con ${h.points} punti`).join(' · ');
  $('#champion-stage-label').textContent=won?'IL BOLIDE CAMPIONE':'IL CAMPIONE';
  $('#champion-pilot').textContent=won?(humans.length>1?`PILOTA ${winner.playerIndex+1} · CAMPIONE!`:'SEI TU IL CAMPIONE!'):`CAMPIONE CON ${winner?.points??0} PUNTI`;
  $('#champion-car').textContent=winner?.name||'';
  $('#champion-panel').innerHTML=`<span class="eyebrow">FINE DEL CAMPIONATO · ${trackIds.length} PISTE</span>
    <h2 id="champion-title" class="champion-title">${icon('trophy',44)} ${won?'CAMPIONI!':'CHE CAMPIONATO!'}</h2><p class="champion-line">${escape(line)}</p>
    <div class="podium">${order.map(i=>top[i]?`<div class="podium-step step-${i+1} ${top[i].isPlayer?'is-human':''}"><span class="podium-rank">${i+1}°</span><b>${escape(top[i].name)}</b><small>${top[i].points} pt</small></div>`:'').join('')}</div>
    <div class="champion-races">${trackIds.map((id,i)=>`<div class="champion-race"><span>${i+1}</span><b>${escape(getTrack(id).name)}</b>${humans.map(h=>`<em class="${h.placements[i]===1?'gold':''}">${h.placements[i]??'-'}°</em>`).join('')}</div>`).join('')}</div>
    ${standingsHTML(standings)}`;
  // More confetti for a win; a few anyway, it is a prize-giving.
  const colours=['var(--gold)','var(--accent)','var(--p2)','#e5203a','#2fd36f','#f4f0e2'];
  $('#champion-confetti').innerHTML=Array.from({length:won?70:24},(_,i)=>`<i style="left:${(i*37)%100}%;background:${colours[i%colours.length]};animation-delay:${-((i*0.53)%4).toFixed(2)}s;animation-duration:${(3+(i*0.71)%2.5).toFixed(2)}s"></i>`).join('');
}
function makeTouchControls(){
  $('#touch-controls').classList.toggle('two-players',players===2);
  $('#touch-controls').innerHTML=Array.from({length:players},(_,i)=>`<div class="touch-player"><div><button data-touch="left" data-player="${i}" aria-label="Pilota ${i+1} sinistra">←</button><button data-touch="right" data-player="${i}" aria-label="Pilota ${i+1} destra">→</button></div><button class="touch-bonus" data-touch="bonus" data-player="${i}" aria-label="Pilota ${i+1} usa bonus">${icon('bolt',25)}</button></div>`).join('');
  document.querySelectorAll('[data-touch]').forEach(b=>{
    const player=Number(b.dataset.player);
    const updateSteer=()=>{touchInputs[player].steer=Math.sign([...touchPointers.values()].filter(p=>p.player===player).reduce((sum,p)=>sum+p.direction,0));};
    b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(b.dataset.touch==='bonus')touchInputs[player].useItem=true;else{touchPointers.set(e.pointerId,{player,direction:b.dataset.touch==='left'?-1:1});updateSteer();}});
    const release=e=>{touchPointers.delete(e.pointerId);updateSteer();};b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);
  });
}
function getInputs(){
  const pads=Array.from(navigator.getGamepads?.()||[]).filter(Boolean);
  const inputs=Array.from({length:players},(_,i)=>{
    const {left,right,brake,bonus:item,jump,drift}=bindings[i];
    const pad=pads[i],axis=pad?.axes[0]||0,padButton=!!pad?.buttons[0]?.pressed,padJump=!!pad?.buttons[3]?.pressed;
    // A lane offset is applied along (frame.dz, 0, -frame.dx), which is the LEFT of the direction of travel: with a
    // lookAt camera the screen-right axis is (-dz, 0, dx). So a growing lane moves the car to the left of the screen,
    // and the player's "right" must ask for a SMALLER lane. Hence LANE_SIGN: press right, go right.
    const wanted=touchInputs[i].steer || (keys.has(right)?1:0)-(keys.has(left)?1:0) || (Math.abs(axis)>.15?axis:0);
    const steer=wanted*LANE_SIGN;
    const back=keys.has(brake)||!!pad?.buttons[1]?.pressed;
    // Holding the back arrow while firing turns the rocket round: same key as the brake, it already means "behind".
    // Jump is a press, drift is a hold. The simulation ignores both below TURBO, so nothing changes for the little ones.
    const input={steer,brake:back,aimBack:back,jump:keyEdges.has(jump)||(padJump&&!padJumpPrevious[i]),drift:keys.has(drift)||!!pad?.buttons[2]?.pressed,
      useItem:keyEdges.has(item)||touchInputs[i].useItem||(padButton&&!padPrevious[i])};
    padPrevious[i]=padButton;padJumpPrevious[i]=padJump;touchInputs[i].useItem=false;return input;
  });
  keyEdges.clear();return inputs;
}
document.addEventListener('keydown',e=>{
  if(captureControlKey(e))return;
  if(bindingsDraft&&e.code==='Escape'){e.preventDefault();closeControls();return;}
  if(e.code==='Escape'){
    e.preventDefault();
    if(screen==='race'){if(race?.state==='finished')return;paused?resumeRace():pauseRace();}
    else if(!$('#modal-overlay').hidden)closeModal();
    // The helicopter lap is a page of its own: Esc lands it and gives back the map before leaving the screen.
    else if(exploring)toggleExplore();
    else goBack();
    return;
  }
  if(!$('#modal-overlay').hidden){
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)){e.preventDefault();moveFocus(e.code,$('#modal'));return;}
    if(e.key==='Tab'){const focusables=[...$('#modal').querySelectorAll('button,input,select,[tabindex="0"]')].filter(x=>!x.disabled),first=focusables[0],last=focusables.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
    return;
  }
  if(screen==='menu'){handleMenuKey(e);return;}
  if(paused)return;
  if(bindings.slice(0,players).some(p=>Object.values(p).includes(e.code))){e.preventDefault();if(!keys.has(e.code))keyEdges.add(e.code);keys.add(e.code);}
});
document.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();keyEdges.clear();if(screen==='race')pauseRace();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&screen==='race')pauseRace();});
window.addEventListener('resize',()=>renderer?.resize());
window.addEventListener('gamepadconnected',()=>toast('Gamepad collegato! Croce o levetta per muoverti, A conferma, B indietro.'));

const itemInfo={boost:['⚡','Super turbo'],rocket:['🚀','Razzo · ↓ per spararlo dietro'],rockets3:['🚀','Tre razzi · ↓ per spararli dietro'],bomb:['💣','Bomba'],shield:['🫧','Scudo'],machinegun:['🍬','Spara caramelle · 5 s'],jelly:['🟢','Gelatina'],oil:['🛢️','Macchia d’olio'],fountain:['🎆','Fontana di scintille'],spin:['🎇','Girandola'],gelato:['🍦','Spara gelato'],bales:['🌾','Tre balle di fieno'],propeller:['🚁','Elica · salti lunghissimi per 7 s'],rainbow:['🌈','Arcobaleno · chi tocchi esplode'],parachute:['🪂','Paracadute · aprilo in un salto: voli 5 s (a terra frena!)'],glider:['🪁','Deltaplano · planate lunghissime per 7 s'],storm:['⛈️','Nuvoletta · temporale su tutti!']};
/** Who climbed on the car: the notice names the animal, the way the children would. */
const critterNotice={turtle:'La tartaruga si è arrabbiata!',sheep:'La pecora si è arrabbiata!',boar:'Il cinghiale si è arrabbiato!',donkey:'L’asino si è arrabbiato!',squirrel:'Lo scoiattolo si è arrabbiato!'};
/** An animal bowled over by your shot: it rolls off to the side and gets back up, and the notice says so kindly. */
const critterHitNotice={turtle:'Colpita! La tartaruga rotola via!',sheep:'Colpita! La pecora rotola via!',boar:'Colpito! Il cinghiale rotola via!',donkey:'Colpito! L’asino rotola via!',squirrel:'Colpito! Lo scoiattolo rotola via!',rat:'Colpito! Il topo rotola via!',gull:'Colpito! Il gabbiano rotola via!'};
let lastCountdown='',noticeTimer=0,noticeShown=false,hudRefs=[],hudHintFaded=false;
const noticeEl=$('#race-notice'),countdownEl=$('#countdown'),keyHintEl=$('#race-key-hint');
/** HUD elements are looked up once per race and written only when a value changes: the race loop stays off the layout engine. */
function bindHUD(){
  hudRefs=Array.from({length:players},(_,i)=>{
    const slot=$('#item-'+i);
    return {rank:$('#rank-'+i),lap:$('#lap-'+i+' b'),trip:$('#trip-'+i),timer:$('#timer-'+i),slot,emoji:slot.querySelector('.item-emoji'),label:slot.querySelector('b'),speed:$('#speed-'+i),gauge:$('#gauge-'+i),needle:$('#needle-'+i),status:$('#status-'+i),last:{}};
  });
  hudHintFaded=false;keyHintEl.classList.remove('is-faded');
  noticeShown=false;noticeEl.style.opacity='0';
}
const setText=(ref,key,el,value)=>{if(ref.last[key]!==value){ref.last[key]=value;el.textContent=value;}};
function updateHUD(dt){
  for(let i=0;i<players;i++){
    const r=race.racers[i],h=hudRefs[i];
    if(!h)continue;
    if(mode==='time'){const t=lapTiming[i];setText(h,'rank',h.rank,t.best!==null?formatLap(t.best):r.finished?'--':race.state==='racing'?formatLap(race.time-t.start):'--');}
    else setText(h,'rank',h.rank,`${r.rank}°`);
    setText(h,'lap',h.lap,String(r.lap));
    // Odometer: `progress` is cumulative metres over the whole race, so this is simply how far they have driven.
    setText(h,'trip',h.trip,`${Math.max(0,Math.round(r.progress))} m`);
    setText(h,'timer',h.timer,mode==='time'?formatLap(r.finished?r.finishTime:race.time):formatTime(r.finished?r.finishTime:race.time));
    const item=r.item?itemInfo[r.item]:r.machinegun>0?['🍬',`Caramelle · ${Math.ceil(r.machinegun)} s`]:null,hasItem=!!item;
    if(h.last.hasItem!==hasItem){h.last.hasItem=hasItem;h.slot.classList.toggle('has-item',hasItem);}
    setText(h,'emoji',h.emoji,item?item[0]:'?');
    setText(h,'label',h.label,r.finished?'Traguardo!':item?item[1]:'Prendi una cassa');
    // Speedometer: arc fill and needle scale with the level's top speed (boost included).
    const top=(race.baseSpeed||24)*1.53*1.08,fraction=Math.max(0,Math.min(1,r.speed/top));
    setText(h,'speed',h.speed,String(Math.round(r.speed*3.6)));
    const dash=(150.8*fraction).toFixed(1);if(h.last.dash!==dash){h.last.dash=dash;h.gauge.style.strokeDasharray=`${dash} 400`;}
    const angle=(-90+180*fraction).toFixed(1);if(h.last.angle!==angle){h.last.angle=angle;h.needle.setAttribute('transform',`rotate(${angle} 60 62)`);}
    let status=r.finished?'★ GARA COMPLETATA':r.wrecked>0?'🔥 AUTO NUOVA IN ARRIVO!':r.squashed>0?'🌾 SCHIACCIATO!':r.attacked>0?'🐾 TI HA PRESO!':r.stuck>0?'🟢 INCOLLATO!':r.spinning>0?'🌀 TESTACODA!':r.slipping>0?'🛢️ SLITTA!':r.rainbow>0?'🌈 ARCOBALENO!':r.storm>0?'⛈️ TEMPORALE!':r.chute==='fly'?'🪂 SI VOLA!':r.chute==='brake'?'🪂 FRENATO!':r.glider>0&&r.y>0.5?'🪁 SI PLANA!':r.boost>0?'⚡ TURBO!':r.drifting?'💨 DERAPATA!':r.shield>0?'◌ SCUDO ATTIVO':r.stun>0?'OPS! SI RIPARTE…':'';
    if(r.machinegun>0&&!r.finished)status+=`${status?' · ':''}CARAMELLE ${Math.ceil(r.machinegun)} s`;
    setText(h,'status',h.status,status);
  }
  if(!hudHintFaded&&race.time>6){hudHintFaded=true;keyHintEl.classList.add('is-faded');}
  audio.setIntensity({boost:race.racers.slice(0,players).some(r=>r.boost>0),lastLap:race.racers.slice(0,players).some(r=>!r.finished&&r.lap>=race.totalLaps&&race.totalLaps>1)});
  const countdown=race.countdown>0?String(Math.min(3,Math.ceil(race.countdown))):race.time<.8?'VIA!':'';
  if(countdown!==lastCountdown){countdownEl.textContent=countdown;countdownEl.classList.remove('pop');void countdownEl.offsetWidth;countdownEl.classList.add('pop');if(countdown)playTone(countdown==='VIA!'?880:440,.17);lastCountdown=countdown;}
  const events=race.drainEvents?.()||[];
  renderer.handleEvents?.(events,race);
  for(const ev of events){
    const index=race.racers.findIndex(r=>r.id===(ev.racerId??ev.id));
    const human=ev.playerIndex !== undefined ? ev.playerIndex<players : index>=0&&index<players;
    if(['pickup','item','collect'].includes(ev.type)&&human)playTone(800,.12,'triangle');
    if(ev.type==='machinegun-shot'&&human)playTone(760,.04,'sine',.025);
    if(ev.type==='jump'&&human)playTone(550,.16,'sine');
    if(ev.type==='section'&&human){noticeEl.textContent=ev.kind==='loop'?'GIRO DELLA MORTE!':'SCORCIATOIA! Ponte di ferro!';noticeTimer=2.2;playTone(ev.kind==='loop'?760:640,.22,'square',.06);}
    if(ev.type==='hit'){playTone(ev.source==='bullet'?140:70,ev.source==='bullet'?.12:.42,'sawtooth',human?.09:.04);if(human){playTone(180,.1,'triangle');audio.duck();}}
    if(ev.type==='pop'&&ev.source==='bullet')playTone(900,.03,'square',.02);
    else if(ev.type==='pop')playTone(ev.source==='jelly'?320:ev.source==='gelato'?520:ev.source==='bale'?200:55,ev.source==='jelly'||ev.source==='gelato'?.2:ev.source==='bale'?.25:.5,'square',.07);
    // Running into something solid: a dull thud, louder when it is a column and not a bale.
    if(ev.type==='bump')playTone(ev.soft?150:90,ev.soft?.18:.3,'square',human?.08:.03);
    if(ev.type==='creamed'&&human){playTone(700,.18,'sine',.07);playTone(430,.24,'triangle',.05);}
    if(ev.type==='stuck'&&human)playTone(240,.35,'sine',.07);
    if(ev.type==='unstuck'&&human)playTone(600,.1,'square',.04);
    if(ev.type==='shield-hit'&&human)playTone(920,.18,'sine',.05);
    // Oil: a skid, and on a spin-out a falling whistle as the car goes right round.
    if(ev.type==='slipping'&&human){playTone(ev.spin?620:300,ev.spin?.5:.25,'triangle',.06);if(ev.spin){setTimeout(()=>playTone(260,.35,'triangle',.05),180);noticeEl.textContent='Testacoda!';noticeTimer=1.4;}}
    // Flattened by a bale: a squelch, then a boing as the car pops back up.
    if(ev.type==='squashed'){playTone(110,.28,'square',human?.08:.03);if(human){noticeEl.textContent='Schiacciato da una balla!';noticeTimer=1.6;}}
    if(ev.type==='unsquashed'&&human){playTone(380,.08,'sine',.06);setTimeout(()=>playTone(760,.14,'sine',.06),70);}
    // An animal on the roof: a growl, and the notice says which one.
    if(ev.type==='attacked'){playTone(95,.45,'sawtooth',human?.08:.03);if(human){playTone(150,.3,'square',.05);noticeEl.textContent=critterNotice[ev.kind]||'Un animale ti è saltato addosso!';noticeTimer=1.8;audio.duck();}}
    if(ev.type==='released'&&human)playTone(560,.1,'square',.04);
    // A shot bowls an animal over: a cartoon boing going down, and for whoever fired it a notice that it rolled away.
    if(ev.type==='critter-hit'){const owner=race.racers.findIndex(r=>r.id===ev.ownerId),mine=owner>=0&&owner<players;playTone(520,.1,'triangle',mine?.07:.03);setTimeout(()=>playTone(300,.2,'triangle',mine?.06:.025),90);if(mine){noticeEl.textContent=critterHitNotice[ev.kind]||'Colpito! L’animale rotola via!';noticeTimer=1.6;}}
    if(ev.type==='use-item'&&ev.item==='rainbow'){[523,659,784,1047].forEach((f,i)=>setTimeout(()=>playTone(f,.12,'triangle',human?.06:.025),i*70));if(human){noticeEl.textContent='ARCOBALENO! Chi tocchi esplode!';noticeTimer=2;}}
    if(ev.type==='rainbow-block'&&human)playTone(1180,.12,'sine',.05);
    // The storm cloud: a thunderclap for everybody, and the notice says who is under it.
    if(ev.type==='use-item'&&ev.item==='storm'){playTone(70,.7,'sawtooth',.08);setTimeout(()=>playTone(55,.9,'square',.06),120);if(human){noticeEl.textContent='TEMPORALE! Tutti gli altri rallentano!';noticeTimer=2.2;}}
    if(ev.type==='stormed'&&human){playTone(180,.3,'triangle',.06);noticeEl.textContent='Che temporale! Si va piano per 5 secondi';noticeTimer=2.2;}
    // A desk, a cone or a bin going up: a bang, quieter when it happened far from the children.
    if(ev.type==='obstacle-break'){const owner=race.racers.findIndex(r=>r.id===ev.ownerId);playTone(ev.squash?160:60,ev.squash?.2:.45,'square',owner>=0&&owner<players?.08:.035);}
    if((ev.type==='lap'||ev.type==='finish')&&human){
      const t=lapTiming[index];const lapTime=(ev.time??race.time)-t.start;t.last=lapTime;t.best=t.best===null?lapTime:Math.min(t.best,lapTime);t.start=ev.time??race.time;
      if(ev.type==='lap'){noticeEl.textContent=mode==='time'?`Giro in ${formatLap(lapTime)}!`:'Un altro giro! Spingi!';noticeTimer=2.5;playTone(670,.15);}
      // Over the line: the place, big, before the results come up (in the time trial, the time).
      if(ev.type==='finish'){const r=race.racers[index];noticeEl.textContent=mode==='time'?`Traguardo in ${formatLap(r.finishTime)}!`:players===2?`PILOTA ${index+1}: ${r.rank}° POSTO!`:r.rank===1?'1° POSTO: HAI VINTO!':`${r.rank}° POSTO SU ${race.racers.length}!`;noticeTimer=3;}
    }
  }
  // Notices run down half as fast again as the clock: they are there to be glanced at, not to cover the road.
  noticeTimer=Math.max(0,noticeTimer-dt*1.5);
  const showNotice=noticeTimer>0;if(showNotice!==noticeShown){noticeShown=showNotice;noticeEl.style.opacity=showNotice?'1':'0';}
  drawMap();
}
const mapCanvas=$('#minimap'),mapContext=mapCanvas.getContext('2d');
let mapBase=null,mapProject=null;
/** The circuit outline never changes during a race: it is drawn once on an offscreen canvas; only the dots move. */
function prepareMap(){
  const w=mapCanvas.width,h=mapCanvas.height;
  const line=getComputedStyle(document.documentElement).getPropertyValue('--map-line').trim()||'rgba(255,255,255,.38)';
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(const p of mapPoints){if(p.x<minX)minX=p.x;if(p.x>maxX)maxX=p.x;if(p.z<minZ)minZ=p.z;if(p.z>maxZ)maxZ=p.z;}
  const scale=Math.min((w-28)/(maxX-minX),(h-28)/(maxZ-minZ)),cx=(minX+maxX)/2,cz=(minZ+maxZ)/2;
  mapProject=p=>[w/2+(p.x-cx)*scale,h/2+(p.z-cz)*scale];
  mapBase=document.createElement('canvas');mapBase.width=w;mapBase.height=h;
  const ctx=mapBase.getContext('2d');
  ctx.beginPath();mapPoints.forEach((p,i)=>{const [x,y]=mapProject(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();ctx.lineWidth=9;ctx.strokeStyle=line;ctx.lineJoin='round';ctx.stroke();
  // Shortcut bridges: dashed rust lines across the water; cars on them follow the bridge instead of the road.
  for(const s of race.track.sections||[]){if(!s.optional)continue;ctx.beginPath();for(let i=0;i<=12;i++){const [x,y]=mapProject(s.pose(i/12,0));i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.setLineDash([4,3]);ctx.lineWidth=3;ctx.strokeStyle='rgba(255,170,110,.85)';ctx.stroke();ctx.setLineDash([]);}
}
function drawMap(){
  if(!mapBase||!mapProject)return;
  const ctx=mapContext;
  ctx.clearRect(0,0,mapCanvas.width,mapCanvas.height);ctx.drawImage(mapBase,0,0);
  for(let index=race.racers.length-1;index>=0;index--){
    const r=race.racers[index],pose=racerPose(race.track,r),[x,y]=mapProject(pose||race.track.frame(r.progress));
    ctx.beginPath();ctx.arc(x,y,index<players?5:3,0,Math.PI*2);ctx.fillStyle=index<players?PILOT_COLORS[index]:'#ffffff';ctx.fill();
    if(index<players){ctx.strokeStyle='#07080f';ctx.lineWidth=2;ctx.stroke();}
  }
}
let previousTime=performance.now();
function animate(now){
  requestAnimationFrame(animate);const dt=Math.min(.05,(now-previousTime)/1000);previousTime=now;
  if(!renderer||document.hidden)return;
  if(screen==='menu'){
    pollMenuGamepad(dt);
    if(menuScreen==='attract'&&!tour){attractTimer+=dt;if(attractTimer>4.5){attractTimer=0;attractIndex=(attractIndex+1)%attractCars.length;updateAttractCar();}}
    // A menu used to redraw at 30 fps to spare the GPU. It costs about a millisecond a frame (the showroom
    // barely sways; the track preview orbits a static scene), and at 30 fps that orbit moved the whole picture
    // three or four pixels per step: on a 60 Hz screen it read as stutter. So menus now follow the display, and
    // only behind a modal, where nothing is being looked at, do they drop to four frames a second.
    menuDt+=dt;
    if(!$('#modal-overlay').hidden&&menuDt<1/4)return;
    if(menuScreen==='attract'&&tour){
      // One circuit flown, then straight on to the next: the reel never stops until somebody presses start.
      if(renderer.renderTrackFlyover(menuDt)===null)startTour();
    }
    else if(menuScreen==='attract')renderer.renderPreview(attractCars[attractIndex],menuDt);
    else if(menuScreen==='track'){
      if(exploring&&renderer.renderTrackFlyover(menuDt)===null){exploring=false;showFlyoverName(null);updateExploreButton();}
      else if(!exploring)renderer.renderTrackPreview(menuDt);
    }
    else if(menuScreen==='champion')renderer.renderPreview(champion?.standings[0]?.spec||selected[0],menuDt);
    else renderer.renderPreview(selected[activePilot],menuDt);
    menuDt=0;
  }
  else if(race){
    if(!paused){
      race.update(dt,getInputs());updateHUD(dt);renderer.render(race,dt);pausedFrameDrawn=false;
      if(race.state!=='finished'&&frameMonitor.sample(dt)){const lighter=lowerQuality(quality);if(lighter)applyQuality(lighter,{announce:true});}
      if(race.state==='finished')showResults();
    }
    // Paused or finished: one last frame behind the modal, then the GPU rests.
    else if(!pausedFrameDrawn){renderer.render(race,0);pausedFrameDrawn=true;}
  }
}
// Startup: paint the START screen first; the 3D renderer follows a frame later, garage and track picker on their own screens.
updateAttractCar();renderModeScreen();showScreen('attract');requestAnimationFrame(animate);requestAnimationFrame(()=>setTimeout(ensureRenderer,0));
if(import.meta.env.DEV)window.__BRICK_RACERS__={get race(){return race;},get screen(){return screen;},get menuScreen(){return menuScreen;},get paused(){return paused;},get selected(){return selected;},get renderer(){return renderer;},get trackId(){return trackId;},get mode(){return mode;},get cup(){return cup;},get records(){return records;},get lapsOverride(){return lapsOverride;},get quality(){return quality;},applyQuality,audio,get catalog(){return catalog;},get theme(){return theme;},applyTheme,tracks:TRACKS.map(t=>t.id),startRace,exitRace,showScreen};

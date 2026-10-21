export const BINDINGS_STORAGE_KEY = 'brick-racers:keys';
/**
 * `expert: true` marks the two controls that exist only from the TURBO level up (see EXPERT_DIFFICULTIES in race.js).
 * They are always bindable, so a child can set them up in advance, but the panel says when they are in play.
 */
export const KEY_ACTIONS = Object.freeze([
  {id:'left',label:'Sinistra'}, {id:'right',label:'Destra'},
  {id:'brake',label:'Rallenta'}, {id:'bonus',label:'Usa il bonus'},
  {id:'jump',label:'Salto',expert:true}, {id:'drift',label:'Derapata',expert:true},
]);
const DEFAULTS = Object.freeze([
  Object.freeze({left:'ArrowLeft',right:'ArrowRight',brake:'ArrowDown',bonus:'Space',jump:'ArrowUp',drift:'ShiftRight'}),
  Object.freeze({left:'KeyA',right:'KeyD',brake:'KeyS',bonus:'ShiftLeft',jump:'KeyW',drift:'KeyQ'}),
]);
export const defaultBindings = () => DEFAULTS.map(player=>({...player}));
const SPECIAL = Object.freeze({
  ArrowLeft:'←',ArrowRight:'→',ArrowUp:'↑',ArrowDown:'↓',Space:'Spazio',Enter:'Invio',
  ShiftLeft:'Maiusc sinistro',ShiftRight:'Maiusc destro',NumpadEnter:'Invio numerico',
  NumpadAdd:'Num +',NumpadSubtract:'Num −',NumpadMultiply:'Num ×',NumpadDivide:'Num ÷',NumpadDecimal:'Num .',
});
export function allowedKey(code) {
  return typeof code==='string' && (/^Key[A-Z]$/.test(code)||/^Digit[0-9]$/.test(code)||/^Numpad[0-9]$/.test(code)||Object.hasOwn(SPECIAL,code));
}
export function keyLabel(code) {
  if(Object.hasOwn(SPECIAL,code))return SPECIAL[code];
  if(/^Key[A-Z]$/.test(code))return code.slice(3);
  if(/^Digit[0-9]$/.test(code))return code.slice(5);
  if(/^Numpad[0-9]$/.test(code))return 'Num '+code.slice(6);
  return 'Non valido';
}
export function validateBindings(bindings) {
  if(!Array.isArray(bindings)||bindings.length!==2)return 'Servono i comandi di entrambi i piloti.';
  const used=new Map();
  for(let player=0;player<2;player++)for(const action of KEY_ACTIONS) {
    const code=bindings[player]?.[action.id];
    if(!allowedKey(code))return 'Scegli lettere, numeri, frecce, Spazio, Invio o Maiusc. Esc resta per la pausa.';
    if(used.has(code))return `${keyLabel(code)} è già usato da ${used.get(code)}. Scegli un altro tasto.`;
    used.set(code,`Pilota ${player+1} · ${action.label}`);
  }
  return null;
}
export function assignBinding(bindings, player, action, code) {
  if(![0,1].includes(player)||!KEY_ACTIONS.some(a=>a.id===action))return {error:'Comando non valido.'};
  const next=bindings.map(p=>({...p}));next[player][action]=code;
  const error=validateBindings(next);
  return error?{error}:{bindings:next};
}
/** Spare keys to fall back on when a newly added action's default is already taken by a saved choice. */
const SPARES = Object.freeze({
  jump:['ArrowUp','KeyW','KeyI','KeyT','Digit1','Numpad1'],
  drift:['ShiftRight','KeyQ','KeyE','KeyJ','Digit2','Numpad2'],
});
/**
 * Reads saved controls. Preferences saved before the expert controls existed only carry four actions: rather than
 * throwing away keys a child chose, the missing ones are filled from the defaults, and from SPARES when the default
 * is already in use. Anything still inconsistent falls back to the defaults as a whole.
 */
export function parseBindings(serialized) {
  try {
    const data=JSON.parse(serialized);
    if(data?.version===1&&Array.isArray(data.players)&&data.players.length===2) {
      const defaults=defaultBindings();
      // What the child actually chose, once: those keys are kept no matter what.
      const kept=[0,1].map(player=>Object.fromEntries(KEY_ACTIONS
        .map(a=>[a.id,allowedKey(data.players[player]?.[a.id])?data.players[player][a.id]:null])
        .filter(([,code])=>code)));
      const used=new Set(kept.flatMap(player=>Object.values(player)));
      const merged=[0,1].map(player=>Object.fromEntries(KEY_ACTIONS.map(action=>{
        const saved=kept[player][action.id];
        if(saved)return [action.id,saved];
        const free=[defaults[player][action.id],...(SPARES[action.id]||[])].find(code=>!used.has(code));
        if(free)used.add(free);
        return [action.id,free];
      })));
      if(!validateBindings(merged))return merged;
    }
  } catch { /* Missing or damaged preferences safely restore the default controls. */ }
  return defaultBindings();
}

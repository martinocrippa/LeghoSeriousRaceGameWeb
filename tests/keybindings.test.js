import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBindings, defaultBindings, validateBindings, assignBinding, KEY_ACTIONS } from '../src/keybindings.js';

const saved = (players) => JSON.stringify({ version: 1, players });

test('the defaults are consistent and cover every action', () => {
  const bindings = defaultBindings();
  assert.equal(validateBindings(bindings), null);
  for (const player of bindings) for (const action of KEY_ACTIONS) assert.ok(player[action.id], `manca ${action.id}`);
});

test('controls saved before the expert keys existed keep every key the child chose', () => {
  // Four actions only: this is exactly what is sitting in a browser from the previous version of the game.
  const old = saved([
    { left: 'KeyZ', right: 'KeyX', brake: 'KeyC', bonus: 'KeyV' },
    { left: 'KeyN', right: 'KeyM', brake: 'KeyB', bonus: 'Space' },
  ]);
  const bindings = parseBindings(old);
  assert.equal(bindings[0].left, 'KeyZ');
  assert.equal(bindings[0].bonus, 'KeyV');
  assert.equal(bindings[1].right, 'KeyM');
  assert.ok(bindings[0].jump && bindings[0].drift && bindings[1].jump && bindings[1].drift, 'i tasti esperti vanno riempiti');
  assert.equal(validateBindings(bindings), null);
});

test('a saved key that collides with a new default wins: the new action moves aside', () => {
  const old = saved([
    { left: 'ArrowLeft', right: 'ArrowRight', brake: 'ArrowDown', bonus: 'ArrowUp' },
    { left: 'KeyA', right: 'KeyD', brake: 'KeyS', bonus: 'KeyQ' },
  ]);
  const bindings = parseBindings(old);
  assert.equal(bindings[0].bonus, 'ArrowUp', 'la scelta salvata resta');
  assert.notEqual(bindings[0].jump, 'ArrowUp');
  assert.equal(bindings[1].bonus, 'KeyQ');
  assert.notEqual(bindings[1].drift, 'KeyQ');
  assert.equal(validateBindings(bindings), null);
});

test('damaged preferences fall back to the defaults instead of leaving a child without controls', () => {
  assert.deepEqual(parseBindings('non e JSON'), defaultBindings());
  assert.deepEqual(parseBindings(saved([{ left: 'KeyZ' }])), defaultBindings());
  assert.deepEqual(parseBindings(JSON.stringify({ version: 9, players: [] })), defaultBindings());
});

test('two actions can never share a key', () => {
  const bindings = defaultBindings();
  const { error } = assignBinding(bindings, 0, 'jump', bindings[0].left);
  assert.ok(error, 'assegnare un tasto già usato deve dare errore');
});

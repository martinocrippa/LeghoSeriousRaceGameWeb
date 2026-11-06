import { test, expect } from '@playwright/test';
import { openScreen, seedGarage, SAVED_CARS } from './helpers.js';

test('arcade flow: start screen, garage, editing a saved car, two independent drivers, pause, finish and replay', async ({ page }) => {
  const errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  await seedGarage(page,[SAVED_CARS[0]]);
  await page.goto('/');
  await expect(page.locator('#press-start')).toBeVisible();
  await expect(page.locator('#stage-attract #viewport canvas')).toHaveCount(1);
  await page.screenshot({ path:'artifacts/arcade-attract.png' });
  await page.keyboard.press('Enter');
  await expect(page.locator('#screen-mode')).toBeVisible();
  await page.screenshot({ path:'artifacts/arcade-mode.png' });
  await page.locator('[data-players="2"]').click();
  await page.locator('[data-mode="single"]').click();
  await expect(page.locator('#screen-cars')).toBeVisible();
  await expect(page.locator('#stage-cars #viewport canvas')).toHaveCount(1);
  const inCatalogo=await page.evaluate(()=>window.__BRICK_RACERS__.catalog.length);
  await expect(page.locator('.car-card[data-car]')).toHaveCount(inCatalogo);
  await expect(page.locator('.grid-section')).toHaveCount(2);
  await page.locator('[data-car="squalo"]').click();
  await expect(page.locator('#selected-name')).toHaveText('Squalo');
  await page.screenshot({ path:'artifacts/arcade-cars.png' });
  await page.locator('[data-pilot="1"]').click();
  await page.locator('[data-car="maggiolino"]').click();
  await expect(page.locator('#selected-name')).toHaveText('Maggiolino Matto');
  // "Crea dalla foto" is gone: no button, no upload card, no file input. Saved cars stay and can still be edited.
  await expect(page.locator('#add-photo, .upload-card, input[type=file]')).toHaveCount(0);
  await page.locator(`[data-car="${SAVED_CARS[0].id}"]`).click();
  await page.locator('.edit-custom').click();
  await expect(page.locator('#car-form')).toBeVisible();
  await page.locator('#car-name').fill('Fulmine di prova');
  await page.locator('#car-shape').selectOption('buggy');
  await page.locator('.part-chip:has(input[value="fan"])').click();
  await expect(page.locator('.part-chip input[value="fan"]')).toBeChecked();
  await page.locator('#car-width').evaluate(input=>{input.value='2.1';input.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.screenshot({path:'artifacts/car-editor.png'});
  await page.locator('#car-form button[type=submit]').click();
  await expect(page.locator('#selected-name')).toHaveText('Fulmine di prova');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('brick-racers:garage')));
  expect(saved.length).toBe(1);
  expect(saved[0].id).toBe(SAVED_CARS[0].id);
  expect(saved[0].version).toBe(2);
  expect(saved[0].parts).toEqual(['highWing','fan']);
  expect(saved[0].width).toBe(2.1);
  await page.locator('#to-track').click();
  await expect(page.locator('#screen-track')).toBeVisible();
  await expect(page.locator('#stage-track #viewport canvas')).toHaveCount(1);
  await page.locator('[data-track="arca"]').click();
  await expect(page.locator('#track-title')).toHaveText('Il Campo dell’Arca');
  await expect(page.locator('#laps-value')).toHaveText('4');
  await page.locator('[data-step="laps"][data-delta="-1"]').click();
  await expect(page.locator('#laps-value')).toHaveText('3');
  await page.screenshot({ path:'artifacts/arcade-track.png' });
  await page.locator('#start-race').click();
  await expect(page.locator('#race-screen')).toBeVisible();
  await expect(page.locator('#map-label')).toHaveText('IL CAMPO DELL’ARCA');
  await expect(page.locator('#cup-badge')).toBeHidden();
  await expect(page.locator('.player-hud')).toHaveCount(2);
  await expect(page.locator('#lap-0')).toContainText('/ 3');
  await expect.poll(()=>page.evaluate(()=>window.__BRICK_RACERS__.race.state)).toBe('racing');
  const before=await page.evaluate(()=>window.__BRICK_RACERS__.race.racers.slice(0,2).map(r=>r.lane));
  await page.keyboard.down('ArrowLeft');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(450);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.up('KeyD');
  const after=await page.evaluate(()=>window.__BRICK_RACERS__.race.racers.slice(0,2).map(r=>r.lane));
  // Lanes grow toward the LEFT of the screen (see `frame` in src/track.js), so P1's left arrow raises its lane and
  // P2's D lowers its own: the point of the check is that the two pilots steer apart, each its own way.
  expect(after[0]).toBeGreaterThan(before[0]);expect(after[1]).toBeLessThan(before[1]);
  await page.evaluate(()=>{const race=window.__BRICK_RACERS__.race;race.racers[0].item='boost';});
  await page.keyboard.press('Space');
  await expect.poll(()=>page.evaluate(()=>window.__BRICK_RACERS__.race.racers[0].boost)).toBeGreaterThan(0);
  await page.screenshot({path:'artifacts/race-two-players.png'});
  await page.keyboard.press('Escape');
  await expect(page.locator('#resume-race')).toBeVisible();
  const pausedTime=await page.evaluate(()=>window.__BRICK_RACERS__.race.time);
  await page.waitForTimeout(200);
  expect(await page.evaluate(()=>window.__BRICK_RACERS__.race.time)).toBe(pausedTime);
  await page.locator('#resume-race').click();
  await page.evaluate(()=>{const race=window.__BRICK_RACERS__.race;for(let i=0;i<900&&race.state!=='finished';i++)race.update(.25,[{useItem:i%2===0},{useItem:i%2===0}]);});
  await expect(page.locator('#play-again')).toBeVisible();
  // Where each pilot finished: under the results' title and, a moment before, big over the finish line.
  await expect(page.locator('#modal p').first()).toHaveText(/^Pilota 1: \d+° posto · Pilota 2: \d+° posto su 6\. /);
  // Each in their own half (split screen): the same words as with one pilot.
  await expect(page.locator('#race-notice')).toHaveText(/^(1° POSTO: HAI VINTO!|\d+° POSTO SU 6!)$/);
  await expect(page.locator('#race-notice-2')).toHaveText(/^(1° POSTO: HAI VINTO!|\d+° POSTO SU 6!)$/);
  // Gaps are measured from Pilot 1: its row has none, every other row (Pilot 2's too) has one, signed, decimal comma.
  await expect(page.locator('.result-row .gap-own')).toHaveCount(1);
  const gaps=await page.locator('.result-row .gap:not(.gap-own)').allTextContents();
  expect(gaps).toHaveLength(await page.evaluate(()=>window.__BRICK_RACERS__.race.racers.length-1));
  for(const gap of gaps)expect(gap).toMatch(/^(~ )?([+−]\d+,\d s|[+−]\d+:\d\d,\d|0,0 s)$/);
  await page.screenshot({path:'artifacts/results.png'});
  await page.locator('#play-again').click();
  expect(await page.evaluate(()=>window.__BRICK_RACERS__.race.time)).toBe(0);
  await page.keyboard.press('Escape');
  await page.locator('#exit-race').click();
  await expect(page.locator('#screen-track')).toBeVisible();
  await expect(page.locator('#stage-track #viewport canvas')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('#screen-cars')).toBeVisible();
  await page.reload();
  await openScreen(page,'cars');
  await expect(page.locator('.car-card[data-car]')).toHaveCount(inCatalogo);
  const mia=page.locator('.car-card[data-car^="custom-"]');
  await expect(mia).toHaveCount(1);
  await expect(mia.locator('h3')).toHaveText('Fulmine di prova');
  await expect(mia.locator('img')).toHaveAttribute('src',/^data:image\/(webp|png)/);
  await mia.click();
  await page.locator('.remove-custom').click();
  await expect(page.locator('.car-card[data-car]')).toHaveCount(inCatalogo-1);
  expect(errors).toEqual([]);
});

test('mobile screens and touch race stay inside the viewport', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await seedGarage(page,[SAVED_CARS[0]]);
  await openScreen(page,'cars');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({path:'artifacts/garage-mobile.png',fullPage:true});
  await page.locator(`[data-car="${SAVED_CARS[0].id}"]`).click();
  await page.locator('.edit-custom').click();
  await expect(page.locator('#car-form')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({path:'artifacts/car-editor-mobile.png'});
  await page.keyboard.press('Escape');
  await expect(page.locator('#modal-overlay')).toBeHidden();
  await page.locator('#to-track').click();
  await expect(page.locator('#screen-track')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.locator('#start-race').click();
  await expect(page.locator('#race-screen')).toBeVisible();
  await page.screenshot({path:'artifacts/race-mobile.png'});
});

test('a cup runs five races on circuits drawn at random with cumulative standings and a podium', async ({ page }) => {
  const errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  // No circuit to choose: from the garage the cup goes straight to its first race.
  await openScreen(page,'cars',{mode:'cup'});
  await expect(page.locator('#to-track')).toContainText('COPPA');
  await page.locator('#to-track').click();
  await expect(page.locator('#cup-badge')).toHaveText('COPPA · GARA 1/5');
  const raceUntilFinished=()=>page.evaluate(()=>{const race=window.__BRICK_RACERS__.race;for(let i=0;i<900&&race.state!=='finished';i++)race.update(.25,[{useItem:i%2===0}]);});
  const labels=[];
  for(let stage=1;stage<=5;stage++){
    await expect(page.locator('#cup-badge')).toHaveText(`COPPA · GARA ${stage}/5`);
    labels.push(await page.locator('#map-label').textContent());
    await expect.poll(()=>page.evaluate(()=>window.__BRICK_RACERS__.race.state)).toBe('racing');
    await raceUntilFinished();
    await expect(page.locator('.standings .result-row')).toHaveCount(6);
    await expect(page.locator('#modal p').first()).toHaveText(/^(Al traguardo: [2-6]° posto su 6\.|1° posto: hai vinto!) /);
    // The standings gap is on the total time: Pilot 1's row shows that total, the others their distance from it.
    await expect(page.locator('.standings .gap-own')).toHaveText(/^~?\d+:\d\d,\d$/);
    await expect(page.locator('.standings .gap:not(.gap-own)')).toHaveCount(5);
    if(stage===5)await page.screenshot({path:'artifacts/cup-results.png'});
    if(stage<5){await expect(page.locator('#next-race')).toBeVisible();await page.locator('#next-race').click();}
  }
  expect(new Set(labels).size).toBe(5);
  await expect(page.locator('#cup-podium')).toBeVisible();
  await page.locator('#cup-podium').click();
  // The prize-giving is a screen of its own: podium, the five circuits with Pilot 1's place on each, the standings.
  await expect(page.locator('#screen-champion')).toBeVisible();
  await expect(page.locator('#new-cup')).toBeVisible();
  await expect(page.locator('#screen-champion .podium-step')).toHaveCount(3);
  await expect(page.locator('.champion-race')).toHaveCount(5);
  await expect(page.locator('.champion-race em').first()).toHaveText(/^[1-6]°$/);
  await expect(page.locator('#champion-title')).toHaveText(/CAMPIONI!|CHE CAMPIONATO!/);
  await expect(page.locator('#champion-confetti i').first()).toBeAttached();
  await page.waitForTimeout(900); // past the screen's fade-in, for a picture that shows it
  await page.screenshot({path:'artifacts/cup-podium.png'});
  await page.locator('#champion-garage').click();
  await expect(page.locator('#screen-cars')).toBeVisible();
  expect(await page.evaluate(()=>window.__BRICK_RACERS__.cup)).toBeNull();
  expect(errors).toEqual([]);
});

test('time trial runs alone against the clock and stores the track record', async ({ page }) => {
  const errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  await openScreen(page,'track',{mode:'time'});
  await expect(page.locator('#opponents-value')).toHaveText('0');
  await expect(page.locator('[data-step="opponents"][data-delta="1"]')).toBeDisabled();
  await page.locator('[data-track="aprica"]').click();
  await page.locator('[data-step="laps"][data-delta="-1"]').click();
  await page.locator('[data-step="laps"][data-delta="-1"]').click();
  await expect(page.locator('#laps-value')).toHaveText('1');
  await page.locator('#start-race').click();
  await expect(page.locator('#cup-badge')).toHaveText('PROVA A TEMPO');
  expect(await page.evaluate(()=>window.__BRICK_RACERS__.race.racers.length)).toBe(1);
  await expect.poll(()=>page.evaluate(()=>window.__BRICK_RACERS__.race.state)).toBe('racing');
  await page.evaluate(()=>{const race=window.__BRICK_RACERS__.race;for(let i=0;i<400&&race.state!=='finished';i++)race.update(.25,[{steer:0}]);});
  await expect(page.locator('#modal-title')).toHaveText('NUOVO RECORD!');
  const records=await page.evaluate(()=>JSON.parse(localStorage.getItem('brick-racers:records')));
  expect(records['aprica:1'].time).toBeGreaterThan(10);
  await page.screenshot({path:'artifacts/time-trial.png'});
  await page.locator('#results-garage').click();
  await expect(page.locator('#track-features .record')).toBeVisible();
  expect(errors).toEqual([]);
});

test('personal cars saved in formats 1 and 2 still load, race and keep the photo peek only on the children\'s cars',async({page})=>{
  const errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  await seedGarage(page);
  await openScreen(page,'cars');
  for(const car of SAVED_CARS)await expect(page.locator(`[data-car="${car.id}"] h3`)).toHaveText(car.name);
  // The children's cars still show their real photo; personal cars never had a bundled one.
  await expect(page.locator(`[data-car="${SAVED_CARS[1].id}"] .photo-peek`)).toHaveCount(0);
  await expect(page.locator('.photo-peek').first()).toHaveAttribute('aria-label','Guarda la foto vera');
  await page.locator(`[data-car="${SAVED_CARS[1].id}"]`).click();
  await expect(page.locator('#selected-name')).toHaveText('Vecchia gloria');
  await page.locator('#to-track').click();
  await page.locator('#start-race').click();
  await expect.poll(()=>page.evaluate(()=>window.__BRICK_RACERS__.race?.state)).toBe('racing');
  expect(await page.evaluate(()=>window.__BRICK_RACERS__.race.racers[0].name)).toBe('Vecchia gloria');
  await page.evaluate(()=>{for(let i=0;i<8;i++)window.__BRICK_RACERS__.race.update(.25);});
  expect(errors).toEqual([]);
});

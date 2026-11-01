import {test,expect} from '@playwright/test';
import {openScreen,seedGarage,SAVED_CARS} from './helpers.js';

test('saved photo cars reopen, cancel safely, update both palettes and keep their identity',async({page})=>{
  await seedGarage(page,[{...SAVED_CARS[0],name:'Creazione originale'}]);
  await openScreen(page,'cars');
  await page.locator(`[data-car="${SAVED_CARS[0].id}"]`).click();
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('brick-racers:garage'))[0]);
  await page.locator('.edit-custom').click();
  await page.locator('#car-name').fill('Da scartare');
  await page.keyboard.press('Escape');
  await expect(page.locator('#selected-name')).toHaveText('Creazione originale');
  await page.locator('.edit-custom').click();
  await expect(page.locator('#car-name')).toHaveValue('Creazione originale');
  await page.locator('#car-name').fill('Creazione migliorata');
  await page.locator('#car-color').evaluate(input=>{input.value='#aa22cc';input.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#car-accent').evaluate(input=>{input.value='#33bb44';input.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#car-form button[type=submit]').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('brick-racers:garage')));
  expect(saved).toHaveLength(1);expect(saved[0].id).toBe(before.id);
  expect(saved[0].palette.slice(0,2)).toEqual(['#aa22cc','#33bb44']);
  await page.reload();await openScreen(page,'cars');
  await expect(page.locator('.car-card[data-car^="custom-"] h3')).toHaveText('Creazione migliorata');
});

test('editing a format 3 car keeps its wheels, trailer and driver colours',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const wheeled={...SAVED_CARS[0],id:'custom-1730000000000',name:'Camion a otto',version:3,knobby:true,suit:'#1f5fd0',helmet:'#f2f2ee',ride:.6,
    axles:[{z:.4,spread:.5,radius:.4,steer:true},{z:-.3,spread:.5,radius:.45,drive:true,rim:'#e5203a'}],trailer:{length:3,body:'wood',axles:[{z:-.8,spread:.45,radius:.3}]}};
  await seedGarage(page,[wheeled]);
  await openScreen(page,'cars');
  await page.locator(`[data-car="${wheeled.id}"]`).click();
  await page.locator('.edit-custom').click();
  await page.locator('#car-name').fill('Camion rinominato');
  await page.locator('#car-form button[type=submit]').click();
  const [saved]=await page.evaluate(()=>JSON.parse(localStorage.getItem('brick-racers:garage')));
  expect(saved.name).toBe('Camion rinominato');
  expect(saved.version).toBe(3);
  expect(saved.axles).toEqual(wheeled.axles);
  expect(saved.trailer).toEqual({axles:wheeled.trailer.axles,length:3,body:'wood'});
  expect([saved.knobby,saved.suit,saved.helmet,saved.ride]).toEqual([true,'#1f5fd0','#f2f2ee',.6]);
  // And it races on those wheels: four on the tractor, two on the trailer.
  await page.locator('#to-track').click();
  await page.locator('#start-race').click();
  await expect.poll(()=>page.evaluate(()=>window.__BRICK_RACERS__.race?.state)).toBe('racing');
  expect(await page.evaluate(()=>window.__BRICK_RACERS__.renderer.racerModels.get('p1').car.userData.wheels.length)).toBe(6);
  expect(errors).toEqual([]);
});

test('machinegun displays its countdown, pauses and renders bullets for the correct pilot',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await openScreen(page,'track',{players:2});
  await page.locator('#start-race').click();
  await expect.poll(()=>page.evaluate(()=>window.__BRICK_RACERS__.race.state)).toBe('racing');
  await page.evaluate(()=>{window.__BRICK_RACERS__.race.racers[0].item='machinegun';});
  await page.keyboard.press('Space');
  await expect(page.locator('#status-0')).toContainText('CARAMELLE');
  expect(await page.evaluate(()=>window.__BRICK_RACERS__.race.racers[1].machinegun)).toBe(0);
  await expect.poll(()=>page.evaluate(()=>[...window.__BRICK_RACERS__.renderer.projectileModels.keys()].some(id=>id.startsWith('bullet-')))).toBe(true);
  await page.screenshot({path:'artifacts/review-machinegun.png'});
  await page.keyboard.press('Escape');
  const time=await page.evaluate(()=>window.__BRICK_RACERS__.race.racers[0].machinegun);
  await page.waitForTimeout(250);
  expect(await page.evaluate(()=>window.__BRICK_RACERS__.race.racers[0].machinegun)).toBe(time);
  await page.locator('#resume-race').click();
  await page.evaluate(()=>{for(let i=0;i<24;i++)window.__BRICK_RACERS__.race.update(.25);});
  await expect(page.locator('#status-0')).not.toContainText('CARAMELLE');
  expect(errors).toEqual([]);
});

test('menu keyboard navigation: arrows move focus, Enter confirms, Esc goes back',async({page})=>{
  await openScreen(page,'mode');
  await page.keyboard.press('ArrowRight');
  const focused=await page.evaluate(()=>document.activeElement?.dataset.mode);
  expect(focused).toBe('cup');
  await page.keyboard.press('Enter');
  await expect(page.locator('#screen-cars')).toBeVisible();
  expect(await page.evaluate(()=>window.__BRICK_RACERS__.mode)).toBe('cup');
  await page.keyboard.press('Escape');
  await expect(page.locator('#screen-mode')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#screen-attract')).toBeVisible();
});

test('touch steering stays pressed when a second pointer releases',async({browser})=>{
  const context=await browser.newContext({viewport:{width:800,height:600},hasTouch:true,isMobile:true});
  const page=await context.newPage();
  await page.goto(test.info().project.use.baseURL);
  await page.locator('#press-start').click();
  await page.locator('[data-mode="single"]').click();
  await page.locator('#to-track').click();
  await page.locator('#start-race').click();
  await expect(page.locator('#touch-controls')).toBeVisible();
  const left=page.locator('[data-touch="left"]'),right=page.locator('[data-touch="right"]');
  await page.evaluate(()=>{for(let i=0;i<16;i++)window.__BRICK_RACERS__.race.update(.25);});
  const session=await context.newCDPSession(page);
  const a=await left.boundingBox(),b=await right.boundingBox();
  const point=(r,id)=>({x:r.x+r.width/2,y:r.y+r.height/2,id});
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(a,1),point(b,2)]});
  // CDP ends the listed contact: release right while keeping the left finger down.
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[point(b,2)]});
  const before=await page.evaluate(()=>window.__BRICK_RACERS__.race.racers[0].lane);
  await page.waitForTimeout(200);
  // Still steering left after the right finger lifted. Lanes grow leftwards (see `frame` in src/track.js).
  expect(await page.evaluate(()=>window.__BRICK_RACERS__.race.racers[0].lane)).toBeGreaterThan(before);
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await context.close();
});

import {test,expect} from '@playwright/test';
import {openScreen} from './helpers.js';

for(const [id,name,landmark] of [['brugherio','Brugherio in Festa','sanbartolomeo'],['milano','Milano Sprint','duomo'],['como','Il Giro del Lago di Como','comocity'],['increa','Parco Increa Rally','school'],['villasanta','Villasanta Centro','home'],['crete','Crete Senesi al Tramonto','amiata'],['bergamo','Bergamo di Notte','cittaalta'],['aprica','Aprica: Corso Roma','chalet'],['stadio','Stadio degli Azzurri d’Italia','arena'],['notte','Notte Stellata in Brianza','montevecchia'],['adda','L’Adda d’Autunno','madonnadelbosco'],['bernina','Passo del Bernina','ghiacciaio'],['arca','Il Campo dell’Arca','chiesa'],['regnano','Regnano Castello','castello'],['magra','Golfo del Magra al Tramonto','cave'],['alba','La Scuola all’Alba','anfiteatro'],['intervallo','L’Aula all’Intervallo','banchi'],['varese','Varese Town','diamante'],['roma','Roma di Sera','colosseo']]) {
 test(`${id} has its own scenery and supports racing and returning to the track picker`,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await openScreen(page,'track');
  await expect(page.locator('[data-track]')).toHaveCount(20);
  await page.locator(`[data-track="${id}"]`).click();
  await expect(page.locator('#track-title')).toHaveText(name);
  await page.locator('#start-race').click();
  await expect(page.locator('#map-label')).toHaveText(name.toUpperCase());
  await expect.poll(()=>page.evaluate(()=>window.__BRICK_RACERS__.race.state)).toBe('racing');
  expect(await page.evaluate(kind=>!!window.__BRICK_RACERS__.renderer.world.getObjectByName(`landmark-${kind}`),landmark)).toBe(true);
  await page.evaluate(()=>{const {race,renderer}=window.__BRICK_RACERS__;race.racers[0].progress=race.track.landmarks[0].distance-55;race.time=2;race.racers[0].lane=0;renderer.cameraInitialized=[false,false];});
  await page.waitForTimeout(150);
  await page.screenshot({path:`artifacts/track-${id}.png`});
  if(id==='como'||id==='increa'||id==='varese')expect(await page.evaluate(()=>!!window.__BRICK_RACERS__.renderer.world.getObjectByName('lake-water'))).toBe(true);
  if(id==='como')expect(await page.evaluate(()=>window.__BRICK_RACERS__.race.track.sections.filter(s=>s.kind==='bridge').length)).toBe(2);
  if(id==='stadio'){
    // Drive into the loop-the-loop: the car must be up in the air on the section path, then come back down on the road.
    await page.evaluate(()=>{const {race}=window.__BRICK_RACERS__;const loop=race.track.sections[0];race.racers[0].progress=loop.from-1;race.racers[0].speed=24;race.racers[0].lane=0;for(let i=0;i<40;i++)race.update(1/60,[{steer:0}]);});
    expect(await page.evaluate(()=>window.__BRICK_RACERS__.race.racers[0].section)).toBe('giro-della-morte');
    await page.waitForTimeout(120);
    await page.screenshot({path:`artifacts/track-${id}-loop.png`});
    await page.evaluate(()=>{const {race}=window.__BRICK_RACERS__;for(let i=0;i<600&&race.racers[0].section;i++)race.update(1/60,[{steer:0}]);});
    expect(await page.evaluate(()=>window.__BRICK_RACERS__.race.racers[0].section)).toBeNull();
  }
  if(id==='adda'){
    // The river scenery: Leonardo's ferry and the train that runs under the Ponte San Michele.
    for(const name of ['adda-water','adda-traghetto','adda-treno','adda-ponte'])
      expect(await page.evaluate(n=>!!window.__BRICK_RACERS__.renderer.world.getObjectByName(n),name)).toBe(true);
    // Coming down from Paderno: the Ponte San Michele in three-quarter view, mirrored on the water.
    await page.evaluate(()=>{const {race,renderer}=window.__BRICK_RACERS__;race.racers[0].progress=650;race.racers[0].lane=5;renderer.cameraInitialized=[false,false];});
    await page.waitForTimeout(150);
    await page.screenshot({path:'artifacts/track-adda-ponte.png'});
    expect(await page.evaluate(()=>!!window.__BRICK_RACERS__.renderer.world.getObjectByName('adda-riflesso'))).toBe(true);
    // On the bridge itself, inside the ironwork, with the train on the deck below.
    await page.evaluate(()=>{const {race,renderer}=window.__BRICK_RACERS__;race.racers[0].progress=676;race.racers[0].lane=0;renderer.cameraInitialized=[false,false];});
    await page.waitForTimeout(150);
    await page.screenshot({path:'artifacts/track-adda-ferro.png'});
  }
  if(id==='bernina'){
    // The little red train on its stone viaduct through the switchbacks.
    for(const name of ['bernina-ferrovia','bernina-trenino'])
      expect(await page.evaluate(n=>!!window.__BRICK_RACERS__.renderer.world.getObjectByName(n),name)).toBe(true);
    // The ski jump, on the descent from the pass.
    await page.evaluate(()=>{const {race,renderer}=window.__BRICK_RACERS__;race.racers[0].progress=660;race.racers[0].lane=0;renderer.cameraInitialized=[false,false];});
    await page.waitForTimeout(150);
    await page.screenshot({path:'artifacts/track-bernina-trampolino.png'});
    // The railway viaduct where it leaps over the road, on the first hairpin.
    await page.evaluate(()=>{const {race,renderer}=window.__BRICK_RACERS__;race.racers[0].progress=72;race.racers[0].lane=0;renderer.cameraInitialized=[false,false];});
    await page.waitForTimeout(150);
    await page.screenshot({path:'artifacts/track-bernina-viadotto.png'});
  }
  if(id==='arca'){
    // The pitches, the goals the road runs through and the puddles.
    for(const name of ['arca-campi','arca-porte','arca-pozzanghere'])
      expect(await page.evaluate(n=>!!window.__BRICK_RACERS__.renderer.world.getObjectByName(n),name)).toBe(true);
    // Approach the first goal, on the long grass straight.
    await page.evaluate(()=>{const {race,renderer}=window.__BRICK_RACERS__;race.racers[0].progress=28;race.racers[0].lane=0;renderer.cameraInitialized=[false,false];});
    await page.waitForTimeout(150);
    await page.screenshot({path:'artifacts/track-arca-porta.png'});
    // The churned stretch: mud underfoot and puddles to splash through.
    await page.evaluate(()=>{const {race,renderer}=window.__BRICK_RACERS__;race.racers[0].progress=170;race.racers[0].lane=0;renderer.cameraInitialized=[false,false];});
    await page.waitForTimeout(150);
    await page.screenshot({path:'artifacts/track-arca-fango.png'});
  }
  if(id==='regnano'){
    expect(await page.evaluate(()=>!!window.__BRICK_RACERS__.renderer.world.getObjectByName('regnano-volte'))).toBe(true);
    // Under the vaulted passage in the borgo.
    await page.evaluate(()=>{const {race,renderer}=window.__BRICK_RACERS__;race.racers[0].progress=140;race.racers[0].lane=0;renderer.cameraInitialized=[false,false];});
    await page.waitForTimeout(150);
    await page.screenshot({path:'artifacts/track-regnano-borgo.png'});
    // The belvedere, with the Apuan Alps behind.
    await page.evaluate(()=>{const {race,renderer}=window.__BRICK_RACERS__;race.racers[0].progress=490;race.racers[0].lane=0;renderer.cameraInitialized=[false,false];});
    await page.waitForTimeout(150);
    await page.screenshot({path:'artifacts/track-regnano-apuane.png'});
  }
  if(id==='magra'){
    for(const name of ['magra-mare','magra-fiume','magra-gallerie'])
      expect(await page.evaluate(n=>!!window.__BRICK_RACERS__.renderer.world.getObjectByName(n),name)).toBe(true);
    for(const [at,shot] of [[110,'spiaggia'],[390,'cave'],[650,'luni'],[900,'monastero']]){
      await page.evaluate(d=>{const {race,renderer}=window.__BRICK_RACERS__;renderer.clock=9;race.racers[0].progress=d;race.racers[0].lane=0;renderer.cameraInitialized=[false,false];},at);
      await page.waitForTimeout(220);
      await page.screenshot({path:`artifacts/track-magra-${shot}.png`});
    }
  }
  if(id==='varese'){
    // The roundabouts are real: the simulation knows the islands and the renderer draws them in the same places.
    expect(await page.evaluate(()=>window.__BRICK_RACERS__.race.track.obstacles.filter(o=>o.kind==='island').length)).toBe(4);
    for(const o of ['rotonda-gazzada','rotonda-lago'])
      expect(await page.evaluate(n=>!!window.__BRICK_RACERS__.renderer.world.getObjectByName(`obstacle-${n}`),o)).toBe(true);
    // Gazzada: the orange fighter up on its pylon over the first roundabout.
    await page.evaluate(()=>{const {race,renderer}=window.__BRICK_RACERS__;race.racers[0].progress=8;race.racers[0].lane=0;renderer.cameraInitialized=[false,false];});
    await page.waitForTimeout(150);
    await page.screenshot({path:'artifacts/track-varese-rotonda.png'});
    // The lakeside: jetties, reed beds, the huts on stilts and the villa in the water.
    await page.evaluate(()=>{const {race,renderer}=window.__BRICK_RACERS__;race.racers[0].progress=860;race.racers[0].lane=0;renderer.cameraInitialized=[false,false];});
    await page.waitForTimeout(150);
    await page.screenshot({path:'artifacts/track-varese-lago.png'});
  }
  if(id==='bergamo'||id==='notte')expect(await page.evaluate(()=>!!window.__BRICK_RACERS__.renderer.world.getObjectByName('starfield'))).toBe(true);
  await page.keyboard.press('Escape');await page.locator('#exit-race').click();
  await expect(page.locator('#screen-track')).toBeVisible();expect(errors).toEqual([]);
 });
}

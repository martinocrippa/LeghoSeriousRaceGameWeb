/**
 * Every scenery module, registered at once. For Node: the tests and the RetroPie export build all the circuits
 * synchronously. The browser never imports this file: it loads one scenery per race (index.js loadScenery).
 */
import { registerScenery } from './index.js';
import * as como from './como.js';
import * as stadio from './stadio.js';
import * as increa from './increa.js';
import * as villasanta from './villasanta.js';
import * as crete from './crete.js';
import * as brugherio from './brugherio.js';
import * as brianza from './brianza.js';
import * as adda from './adda.js';
import * as bernina from './bernina.js';
import * as arca from './arca.js';
import * as regnano from './regnano.js';
import * as aprica from './aprica.js';
import * as magra from './magra.js';
import * as milano from './milano.js';
import * as alba from './alba.js';
import * as intervallo from './intervallo.js';
import * as varese from './varese.js';
import * as roma from './roma.js';

registerScenery({ como, stadio, increa, villasanta, crete, brugherio, brianza, adda, bernina, arca, regnano, aprica, magra, milano, alba, intervallo, varese, roma });

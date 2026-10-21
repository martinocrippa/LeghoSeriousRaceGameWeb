# La musica di Legho

Non ci sono file audio. Ogni brano è un pezzo di testo in [`src/music-tracks.js`](src/music-tracks.js) che il gioco suona dal vivo con un sintetizzatore chiptune ([`src/audio.js`](src/audio.js)). Per cambiare la musica basta modificare quel file: niente DAW, niente export.

## I cinque brani

| Chiave | Quando suona | Tempo | Tonalità |
| --- | --- | --- | --- |
| `intro-punk` | schermata iniziale | 176 bpm | La maggiore |
| `menu` | garage e scelta della pista | 112 bpm | Do maggiore |
| `race-day` | piste di giorno | 152 bpm | Do maggiore |
| `race-night` | piste con le stelle (`theme.stars`) | 138 bpm | Re dorico |
| `race-dust` | piste di terra (`theme.dust`) | 150 bpm | Sol misolidio |

Quale brano tocca a ogni pista lo decide `musicForTheme()` in fondo a `music-tracks.js`.

## Come si scrive

Un brano ha `bpm`, `key`, `scale`, `mood` e `layers`. Ogni strato è un elenco di **16 battute in 4/4**. Una battuta è una stringa di note `ALTEZZA:DURATA`, con la durata in ottavi, e gli ottavi di una battuta devono fare 8 in tutto:

```js
'C5:2 -:1 E5:1 G5:4'          // melodia: Do, pausa, Mi, Sol lungo
'K:2 -:2 S:2 -:2'             // batteria: K cassa, S rullante, H charleston
```

Gli strati:
- `bass` e `drums` suonano sempre;
- `lead` è la melodia;
- `arp` entra quando un pilota ha il turbo;
- `hat` raddoppia il charleston all'ultimo giro.

## Le regole (le fa rispettare `npm test`)

Chi ascolta ha 6–10 anni e la gara si ripete per tre giri, quindi:

- **Forma AABA su 16 battute**: un tema di quattro battute, ripetuto con un finale nuovo, un inciso altrove (battute 9–12), poi di nuovo il tema. Deve potersi canticchiare.
- **Scala per atmosfera**: maggiore o pentatonica di giorno, dorica di notte, misolidia sulla terra. Le note devono stare nella scala dichiarata.
- **Estensione**: `lead` e `arp` fra C4 e C6, `bass` fra C2 e C4.
- **Ogni strato respira**, non solo la melodia: almeno un decimo di pause, e nessuno strato fatto di una sola battuta ripetuta sedici volte.
- **Le battute 9–12 sono un calo vero**: la batteria si dirada, così il tema ha da dove tornare.
- **Niente "macchina accesa"**: charleston su ogni ottavo e cassa più rullante su ogni movimento, per sedici battute, sfiniscono una stanza più di qualunque melodia. È già successo una volta.

## Provare

```bash
npm install
npm run dev        # apri http://127.0.0.1:5173, il pulsante altoparlante in alto attiva la musica
npm test           # tests/music-tracks.test.js controlla durata, tonalità, estensione e pause
```

Il server di sviluppo ricarica la pagina a ogni salvataggio. Ogni push su `main` rifà i test e, se passano, pubblica il gioco su GitHub Pages. Un brano che rompe le regole non va online.

#!/bin/bash
# Legho su macOS e Linux: la stessa cosa che fa Avvia-Gioco.cmd su Windows.
# Su Mac si apre con doppio clic. La prima volta, se il Finder dice che non si puo' aprire,
# basta: tasto destro sul file -> Apri -> Apri.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Installa Node.js LTS prima di avviare Legho."
  echo "https://nodejs.org/"
  read -r -p "Premi Invio per chiudere." _
  exit 1
fi

if [ ! -f "node_modules/vite/bin/vite.js" ]; then
  echo "Prima preparazione del gioco. Serve una connessione Internet."
  if ! npm ci --cache .npm-cache; then
    echo "Preparazione non riuscita. Controlla la connessione e riprova."
    read -r -p "Premi Invio per chiudere." _
    exit 1
  fi
fi

echo
echo "Legho - Chiudi questa finestra per spegnere il gioco."
echo
npm run dev -- --port 5173 --open

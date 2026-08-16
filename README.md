# myAdmin — Ricevute occasionali 2026

Mini gestionale locale per ricevute di lavoro autonomo occasionale.

## Avvio consigliato

Apri PowerShell nella cartella del progetto e avvia:

```powershell
python server.py
```

Il browser si apre automaticamente su:

```text
http://127.0.0.1:5050
```

Non servono Flask o altri pacchetti Python: `server.py` usa solo la libreria standard.

## Struttura locale

```text
myAdmin/
├── index.html
├── app.js
├── style.css
├── server.css
├── pdf-local.js
├── server.py
├── data/
│   ├── registro-2026.json   # stato completo dell'app, generato localmente
│   └── registro-2026.xlsx   # registro Excel leggibile, rigenerato a ogni modifica
└── ricevute/
    └── 2026/
        ├── 001-spotlight.pdf
        ├── 002-scomodo.pdf
        └── ...
```

`data/*.json`, `data/*.xlsx` e i PDF in `ricevute/` sono ignorati da Git: i dati personali rimangono sul computer.

## Flusso

- **Fase 0 — crea/modifica:** compili la ricevuta e vedi la preview live.
- **Fase 1 — in sospeso:** drag & drop; l'ordine determina numerazione, cumulato precedente e quota INPS.
- **Fase 2 — incassate:** la ricevuta passa nello storico e il registro Excel viene aggiornato automaticamente.
- Le ricevute generate da myAdmin possono essere ricostruite e ristampate dallo storico.
- Una voce incassata può essere rimessa in sospeso o eliminata dal registro. Il PDF fisico non viene cancellato automaticamente.

## PDF locali

Con `python server.py`, myAdmin scandisce automaticamente `ricevute/2026/` e associa un PDF alla ricevuta in base al numero iniziale del nome file:

```text
009-teorema.pdf
009_teorema.pdf
009.pdf
```

Se apri invece `index.html` direttamente, resta disponibile il pulsante per selezionare manualmente la cartella dei PDF.

## Registro Excel

Il file `data/registro-2026.xlsx` viene rigenerato ogni volta che cambia il registro e contiene sia le voci **INCASSATE** sia quelle **IN SOSPESO**, con campi per lordo, cumulato precedente, imponibile INPS, aliquota, contributi, ritenuta, netto, stato, PDF e descrizione.

Lo stato completo e ricostruibile dell'app viene conservato anche in `data/registro-2026.json`; l'Excel è la vista tabellare leggibile e portabile del registro.

> Il calcolatore è uno strumento organizzativo. Prima di emettere una ricevuta soggetta a contribuzione, verifica i parametri previdenziali applicabili al tuo caso.

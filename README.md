# Ricevute occasionali 2026

Mini web-app locale per:
- tenere il cumulato dei compensi lordi;
- verificare il superamento della franchigia contributiva di € 5.000;
- stimare contributi Gestione Separata sulla sola eccedenza;
- calcolare quota lavoratrice / committente;
- calcolare la ritenuta d'acconto;
- stampare la ricevuta o salvarla in PDF dal browser;
- conservare un piccolo registro nel localStorage del browser.

## Uso
1. Estrai lo ZIP.
2. Apri `index.html` con Chrome o Edge.
3. Inserisci cumulato precedente e importo della nuova ricevuta.
4. Controlla il calcolo.
5. Clicca "Genera ricevuta".
6. Clicca "Stampa / Salva PDF" e scegli "Salva come PDF".

## Parametri inseriti
- Franchigia contributiva: € 5.000 annui.
- Ritenuta d'acconto: 20% quando il committente è sostituto d'imposta.
- Aliquota INPS predefinita: 33,72% per lavoro autonomo occasionale 2026 senza altra copertura previdenziale, modificabile nelle impostazioni.
- Ripartizione contributi: 1/3 lavoratrice, 2/3 committente.
- Se pensionata / iscritta ad altra previdenza obbligatoria: opzione 24%.

## Importante
È un calcolatore di supporto, non sostituisce commercialista/consulente del lavoro.
L'aliquota applicabile dipende dalla posizione previdenziale individuale.
In caso di più committenti e superamento della franchigia con compensi nello stesso mese, INPS prevede regole di riparto proporzionale: la mini-app non automatizza quel caso complesso.

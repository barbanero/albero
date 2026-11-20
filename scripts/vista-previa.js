#!/usr/bin/env node
/* Genera vista-previa.html: la web completa en un solo archivo, con los datos incrustados.
   Se abre con doble clic, sin servidor. Vuelve a ejecutarlo cada vez que cambies data/*.json.
   Uso: node scripts/vista-previa.js */
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');
const leer = (r) => fs.readFileSync(path.join(raiz, r), 'utf8');

const datos = {};
['config', 'eventos', 'gastronomia', 'reportajes'].forEach((n) => { datos[n] = JSON.parse(leer(`data/${n}.json`)); });

const seguro = (s) => s.replace(/<\/script/gi, '<\\/script');
const shim = `const __D = ${seguro(JSON.stringify(datos))};
window.fetch = (u) => { const k = String(u).split('/').pop().replace('.json', ''); return Promise.resolve({ ok: k in __D, status: 404, json: () => Promise.resolve(__D[k]) }); };
`;

let html = leer('index.html');
html = html.replace('<link rel="stylesheet" href="css/styles.css">', `<style>${leer('css/styles.css')}</style>`);
html = html.replace('<script src="js/azulejos.js"></script>', `<script>${seguro(leer('js/azulejos.js'))}</script>`);
html = html.replace('<script src="js/app.js"></script>', `<script>${shim}${seguro(leer('js/app.js'))}</script>`);

fs.writeFileSync(path.join(raiz, 'vista-previa.html'), html);
console.log('Generado vista-previa.html');

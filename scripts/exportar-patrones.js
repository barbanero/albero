#!/usr/bin/env node
/* Regenera img/patrones/*.svg y docs/patrones.html a partir de js/azulejos.js.
   Uso: node scripts/exportar-patrones.js */
const fs = require('fs');
const path = require('path');
const A = require('../js/azulejos.js');
const raiz = path.join(__dirname, '..');
const out = path.join(raiz, 'img', 'patrones');
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(path.join(raiz, 'docs'), { recursive: true });

const NOMBRES = {
  musica: 'Música', teatro: 'Teatro', flamenco: 'Flamenco', exposicion: 'Exposiciones', cine: 'Cine', danza: 'Danza',
  festival: 'Fiestas y mercadillos', familia: 'En familia', fotografia: 'Fotografía',
  tapas: 'Tapas', restaurante: 'Restaurantes', mercado: 'Mercados', dulces: 'Dulces y cafés', copas: 'Bares y copas',
  reportaje: 'Reportajes'
};

for (const k of Object.keys(A.PATRONES)) {
  if (k === 'base') continue;
  fs.writeFileSync(path.join(out, `${k}.svg`), A.categoria(k, 8, 5));
  fs.writeFileSync(path.join(out, `${k}-mosaico.svg`), A.categoria(k, 4, 4));
}

const figuras = Object.keys(NOMBRES).filter((k) => A.PATRONES[k]).map((k) => `<figure>${A.categoria(k, 8, 5)}<figcaption>${NOMBRES[k]}</figcaption></figure>`).join('');
fs.writeFileSync(path.join(raiz, 'docs', 'patrones.html'),
`<!doctype html><meta charset="utf-8"><title>Azulejos de Albero</title><style>body{font-family:system-ui;background:#f4f5f1;color:#101936;margin:0;padding:32px}h1{font-weight:600}div.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:20px}figure{margin:0;background:#fff}figure svg{display:block;width:100%;height:auto;aspect-ratio:8/5}figcaption{padding:8px 12px;font-weight:600}</style><h1>Azulejos por categoría</h1><div class="g">${figuras}</div>`);
console.log('Patrones exportados en img/patrones y docs/patrones.html');

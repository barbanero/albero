#!/usr/bin/env node
/* Valida data/*.json antes de publicar. Uso: node scripts/validar.js
   Sale con código 1 si hay errores, para que el despliegue se detenga y no se publique un JSON roto. */
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'data');
const errores = [];
const err = (f, m) => errores.push(`${f}: ${m}`);

const EVENTOS = ['musica', 'teatro', 'flamenco', 'exposicion', 'cine', 'danza', 'festival', 'familia', 'fotografia'];
const LUGARES = ['tapas', 'restaurante', 'mercado', 'dulces', 'copas'];
const reFecha = /^\d{4}-\d{2}-\d{2}$/;
const reHora = /^([01]\d|2[0-3]):[0-5]\d$/;
const reId = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const reUrl = /^https?:\/\//i;

function cargar(nombre) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, nombre), 'utf8')); }
  catch (e) { err(nombre, `no es un JSON válido (${e.message})`); return null; }
}
function fechaValida(s) {
  if (!reFecha.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
}
function revisar(nombre, lista, req, extra) {
  if (!Array.isArray(lista)) return err(nombre, 'debe ser una lista []');
  const ids = new Set();
  lista.forEach((x, i) => {
    const t = `${nombre}[${i}]${x && x.id ? ` (${x.id})` : ''}`;
    if (!x || typeof x !== 'object') return err(t, 'elemento no válido');
    req.forEach((k) => { if (x[k] === undefined || x[k] === '') err(t, `falta "${k}"`); });
    if (x.id) {
      if (!reId.test(x.id)) err(t, 'id inválido: solo minúsculas, números y guiones');
      if (ids.has(x.id)) err(t, 'id repetido');
      ids.add(x.id);
    }
    ['imagen', 'url_entradas', 'web'].forEach((k) => { if (x[k] && !reUrl.test(x[k])) err(t, `"${k}" debe empezar por http:// o https://`); });
    extra(x, t);
  });
}

const cfg = cargar('config.json');
if (cfg && typeof cfg !== 'object') err('config.json', 'debe ser un objeto');

revisar('eventos.json', cargar('eventos.json'), ['id', 'titulo', 'categoria', 'fecha', 'lugar', 'barrio', 'resumen'], (e, t) => {
  if (!EVENTOS.includes(e.categoria)) err(t, `categoria "${e.categoria}" no existe (${EVENTOS.join(', ')})`);
  if (e.fecha && !fechaValida(e.fecha)) err(t, 'fecha debe ser AAAA-MM-DD y existir');
  if (e.fecha_fin) {
    if (!fechaValida(e.fecha_fin)) err(t, 'fecha_fin debe ser AAAA-MM-DD y existir');
    else if (e.fecha && e.fecha_fin < e.fecha) err(t, 'fecha_fin es anterior a fecha');
  }
  if (e.hora && !reHora.test(e.hora)) err(t, 'hora debe ser HH:MM');
  if (e.descripcion && !Array.isArray(e.descripcion)) err(t, 'descripcion debe ser una lista de párrafos');
});
revisar('gastronomia.json', cargar('gastronomia.json'), ['id', 'nombre', 'tipo', 'barrio', 'resumen'], (p, t) => {
  if (!LUGARES.includes(p.tipo)) err(t, `tipo "${p.tipo}" no existe (${LUGARES.join(', ')})`);
  if (p.descripcion && !Array.isArray(p.descripcion)) err(t, 'descripcion debe ser una lista de párrafos');
  if (p.platos && !Array.isArray(p.platos)) err(t, 'platos debe ser una lista');
});
revisar('reportajes.json', cargar('reportajes.json'), ['id', 'titulo', 'categoria', 'fecha', 'resumen', 'cuerpo'], (r, t) => {
  if (r.fecha && !fechaValida(r.fecha)) err(t, 'fecha debe ser AAAA-MM-DD y existir');
  if (!Array.isArray(r.cuerpo)) err(t, 'cuerpo debe ser una lista de bloques');
  else r.cuerpo.forEach((b, j) => { if (!['p', 'h2', 'quote'].includes(b.t) || typeof b.text !== 'string') err(t, `cuerpo[${j}] debe ser {t: "p"|"h2"|"quote", text: "..."}`); });
});

if (cfg && cfg.fecha_demo) console.warn('Aviso: config.json tiene "fecha_demo" activa. Déjala vacía en producción.');
if (errores.length) { console.error(`\n${errores.length} error(es) en los datos:\n` + errores.map((e) => ' - ' + e).join('\n')); process.exit(1); }
console.log('Datos correctos.');

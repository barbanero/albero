/* Albero · azulejos
   Un diseño fijo por categoría (PATRONES) y un generador aleatorio para el resto.
   Funciona en el navegador (window.Azulejos) y en Node (require) para exportar SVG. */
(function (root) {
  'use strict';

  const C = { cobalto: '#1C3FAA', albero: '#E2A93B', granada: '#A31D3A', cal: '#F4F5F1', tinta: '#101936', claro: '#DCE4F7' };

  function estrella(cx, cy, R, r, n) {
    const p = [];
    for (let i = 0; i < n * 2; i++) {
      const rad = i % 2 ? r : R;
      const a = (Math.PI * i) / n - Math.PI / 2;
      p.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
    }
    return p.join(' ');
  }

  /* Cuatro motivos de 20x20. a, b, c son los tres colores de la paleta. */
  const MOTIVOS = [
    /* 0 · cuarto de círculo con punto */
    (a, b, c) => `<rect width="20" height="20" fill="${b}"/><path d="M0 0H20A20 20 0 0 1 0 20Z" fill="${a}"/><circle cx="6" cy="6" r="2.6" fill="${c}"/>`,
    /* 1 · rombo con cuadrado */
    (a, b, c) => `<rect width="20" height="20" fill="${a}"/><polygon points="10,1 19,10 10,19 1,10" fill="${b}"/><rect x="7" y="7" width="6" height="6" fill="${c}"/>`,
    /* 2 · triángulos enfrentados */
    (a, b, c) => `<rect width="20" height="20" fill="${c}"/><polygon points="0,0 20,0 0,20" fill="${a}"/><polygon points="20,20 20,6 6,20" fill="${b}"/>`,
    /* 3 · estrella de ocho puntas */
    (a, b, c) => `<rect width="20" height="20" fill="${b}"/><polygon points="${estrella(10, 10, 9, 4.6, 8)}" fill="${a}"/><circle cx="10" cy="10" r="2.2" fill="${c}"/>`,
    /* 4 · objetivo: círculos concéntricos */
    (a, b, c) => `<rect width="20" height="20" fill="${b}"/><circle cx="10" cy="10" r="9" fill="${a}"/><circle cx="10" cy="10" r="5.6" fill="${b}"/><circle cx="10" cy="10" r="2.6" fill="${c}"/>`
  ];
  const GIRO = [0, 90, 270, 180];
  const PERMUTACIONES = [[0, 1, 2], [1, 0, 2], [0, 2, 1]];

  /* Un diseño por categoría: motivos [m1, m2], permutación de colores y paleta [a, b, c].
     Eventos, sitios para comer, reportajes y portada. */
  const PATRONES = {
    /* Agenda */
    musica:     { m: [0, 3], perm: 0, pal: [C.cobalto, C.albero, C.cal] },
    teatro:     { m: [3, 1], perm: 1, pal: [C.granada, C.cal, C.albero] },
    flamenco:   { m: [1, 0], perm: 0, pal: [C.granada, C.albero, C.tinta] },
    exposicion: { m: [1, 3], perm: 0, pal: [C.cobalto, C.cal, C.granada] },
    cine:       { m: [1, 3], perm: 0, pal: [C.tinta, C.albero, C.cal] },
    danza:      { m: [2, 0], perm: 0, pal: [C.cobalto, C.granada, C.cal] },
    festival:   { m: [0, 1], perm: 0, pal: [C.albero, C.cobalto, C.cal] },
    familia:    { m: [2, 3], perm: 2, pal: [C.albero, C.granada, C.cal] },
    fotografia: { m: [4, 1], perm: 0, pal: [C.tinta, C.cal, C.cobalto] },
    /* Comer y beber */
    tapas:      { m: [2, 0], perm: 0, pal: [C.albero, C.granada, C.cal] },
    restaurante:{ m: [3, 0], perm: 0, pal: [C.granada, C.cal, C.cobalto] },
    mercado:    { m: [1, 2], perm: 0, pal: [C.cobalto, C.albero, C.cal] },
    dulces:     { m: [0, 2], perm: 1, pal: [C.cal, C.granada, C.albero] },
    copas:      { m: [2, 1], perm: 0, pal: [C.tinta, C.cobalto, C.albero] },
    /* Resto */
    reportaje:  { m: [3, 1], perm: 2, pal: [C.cobalto, C.claro, C.albero] },
    base:       { m: [0, 3], perm: 0, pal: [C.cobalto, C.claro, C.albero] }
  };
  const PALETAS = { barrio: [C.cobalto, C.albero, C.cal] };

  function dibujar(m1, m2, pal, perm, cols, rows) {
    const col = PERMUTACIONES[perm].map((i) => pal[i]);
    let g = '';
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const m = (Math.floor(j / 2) + Math.floor(i / 2)) % 2 ? m2 : m1;
        g += `<g transform="translate(${j * 20} ${i * 20}) rotate(${GIRO[(i % 2) * 2 + (j % 2)]} 10 10)">${MOTIVOS[m](...col)}</g>`;
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols * 20} ${rows * 20}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${g}</svg>`;
  }

  /* Diseño fijo de una categoría. */
  function categoria(clave, cols = 8, rows = 5) {
    const p = PATRONES[clave] || PATRONES.base;
    return dibujar(p.m[0], p.m[1], p.pal, p.perm, cols, rows);
  }

  /* Diseño aleatorio pero estable para un texto (barrios, portada, franja). */
  function rng(seed) {
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    let a = h >>> 0;
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function aleatorio(seed, pal, cols = 8, rows = 5) {
    const r = rng(seed);
    const m1 = Math.floor(r() * MOTIVOS.length);
    const m2 = Math.floor(r() * MOTIVOS.length);
    const perm = Math.floor(r() * 3);
    return dibujar(m1, m2, pal, perm, cols, rows);
  }

  const api = { C, PATRONES, PALETAS, categoria, aleatorio, dibujar };
  root.Azulejos = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

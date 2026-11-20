/* Albero · revista digital de Sevilla
   Lee data/*.json y pinta la revista en el navegador. Sin servidor propio. */
(() => {
  'use strict';

  /* ---------- Utilidades ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const urlSegura = (u) => (/^https?:\/\//i.test(u || '') ? u : '');
  const slug = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const fmt = (s, o) => new Intl.DateTimeFormat('es-ES', o).format(parse(s));
  const sumar = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };

  const CAT_EVENTO = { musica: 'Música', teatro: 'Teatro', flamenco: 'Flamenco', exposicion: 'Exposiciones', cine: 'Cine', danza: 'Danza', festival: 'Fiestas y mercadillos', familia: 'En familia', fotografia: 'Fotografía' };
  const TIPO_LUGAR = { tapas: 'Tapas', restaurante: 'Restaurantes', mercado: 'Mercados', dulces: 'Dulces y cafés', copas: 'Bares y copas' };

  /* ---------- Arte: azulejos (ver js/azulejos.js) ---------- */
  const A = window.Azulejos;
  const C = A.C;
  const azulejo = (seed, pal, cols, rows) => A.aleatorio(seed, pal, cols, rows);
  const arte = (item, clave, cols, rows) => {
    const img = urlSegura(item.imagen);
    return img ? `<img src="${esc(img)}" alt="" loading="lazy">` : A.categoria(clave, cols, rows);
  };

  /* ---------- Estado ---------- */
  const D = { cfg: { anuncios: {} }, eventos: [], lugares: [], reportajes: [] };
  const F = { agenda: { cuando: 'todo', cat: '', barrio: '' }, comer: { tipo: '', barrio: '' } };
  let HOY = iso(new Date());

  const fin = (e) => e.fecha_fin || e.fecha;
  const vigente = (e) => fin(e) >= HOY;
  const activoEl = (e, d) => e.fecha <= d && fin(e) >= d;
  const ordenEv = (a, b) => (a.fecha < HOY ? HOY : a.fecha).localeCompare(b.fecha < HOY ? HOY : b.fecha) || (a.hora || '').localeCompare(b.hora || '');
  const proximos = () => D.eventos.filter(vigente).sort(ordenEv);

  const fechaCorta = (e) => {
    if (e.fecha_fin && e.fecha_fin !== e.fecha) return `Hasta el ${fmt(e.fecha_fin, { day: 'numeric', month: 'short' })}`;
    return cap(fmt(e.fecha, { weekday: 'short', day: 'numeric', month: 'short' }));
  };
  const fechaLarga = (e) => {
    if (e.fecha_fin && e.fecha_fin !== e.fecha) return `Del ${fmt(e.fecha, { day: 'numeric', month: 'long' })} al ${fmt(e.fecha_fin, { day: 'numeric', month: 'long', year: 'numeric' })}`;
    return cap(fmt(e.fecha, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
  };

  /* ---------- Publicidad ---------- */
  const consentimiento = () => { try { return localStorage.getItem('albero-ads'); } catch { return null; } };
  const anuncios = () => D.cfg.anuncios || {};
  function ad(nombre, extra = '') {
    const A = anuncios();
    if (!A.activo) return '';
    const slotId = (A.slots || {})[nombre];
    const real = A.adsense_client && slotId && consentimiento() === 'si';
    if (real) {
      return `<aside class="ad ad--${nombre} ${extra}" aria-label="Publicidad"><span class="ad__tag">Publicidad</span><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(A.adsense_client)}" data-ad-slot="${esc(slotId)}" data-ad-format="auto" data-full-width-responsive="true"></ins></aside>`;
    }
    if (A.mostrar_reservas) {
      return `<aside class="ad ad--${nombre} ${extra}" aria-label="Publicidad"><span class="ad__tag">Publicidad</span><div class="ad__reserva">Espacio reservado para anuncio</div></aside>`;
    }
    return '';
  }
  let adsenseCargado = false;
  function iniciarAds() {
    const A = anuncios();
    if (!A.activo || !A.adsense_client || consentimiento() !== 'si') return;
    if (!adsenseCargado) {
      const s = document.createElement('script');
      s.async = true; s.crossOrigin = 'anonymous';
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(A.adsense_client)}`;
      document.head.appendChild(s);
      adsenseCargado = true;
    }
    document.querySelectorAll('ins.adsbygoogle:not([data-ok])').forEach((el) => {
      el.setAttribute('data-ok', '1');
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* sin anuncio */ }
    });
  }
  function banner() {
    const A = anuncios();
    const caja = $('#cookies');
    const necesita = A.activo && A.adsense_client && consentimiento() === null;
    caja.hidden = !necesita;
  }
  function decidir(v) {
    try { localStorage.setItem('albero-ads', v); } catch { /* ignorar */ }
    $('#cookies').hidden = true;
    ruta();
  }

  /* ---------- Componentes ---------- */
  const marcas = (x) => `${x.patrocinado ? '<span class="etiqueta-pat">Patrocinado</span>' : ''}${x.nuevo ? '<span class="etiqueta-nuevo">Nuevo</span>' : ''}`;

  const tarjetaEvento = (e) => `
    <a class="tarjeta" href="#/agenda/${esc(e.id)}">
      <div class="tarjeta__arte">${arte(e, e.categoria)}<span class="tarjeta__fecha">${esc(fechaCorta(e))}${e.hora ? `, ${esc(e.hora)}` : ''}</span></div>
      <div class="tarjeta__cuerpo">
        <span class="tarjeta__tipo">${esc(CAT_EVENTO[e.categoria] || e.categoria)}${marcas(e)}</span>
        <h3 class="tarjeta__titulo">${esc(e.titulo)}</h3>
        <span class="tarjeta__lugar">${esc(e.lugar)}, ${esc(e.barrio)}</span>
      </div>
    </a>`;

  const tarjetaLugar = (p) => `
    <a class="tarjeta" href="#/comer/${esc(p.id)}">
      <div class="tarjeta__arte">${arte(p, p.tipo)}</div>
      <div class="tarjeta__cuerpo">
        <span class="tarjeta__tipo">${esc(TIPO_LUGAR[p.tipo] || p.tipo)}${marcas(p)}</span>
        <h3 class="tarjeta__titulo">${esc(p.nombre)}</h3>
        <p>${esc(p.resumen)}</p>
        <span class="tarjeta__lugar">${esc(p.barrio)}, ${esc(p.precio || '')}</span>
      </div>
    </a>`;

  const filaEvento = (e) => `
    <a class="fila" href="#/agenda/${esc(e.id)}">
      <div class="fila__hora">${esc(e.hora || '—')}<small>${esc(fechaCorta(e))}</small></div>
      <div>
        <span class="fila__tipo">${esc(CAT_EVENTO[e.categoria] || e.categoria)}${marcas(e)}</span>
        <h3 class="fila__titulo">${esc(e.titulo)}</h3>
        <span class="fila__lugar">${esc(e.lugar)}, ${esc(e.barrio)}</span>
      </div>
      <div class="fila__arte">${arte(e, e.categoria)}</div>
      <div class="fila__precio">${esc(e.precio || '')}</div>
    </a>`;

  const repPrincipal = (r) => `
    <a class="rep-principal" href="#/reportajes/${esc(r.id)}">
      <div class="tarjeta__arte">${arte(r, 'reportaje', 12, 8)}</div>
      <div><span class="tarjeta__tipo">${esc(r.categoria)}</span><h3>${esc(r.titulo)}</h3></div>
      <p>${esc(r.resumen)}</p>
    </a>`;
  const repItem = (r) => `
    <a class="rep-item" href="#/reportajes/${esc(r.id)}">
      <span class="tarjeta__tipo">${esc(r.categoria)}</span>
      <h3>${esc(r.titulo)}</h3>
      <p>${esc(r.resumen)}</p>
    </a>`;

  const seccion = (titulo, enlace, texto, cuerpo, extra = '') => `
    <section class="seccion ${extra}">
      <div class="seccion__cab"><h2>${esc(titulo)}</h2>${enlace ? `<a class="enlace-ver" href="${enlace}">${esc(texto)}</a>` : ''}</div>
      ${cuerpo}
    </section>`;

  const barriosLista = () => [...new Set([...D.eventos.map((e) => e.barrio), ...D.lugares.map((l) => l.barrio)])].filter(Boolean).sort((a, b) => a.localeCompare(b, 'es'));

  /* ---------- Vistas ---------- */
  function vistaInicio() {
    const prox = proximos();
    const dest = prox.find((e) => e.destacado) || prox[0];
    const lateral = prox.filter((e) => e !== dest).slice(0, 4);
    const comer = D.lugares.slice(0, 3);
    const reps = [...D.reportajes].sort((a, b) => b.fecha.localeCompare(a.fecha));

    const hero = dest ? `
      <section class="hero" aria-label="Plan destacado">
        <div class="hero__interior">
          <div class="hero__cuerpo">
            <span class="hero__fecha">${esc(fechaCorta(dest))}${dest.hora ? `, ${esc(dest.hora)}` : ''}</span>
            <h1><a href="#/agenda/${esc(dest.id)}">${esc(dest.titulo)}</a></h1>
            <p>${esc(dest.resumen)}</p>
            <span class="hero__lugar">${esc(dest.lugar)}, ${esc(dest.barrio)}</span>
          </div>
          <div class="hero__arte">${azulejo('hero' + dest.id, [C.albero, C.cobalto, '#2d52c4'], 10, 12)}</div>
        </div>
      </section>` : '';

    return `
      ${ad('cabecera')}
      ${hero}
      ${seccion('Lo próximo en Sevilla', '#/agenda', 'Ver toda la agenda', `<div class="fila-hoy">${lateral.map(tarjetaEvento).join('')}</div>`)}
      <div class="seccion">
        <div class="cols">
          <section>
            <div class="seccion__cab"><h2>Para comer y beber</h2><a class="enlace-ver" href="#/comer">Ver la guía</a></div>
            <div class="tarjetas tarjetas--2">${comer.slice(0, 2).map(tarjetaLugar).join('')}</div>
            <div class="tarjetas tarjetas--2" style="margin-top:24px">${comer.slice(2, 3).map(tarjetaLugar).join('')}</div>
          </section>
          <div class="cols__lateral">${ad('lateral')}</div>
        </div>
      </div>
      ${reps.length ? seccion('Reportajes', '#/reportajes', 'Ver todos', `<div class="reportajes">${repPrincipal(reps[0])}<div class="rep-lista">${reps.slice(1, 4).map(repItem).join('')}</div></div>`) : ''}
      ${seccion('Por barrios', '#/barrios', 'Ver todos los barrios', `<div class="chips-barrios">${barriosLista().map((b) => `<a class="chip-barrio" href="#/barrio/${slug(b)}">${esc(b)}</a>`).join('')}</div>`)}
    `;
  }

  /* Agenda */
  function filtrarEventos() {
    const f = F.agenda;
    let lista = proximos();
    if (f.cuando === 'hoy') lista = lista.filter((e) => activoEl(e, HOY));
    if (f.cuando === 'finde') {
      const d = parse(HOY); const dow = d.getDay();
      const sab = dow === 0 ? sumar(HOY, -1) : sumar(HOY, 6 - dow); const dom = sumar(sab, 1);
      lista = lista.filter((e) => e.fecha <= dom && fin(e) >= sab);
    }
    if (f.cuando === 'mes') { const finMes = iso(new Date(parse(HOY).getFullYear(), parse(HOY).getMonth() + 1, 0)); lista = lista.filter((e) => e.fecha <= finMes); }
    if (f.cat) lista = lista.filter((e) => e.categoria === f.cat);
    if (f.barrio) lista = lista.filter((e) => e.barrio === f.barrio);
    return lista;
  }
  function listaAgenda(lista, conAds = true) {
    if (!lista.length) return `<div class="vacio"><p><strong>No hay planes con estos filtros.</strong></p><p>Prueba con otra fecha o quita la categoría.</p></div>`;
    const grupos = new Map();
    lista.forEach((e) => { const k = e.fecha < HOY ? 'curso' : e.fecha; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(e); });
    const cada = Number(anuncios().infeed_cada) || 0;
    let n = 0, html = '';
    grupos.forEach((items, k) => {
      html += `<section class="dia"><h2 class="dia__titulo">${k === 'curso' ? 'En cartel ahora' : esc(cap(fmt(k, { weekday: 'long', day: 'numeric', month: 'long' })))}</h2>`;
      items.forEach((e) => { html += filaEvento(e); n++; if (conAds && cada && n % cada === 0) html += ad('infeed', 'ad--en-fila'); });
      html += '</section>';
    });
    return html;
  }
  function vistaAgenda() {
    const f = F.agenda;
    const cuando = [['todo', 'Todo'], ['hoy', 'Hoy'], ['finde', 'Este fin de semana'], ['mes', 'Este mes']];
    return `
      <div class="pagina-cab"><h1 class="titulo-pagina">Agenda cultural</h1><p class="bajada">Conciertos, teatro, flamenco, exposiciones y más, ordenados por día.</p></div>
      <div class="filtros" id="filtros-agenda">
        <div class="filtros__grupo" role="group" aria-label="Cuándo"><span class="filtros__nombre">Cuándo</span>${cuando.map(([v, t]) => `<button class="chip" type="button" data-f="cuando" data-v="${v}" aria-pressed="${f.cuando === v}">${t}</button>`).join('')}</div>
        <div class="filtros__grupo" role="group" aria-label="Categoría"><span class="filtros__nombre">Categoría</span><button class="chip" type="button" data-f="cat" data-v="" aria-pressed="${f.cat === ''}">Todas</button>${Object.entries(CAT_EVENTO).map(([v, t]) => `<button class="chip" type="button" data-f="cat" data-v="${v}" aria-pressed="${f.cat === v}">${t}</button>`).join('')}</div>
        <div class="filtros__grupo"><label class="filtros__nombre" for="f-barrio">Barrio</label><select class="selector" id="f-barrio" data-f="barrio"><option value="">Todos</option>${barriosLista().map((b) => `<option ${f.barrio === b ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></div>
      </div>
      <div class="seccion" id="resultado-agenda" aria-live="polite" style="padding-top:0">${listaAgenda(filtrarEventos())}</div>`;
  }

  /* Comer */
  function filtrarLugares() {
    const f = F.comer;
    return D.lugares.filter((l) => (!f.tipo || l.tipo === f.tipo) && (!f.barrio || l.barrio === f.barrio));
  }
  function gridLugares(lista) {
    if (!lista.length) return `<div class="vacio"><p><strong>No hay sitios con estos filtros.</strong></p><p>Prueba con otro tipo o barrio.</p></div>`;
    const cada = Number(anuncios().infeed_cada) || 0;
    let html = '<div class="tarjetas">';
    lista.forEach((l, i) => { html += tarjetaLugar(l); if (cada && (i + 1) % Math.max(cada / 2, 3) === 0 && i + 1 < lista.length) html += ad('infeed'); });
    return html + '</div>';
  }
  function vistaComer() {
    const f = F.comer;
    return `
      <div class="pagina-cab"><h1 class="titulo-pagina">Comer y beber</h1><p class="bajada">Barras, mercados, dulces y cocina de temporada, por barrios.</p></div>
      <div class="filtros" id="filtros-comer">
        <div class="filtros__grupo" role="group" aria-label="Tipo"><span class="filtros__nombre">Tipo</span><button class="chip" type="button" data-f="tipo" data-v="" aria-pressed="${f.tipo === ''}">Todos</button>${Object.entries(TIPO_LUGAR).map(([v, t]) => `<button class="chip" type="button" data-f="tipo" data-v="${v}" aria-pressed="${f.tipo === v}">${t}</button>`).join('')}</div>
        <div class="filtros__grupo"><label class="filtros__nombre" for="f-barrio-c">Barrio</label><select class="selector" id="f-barrio-c" data-f="barrio"><option value="">Todos</option>${barriosLista().map((b) => `<option ${f.barrio === b ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></div>
      </div>
      <div class="seccion" id="resultado-comer" aria-live="polite" style="padding-top:32px">${gridLugares(filtrarLugares())}</div>`;
  }

  /* Reportajes */
  function vistaReportajes() {
    const reps = [...D.reportajes].sort((a, b) => b.fecha.localeCompare(a.fecha));
    return `
      <div class="pagina-cab"><h1 class="titulo-pagina">Reportajes</h1><p class="bajada">Paseos, mesas y cultura contados con calma.</p></div>
      <div class="seccion" style="padding-top:32px"><div class="tarjetas">${reps.map((r) => `
        <a class="tarjeta" href="#/reportajes/${esc(r.id)}"><div class="tarjeta__arte">${arte(r, 'reportaje', 8, 5)}</div>
        <div class="tarjeta__cuerpo"><span class="tarjeta__tipo">${esc(r.categoria)}</span><h3 class="tarjeta__titulo">${esc(r.titulo)}</h3><p>${esc(r.resumen)}</p><span class="tarjeta__lugar">${esc(cap(fmt(r.fecha, { day: 'numeric', month: 'long', year: 'numeric' })))}</span></div></a>`).join('')}</div></div>
      ${ad('cabecera')}`;
  }

  /* Barrios */
  function vistaBarrios() {
    return `
      <div class="pagina-cab"><h1 class="titulo-pagina">Barrios</h1><p class="bajada">Todo lo que pasa y se come en cada rincón de la ciudad.</p></div>
      <div class="seccion" style="padding-top:32px"><div class="barrios">${barriosLista().map((b) => {
        const ne = D.eventos.filter((e) => e.barrio === b && vigente(e)).length; const nl = D.lugares.filter((l) => l.barrio === b).length;
        return `<a class="barrio" href="#/barrio/${slug(b)}">${azulejo('barrio' + b, A.PALETAS.barrio, 10, 6)}<div class="barrio__texto"><h3>${esc(b)}</h3><p>${ne} ${ne === 1 ? 'plan' : 'planes'}, ${nl} ${nl === 1 ? 'sitio' : 'sitios'}</p></div></a>`;
      }).join('')}</div></div>`;
  }
  function vistaBarrio(s) {
    const b = barriosLista().find((x) => slug(x) === s);
    if (!b) return noEncontrado();
    const ev = proximos().filter((e) => e.barrio === b); const lu = D.lugares.filter((l) => l.barrio === b);
    document.title = `${b} · Albero`;
    return `
      <div class="pagina-cab"><p class="migas"><a href="#/barrios">Barrios</a></p><h1 class="titulo-pagina">${esc(b)}</h1></div>
      ${seccion('Planes', '', '', ev.length ? `<div class="tarjetas">${ev.map(tarjetaEvento).join('')}</div>` : '<div class="vacio"><p>No hay planes programados por ahora en este barrio.</p></div>')}
      ${seccion('Para comer y beber', '', '', lu.length ? `<div class="tarjetas">${lu.map(tarjetaLugar).join('')}</div>` : '<div class="vacio"><p>Aún no hay sitios en este barrio.</p></div>')}`;
  }

  /* Detalle */
  const migas = (a, t) => `<p class="migas"><a href="#/${a}">${esc(t)}</a></p>`;
  function dato(t, v) { return v ? `<div><dt>${esc(t)}</dt><dd>${esc(v)}</dd></div>` : ''; }

  function vistaEvento(id) {
    const e = D.eventos.find((x) => x.id === id); if (!e) return noEncontrado();
    document.title = `${e.titulo} · Albero`;
    const entradas = urlSegura(e.url_entradas);
    const ld = { '@context': 'https://schema.org', '@type': 'Event', name: e.titulo, startDate: e.fecha + (e.hora ? `T${e.hora}` : ''), endDate: fin(e), location: { '@type': 'Place', name: e.lugar, address: { '@type': 'PostalAddress', addressLocality: 'Sevilla', addressCountry: 'ES' } }, description: e.resumen };
    return `
      <article class="detalle">
        ${migas('agenda', 'Agenda')}
        <span class="tarjeta__tipo">${esc(CAT_EVENTO[e.categoria] || e.categoria)}${marcas(e)}</span>
        <h1>${esc(e.titulo)}</h1>
        <p class="bajada" style="margin-top:0">${esc(e.resumen)}</p>
        <div class="detalle__arte">${arte(e, e.categoria, 12, 6)}</div>
        <dl class="datos">${dato('Cuándo', fechaLarga(e))}${dato('Hora', e.hora)}${dato('Dónde', `${e.lugar}, ${e.barrio}`)}${dato('Precio', e.precio)}</dl>
        <div class="texto">${(e.descripcion || []).map((p) => `<p>${esc(p)}</p>`).join('')}</div>
        <div class="acciones">${entradas ? `<a class="boton" href="${esc(entradas)}" rel="noopener sponsored" target="_blank">Comprar entradas</a>` : ''}<a class="boton boton--claro" href="#/barrio/${slug(e.barrio)}">Más en ${esc(e.barrio)}</a></div>
        <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}<\/script>
      </article>
      ${ad('cabecera')}`;
  }
  function vistaLugar(id) {
    const p = D.lugares.find((x) => x.id === id); if (!p) return noEncontrado();
    document.title = `${p.nombre} · Albero`;
    const web = urlSegura(p.web);
    return `
      <article class="detalle">
        ${migas('comer', 'Comer y beber')}
        <span class="tarjeta__tipo">${esc(TIPO_LUGAR[p.tipo] || p.tipo)}${marcas(p)}</span>
        <h1>${esc(p.nombre)}</h1>
        <p class="bajada" style="margin-top:0">${esc(p.resumen)}</p>
        <div class="detalle__arte">${arte(p, p.tipo, 12, 6)}</div>
        <dl class="datos">${dato('Barrio', p.barrio)}${dato('Dirección', p.direccion)}${dato('Precio', p.precio)}</dl>
        <div class="texto">${(p.descripcion || []).map((t) => `<p>${esc(t)}</p>`).join('')}</div>
        ${(p.platos || []).length ? `<ul class="platos" aria-label="Qué pedir">${p.platos.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        <div class="acciones">${web ? `<a class="boton" href="${esc(web)}" rel="noopener" target="_blank">Web del local</a>` : ''}<a class="boton boton--claro" href="#/barrio/${slug(p.barrio)}">Más en ${esc(p.barrio)}</a></div>
      </article>
      ${ad('cabecera')}`;
  }
  function vistaReportaje(id) {
    const r = D.reportajes.find((x) => x.id === id); if (!r) return noEncontrado();
    document.title = `${r.titulo} · Albero`;
    const cuerpo = (r.cuerpo || []).map((b) => b.t === 'h2' ? `<h2>${esc(b.text)}</h2>` : b.t === 'quote' ? `<blockquote>${esc(b.text)}</blockquote>` : `<p>${esc(b.text)}</p>`).join('');
    return `
      <article class="detalle">
        ${migas('reportajes', 'Reportajes')}
        <span class="tarjeta__tipo">${esc(r.categoria)}</span>
        <h1>${esc(r.titulo)}</h1>
        <p class="bajada" style="margin-top:0">${esc(r.resumen)}</p>
        <p class="bajada" style="font-size:.93rem">${esc(r.autor || 'Redacción')}, ${esc(fmt(r.fecha, { day: 'numeric', month: 'long', year: 'numeric' }))}</p>
        <div class="detalle__arte">${arte(r, 'reportaje', 12, 6)}</div>
        <div class="texto">${cuerpo}</div>
      </article>
      ${ad('cabecera')}`;
  }
  /* Páginas legales: los datos del titular salen de data/config.json > legal */
  function vistaLegal(tipo) {
    const lg = D.cfg.legal || {};
    const L = (k) => esc(lg[k] || '[completar en data/config.json]');
    const nombre = esc(D.cfg.nombre || 'Albero');
    const paginas = {
      'aviso-legal': ['Aviso legal', [
        ['Titular', `Este sitio web, ${nombre}, es titularidad de ${L('titular')}, con NIF ${L('nif')} y domicilio en ${L('domicilio')}. Contacto: ${L('email')}.`],
        ['Objeto', `${nombre} es una revista digital con información sobre la programación cultural y gastronómica de Sevilla. La información es orientativa: fechas, horarios, precios y programas pueden cambiar. Confirma siempre con el organizador o el local antes de ir.`],
        ['Propiedad intelectual', 'Los textos, el diseño y los azulejos gráficos de este sitio pertenecen a su titular. Los nombres y marcas de terceros pertenecen a sus propietarios y se citan solo con fines informativos.'],
        ['Enlaces y publicidad', 'El sitio incluye enlaces a webs de terceros (entradas, locales) y publicidad. El titular no se responsabiliza de sus contenidos. Los contenidos marcados como "Patrocinado" son publicidad.'],
        ['Legislación', 'Este sitio se rige por la legislación española.']
      ]],
      privacidad: ['Política de privacidad', [
        ['Responsable', `${L('titular')}, NIF ${L('nif')}, ${L('domicilio')}. Correo: ${L('email')}.`],
        ['Qué datos tratamos', `${nombre} no tiene registro de usuarios ni formularios. No pedimos datos personales. Tu navegador envía de forma automática datos técnicos (dirección IP, navegador) al servidor que aloja la web, que los usa para entregar las páginas. Si aceptas la publicidad, Google puede tratar datos mediante cookies, tal como se explica en la política de cookies.`],
        ['Para qué y con qué base', 'Mostrar la web (interés legítimo) y mostrar publicidad personalizada (tu consentimiento, que puedes retirar en cualquier momento).'],
        ['Tus derechos', `Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a ${L('email')}. Si no estás conforme, puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).`]
      ]],
      cookies: ['Política de cookies', [
        ['Qué son', 'Son pequeños archivos o datos que tu navegador guarda cuando visitas una web.'],
        ['Las que usamos', 'Técnica: guardamos en tu navegador si aceptaste o rechazaste la publicidad (clave "albero-ads"). No necesita consentimiento. Publicitarias: si aceptas, Google AdSense instala cookies para mostrar y medir anuncios. Solo se cargan después de tu aceptación.'],
        ['Cómo cambiar tu elección', 'Pulsa "Preferencias de publicidad" al pie de cualquier página. También puedes borrar las cookies desde los ajustes de tu navegador.'],
        ['Más información', 'Cómo usa Google los datos: policies.google.com/technologies/partner-sites.']
      ]]
    };
    const p = paginas[tipo];
    document.title = `${p[0]} · Albero`;
    return `<article class="detalle"><h1>${p[0]}</h1><div class="texto">${p[1].map(([t, x]) => `<h2>${t}</h2><p>${x}</p>`).join('')}</div></article>`;
  }
  function noEncontrado() {
    document.title = 'No encontrado · Albero';
    return `<div class="pagina-cab"><h1 class="titulo-pagina">No encontramos esa página</h1><p class="bajada">Puede que el plan haya terminado o que el enlace esté mal.</p><div class="acciones"><a class="boton" href="#/agenda">Ir a la agenda</a></div></div>`;
  }

  /* ---------- Router ---------- */
  function ruta() {
    const partes = (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean).map(decodeURIComponent);
    const [sec, id] = partes;
    let html;
    document.title = 'Albero · Cultura y mesa en Sevilla';
    switch (sec) {
      case undefined: html = vistaInicio(); break;
      case 'agenda': html = id ? vistaEvento(id) : vistaAgenda(); if (!id) document.title = 'Agenda cultural · Albero'; break;
      case 'comer': html = id ? vistaLugar(id) : vistaComer(); if (!id) document.title = 'Comer y beber · Albero'; break;
      case 'reportajes': html = id ? vistaReportaje(id) : vistaReportajes(); if (!id) document.title = 'Reportajes · Albero'; break;
      case 'barrios': html = vistaBarrios(); document.title = 'Barrios · Albero'; break;
      case 'barrio': html = vistaBarrio(id); break;
      case 'aviso-legal': case 'privacidad': case 'cookies': html = vistaLegal(sec); break;
      default: html = noEncontrado();
    }
    const main = $('#contenido');
    main.innerHTML = html;
    document.querySelectorAll('.menu a').forEach((a) => {
      const activo = a.dataset.nav === sec || (sec === 'barrio' && a.dataset.nav === 'barrios');
      if (activo) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    $('#ad-pie').innerHTML = ad('pie');
    if (!ruta.primera) { window.scrollTo(0, 0); }
    ruta.primera = false;
    iniciarAds();
  }
  ruta.primera = true;

  /* Filtros: actualizan solo la lista para no perder el foco */
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('.chip[data-f]'); if (!b) return;
    const caja = b.closest('.filtros'); const sec = caja.id === 'filtros-agenda' ? 'agenda' : 'comer';
    F[sec][b.dataset.f] = b.dataset.v;
    caja.querySelectorAll(`.chip[data-f="${b.dataset.f}"]`).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    refrescar(sec);
  });
  document.addEventListener('change', (ev) => {
    const s = ev.target.closest('select[data-f]'); if (!s) return;
    const sec = s.closest('.filtros').id === 'filtros-agenda' ? 'agenda' : 'comer';
    F[sec][s.dataset.f] = s.value; refrescar(sec);
  });
  function refrescar(sec) {
    $(`#resultado-${sec}`).innerHTML = sec === 'agenda' ? listaAgenda(filtrarEventos()) : gridLugares(filtrarLugares());
    iniciarAds();
  }

  /* ---------- Arranque ---------- */
  async function cargar(ruta) {
    const r = await fetch(ruta, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`${ruta}: ${r.status}`);
    return r.json();
  }
  async function iniciar() {
    try {
      const [cfg, eventos, lugares, reportajes] = await Promise.all([
        cargar('data/config.json'), cargar('data/eventos.json'), cargar('data/gastronomia.json'), cargar('data/reportajes.json')
      ]);
      Object.assign(D, { cfg, eventos, lugares, reportajes });
    } catch (err) {
      const local = location.protocol === 'file:';
      $('#contenido').innerHTML = `<div class="pagina-cab"><h1 class="titulo-pagina">No se pudo cargar la programación</h1><p class="bajada">${local
        ? 'Estás abriendo la web directamente desde el disco y el navegador no permite leer los datos así. Abre <strong>vista-previa.html</strong>, o ejecuta <code>python3 -m http.server 8000</code> en esta carpeta y entra en http://localhost:8000.'
        : 'Revisa tu conexión y recarga la página. Si el problema continúa, puede haber un error en los datos.'}</p></div>`;
      console.error(err); return;
    }
    HOY = D.cfg.fecha_demo || iso(new Date());
    $('#fecha-hoy').textContent = cap(fmt(HOY, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    $('#lema').textContent = D.cfg.lema || '';
    $('#franja').innerHTML = azulejo('franja', [C.cobalto, C.albero, C.cal], 80, 2);
    $('#franja svg').setAttribute('preserveAspectRatio', 'xMidYMid slice');
    $('#cookies-si').addEventListener('click', () => decidir('si'));
    $('#cookies-no').addEventListener('click', () => decidir('no'));
    $('#abrir-cookies').addEventListener('click', (e) => { e.preventDefault(); if (anuncios().adsense_client) $('#cookies').hidden = false; });
    window.addEventListener('hashchange', ruta);
    banner();
    ruta();
  }
  iniciar();
})();

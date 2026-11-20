# Albero · revista digital de Sevilla

Web estática: agenda cultural, guía gastronómica, reportajes y barrios. No tiene backend. El navegador lee los archivos de `data/` y pinta la revista. Se despliega sola en GitHub Pages cada vez que cambia algo en `main`.

## Subirla a GitHub y publicarla

1. Crea un repositorio vacío en GitHub (por ejemplo `albero`). Si va a llevar tráfico real, mejor privado y publicar con un dominio propio.
2. Desde esta carpeta:

        git init -b main
        git add .
        git commit -m "Primera versión de Albero"
        git remote add origin https://github.com/TU_USUARIO/albero.git
        git push -u origin main

3. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. La pestaña **Actions** ejecutará "Publicar la web". En un par de minutos tendrás la URL en `https://TU_USUARIO.github.io/albero/`.

GitHub Pages en repositorios privados necesita un plan de pago (Pro, Team o Enterprise). En plan gratuito el repositorio debe ser público.

## Antes de publicar de verdad

- [ ] `data/config.json`: pon `"fecha_demo": ""` (ahora fija el día 20/11/2026 para que se vea el contenido de muestra).
- [ ] `data/config.json > legal`: rellena titular, NIF, domicilio y correo. Alimentan el aviso legal, la política de privacidad y la de cookies. Son textos de partida: pásalos por un profesional antes de monetizar.
- [ ] Sustituye los JSON de muestra por contenido real. Los eventos, locales y reportajes actuales son inventados.
- [ ] `data/config.json > url_base`: tu dominio real.
- [ ] Publicidad: ver la sección siguiente.

## Probarla en local

La forma más rápida: abre `vista-previa.html` con doble clic (web completa en un solo archivo). Se genera con `node scripts/vista-previa.js`; vuelve a ejecutarlo si cambias los datos. No se sube a GitHub.

`index.html` no funciona con doble clic, porque los navegadores no dejan leer JSON desde un archivo suelto. Para usarlo en local, sirve la carpeta:

    python3 -m http.server 8000      # abre http://localhost:8000

## Estructura

    index.html              página única; rutas con #/agenda, #/comer, #/reportajes, #/barrios
    css/styles.css          diseño
    js/azulejos.js          generador de azulejos y diseño fijo por categoría
    js/app.js               carga de JSON, rutas, filtros, publicidad, páginas legales
    data/config.json        nombre, datos legales, anuncios
    data/eventos.json       agenda cultural
    data/gastronomia.json   sitios para comer y beber
    data/reportajes.json    artículos
    img/patrones/           SVG de cada azulejo (portada y mosaico), para la app o para fondos
    docs/patrones.html      catálogo visual de los azulejos
    scripts/validar.js      valida los JSON (se ejecuta antes de cada despliegue)
    scripts/exportar-patrones.js   regenera img/patrones
    scripts/vista-previa.js        genera vista-previa.html (un solo archivo, se abre con doble clic)
    .github/workflows/publicar.yml despliegue automático
    robots.txt, ads.txt     ver "Publicidad"

## Esquema de los JSON (lo que debe generar la app Android)

**eventos.json** (lista)

    id (único, minúsculas y guiones) · titulo · categoria (musica|teatro|flamenco|exposicion|cine|danza|festival|familia|fotografia)
    fecha "AAAA-MM-DD" · fecha_fin (opcional) · hora "HH:MM" · lugar · barrio · precio
    resumen · descripcion [párrafos] · url_entradas (https) · imagen (https, opcional)
    destacado (bool, sale en portada) · patrocinado (bool, muestra la etiqueta)

**gastronomia.json** (lista)

    id · nombre · tipo (tapas|restaurante|mercado|dulces|copas) · barrio · direccion · precio ("€".."€€€")
    resumen · descripcion [párrafos] · platos [texto] · web · imagen · nuevo (bool) · patrocinado (bool)

**reportajes.json** (lista)

    id · titulo · categoria · fecha · autor · resumen · imagen
    cuerpo [ {t:"p"|"h2"|"quote", text:"..."} ]

Sin `imagen`, cada elemento muestra el azulejo de su categoría. Todo el texto se escapa al pintarlo, así que un JSON no puede inyectar HTML.

Para comprobar los datos antes de subirlos: `node scripts/validar.js`. El despliegue ejecuta esta misma validación y se detiene si hay un error, de modo que un JSON roto no llega a la web.

## Publicar desde la app Android

La app edita los JSON con la API de contenidos de GitHub:

    GET  /repos/{usuario}/{repo}/contents/data/eventos.json     → devuelve content (base64) y sha
    PUT  /repos/{usuario}/{repo}/contents/data/eventos.json     → body: message, content (base64), sha, branch

- Usa un token de acceso fino limitado a este repositorio y al permiso *Contents: read and write*.
- Cada commit lanza el despliegue y la web se actualiza en 1-2 minutos.
- Las imágenes se suben igual a una carpeta `img/` o a un servicio como Cloudinary, y se guarda la URL en el JSON.
- No incluyas el token en una app que distribuyas públicamente: úsala solo como herramienta interna o añade inicio de sesión.

## Publicidad

En `data/config.json > anuncios`:

- `adsense_client`: tu ID `ca-pub-XXXXXXXXXXXXXXXX`. Vacío = solo se ven huecos de reserva.
- `slots`: un ID de bloque de AdSense por zona (cabecera, lateral, infeed, pie).
- `mostrar_reservas`: ponlo en `false` en producción para ocultar los huecos vacíos.
- Los anuncios solo se cargan si el lector pulsa "Aceptar" en el aviso de cookies.
- Los elementos con `"patrocinado": true` son publicidad directa y no dependen de AdSense.
- `ads.txt` y `robots.txt` deben estar en la raíz del dominio. Con una URL tipo `usuario.github.io/albero/` no cumplen esa condición: necesitas un dominio propio (Settings → Pages → Custom domain).
- Para tráfico del Espacio Económico Europeo, Google exige un gestor de consentimiento (CMP) certificado. El aviso incluido es básico y no sustituye a uno.
- AdSense revisa el sitio antes de aprobarlo: necesita contenido propio suficiente y las páginas legales rellenas.

## Límites conocidos

- **SEO.** La web se pinta en el navegador y las rutas usan `#`, por lo que Google no indexa cada evento como página propia. Para posicionar en buscadores, el siguiente paso es un paso de compilación (Astro o Eleventy) que genere una página HTML por elemento a partir de estos mismos JSON.
- **Tamaño de los datos.** Un solo `eventos.json` crecerá con los meses. Cuando pase de unos cientos de eventos, archívalo por año.
- **Mapa.** No hay mapa interactivo; los barrios hacen de navegación geográfica.

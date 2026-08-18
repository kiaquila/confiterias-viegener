/* Renders the complete static page from `content.js`.

   The page is one Spanish document with no framework runtime: every string is
   in the HTML the visitor receives, so it reads with JavaScript switched off
   and a crawler sees the same words a customer does. The only script the page
   ships marks the active nav link while scrolling — nothing on the page
   depends on it. */

import {
  business,
  content,
  images,
  links,
  locations,
  mapsSearch
} from "./content.js";

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

/* --- images ---------------------------------------------------------------

   Every photo ships as WebP with a JPEG fallback at the same widths, so the
   page pulls no image CDN and still sends a phone a phone-sized file. */

const srcset = (name, extension) =>
  images[name].widths
    .map((width) => `assets/${name}-${width}.${extension} ${width}w`)
    .join(", ");

/** `sizes` describes the slot's rendered width, not the file's. */
function picture(name, alt, { className = "", sizes, loading = "lazy" } = {}) {
  const config = images[name];
  if (!config) throw new Error(`Unknown image slot: ${name}`);
  const widest = config.widths.at(-1);
  const [w, h] = config.ratio;
  const cls = className ? ` class="${className}"` : "";
  return (
    "<picture>" +
    `<source type="image/webp" srcset="${srcset(name, "webp")}" sizes="${sizes}">` +
    `<img${cls} src="assets/${name}-${widest}.jpg" srcset="${srcset(name, "jpg")}"` +
    ` sizes="${sizes}" width="${w * 100}" height="${h * 100}"` +
    ` alt="${escapeHtml(alt)}" loading="${loading}"` +
    ` decoding="${loading === "eager" ? "sync" : "async"}">` +
    "</picture>"
  );
}

/* --- pieces reused across sections ---------------------------------------- */

const arrow = (glyph) => `<span aria-hidden="true">${glyph}</span>`;

/** A mailto link that arrives with the subject already written, so an enquiry
 *  from the Pastelería card is not indistinguishable from any other. */
const mailto = (subject) =>
  `mailto:${links.email}?subject=${encodeURIComponent(subject)}`;

const textLink = (href, label, { className = "", glyph = "↗", external = false } = {}) =>
  `<a class="text-link${className ? ` ${className}` : ""}" href="${href}"` +
  (external ? ' target="_blank" rel="noopener noreferrer"' : "") +
  `>${escapeHtml(label)} ${arrow(glyph)}</a>`;

/* --- sections ------------------------------------------------------------- */

const renderTopNote = () => `
    <div class="top-note">
      <span>${escapeHtml(content.topNote.text)}</span>
      <span class="top-note-separator" aria-hidden="true">•</span>
      <a href="#locales">${escapeHtml(content.topNote.linkLabel)}</a>
    </div>`;

const renderHeader = () => `
    <header class="site-header">
      <a class="brand" href="#inicio" aria-label="${escapeHtml(business.shortName)}, ir al inicio">
        <span class="brand-mark" role="img" aria-label="${escapeHtml(business.name)}"></span>
      </a>
      <nav aria-label="Navegación principal">
        ${content.nav
          .map((item) => `<a href="${item.href}">${escapeHtml(item.label)}</a>`)
          .join("\n        ")}
      </nav>
      <a class="button button-small" href="#pedidos">${escapeHtml(content.cta.header)}</a>
    </header>`;

const renderHero = () => {
  const { hero } = content;
  return `
    <section class="hero" id="inicio">
      ${picture(hero.image, hero.imageAlt, {
        className: "hero-image",
        sizes: "100vw",
        loading: "eager"
      })}
      <div class="hero-shade" aria-hidden="true"></div>
      <div class="hero-content">
        <p class="eyebrow light">${escapeHtml(hero.eyebrow)}</p>
        <h1>${escapeHtml(hero.heading)}</h1>
        <p class="hero-copy">${escapeHtml(hero.copy)}</p>
        <div class="hero-actions">
          <a class="button button-light" href="#pedidos">${escapeHtml(content.cta.hero)}</a>
          ${textLink("#especialidades", content.cta.heroSecondary, {
            className: "light-link",
            glyph: "↓"
          })}
        </div>
      </div>
      <dl class="hero-proof" aria-label="${escapeHtml(hero.proofLabel)}">
        ${hero.proof
          .map(
            (item) =>
              `<div><dt>${escapeHtml(item.value)}</dt><dd>${escapeHtml(item.label)}</dd></div>`
          )
          .join("\n        ")}
      </dl>
    </section>`;
};

const renderCategories = () => {
  const { categories } = content;
  return `
    <section class="intro section-pad" id="especialidades">
      <div class="section-heading">
        <div>
          <p class="eyebrow">${escapeHtml(categories.eyebrow)}</p>
          <h2>${escapeHtml(categories.heading)}</h2>
        </div>
        <p>${escapeHtml(categories.lead)}</p>
      </div>
      <div class="category-grid">
        ${categories.items
          .map(
            (item) => `<article class="category-card">
          <div class="category-image-wrap">
            ${picture(item.image, item.alt, {
              sizes: "(max-width: 760px) 100vw, (max-width: 1080px) 50vw, 25vw"
            })}
          </div>
          <div class="category-copy">
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.copy)}</p>
            ${textLink(mailto(`Consulta — ${item.title}`), content.cta.categories)}
          </div>
        </article>`
          )
          .join("\n        ")}
      </div>
      <div class="menu-line">
        <span>${escapeHtml(categories.alsoLabel)}</span>
        <p>${escapeHtml(categories.also)}</p>
        <a href="${mailto("Consulta — variedad completa")}">${escapeHtml(content.cta.menuLine)}</a>
      </div>
    </section>`;
};

const renderSignatures = () => {
  const { signatures } = content;
  return `
    <section class="signatures section-pad">
      <div class="signature-image">
        ${picture(signatures.image, signatures.imageAlt, {
          sizes: "(max-width: 760px) 100vw, 52vw"
        })}
        <span class="image-note">${escapeHtml(signatures.imageNote)}</span>
      </div>
      <div class="signature-content">
        <p class="eyebrow">${escapeHtml(signatures.eyebrow)}</p>
        <h2>${escapeHtml(signatures.heading)}</h2>
        <p class="signature-lead">${escapeHtml(signatures.lead)}</p>
        <ol class="signature-list">
          ${signatures.items
            .map(
              (item, index) => `<li>
            <span>${String(index + 1).padStart(2, "0")}</span>
            <div>
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.copy)}</p>
            </div>
          </li>`
            )
            .join("\n          ")}
        </ol>
        <a class="button button-dark" href="#pedidos">${escapeHtml(content.cta.signatures)}</a>
      </div>
    </section>`;
};

const renderCatering = () => {
  const { catering } = content;
  return `
    <section class="catering section-pad" id="catering">
      <div class="catering-title">
        <p class="eyebrow light">${escapeHtml(catering.eyebrow)}</p>
        <h2>${escapeHtml(catering.heading)}</h2>
      </div>
      <div class="catering-details">
        <p>${escapeHtml(catering.copy)}</p>
        <ul>
          ${catering.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n          ")}
        </ul>
        <a class="button button-gold" href="${mailto("Presupuesto — lunch & catering")}">${escapeHtml(
          content.cta.catering
        )}</a>
      </div>
    </section>`;
};

const renderHeritage = () => {
  const { heritage } = content;
  return `
    <section class="heritage section-pad" id="historia">
      <div class="heritage-copy">
        <p class="eyebrow">${escapeHtml(heritage.eyebrow)}</p>
        <h2>${escapeHtml(heritage.heading)}</h2>
        ${heritage.paragraphs.map((text) => `<p>${escapeHtml(text)}</p>`).join("\n        ")}
        ${textLink(links.lanacion, heritage.sourceLabel, { external: true })}
      </div>
      <div class="heritage-gallery">
        ${picture(heritage.mainImage, heritage.mainAlt, {
          className: "heritage-main",
          sizes: "(max-width: 760px) 80vw, 40vw"
        })}
        ${picture(heritage.smallImage, heritage.smallAlt, {
          className: "heritage-small",
          sizes: "(max-width: 760px) 55vw, 28vw"
        })}
        <p class="heritage-seal">
          <strong>${business.yearsOfTradition}+</strong>
          <span>${escapeHtml(heritage.sealLabel)}</span>
        </p>
      </div>
    </section>`;
};

const renderLocations = () => `
    <section class="locations section-pad" id="locales">
      <div class="locations-heading">
        <p class="eyebrow light">${escapeHtml(content.locations.eyebrow)}</p>
        <h2>${escapeHtml(content.locations.heading)}</h2>
      </div>
      <div class="location-grid">
        ${locations
          .map(
            (place) => `<article>
          <p class="location-kicker">${escapeHtml(place.kicker)}</p>
          <h3>${escapeHtml(place.name)}</h3>
          <address>${escapeHtml(place.street)}<br>${escapeHtml(place.city)}</address>
          <p class="hours">${place.hours.map(escapeHtml).join("<br>")}</p>
          <div class="location-actions">
            <a href="${place.phoneHref}">${escapeHtml(place.phoneLabel)}</a>
            <a href="${mapsSearch(
              `${business.name} ${place.street} ${place.city}`
            )}" target="_blank" rel="noopener noreferrer">${escapeHtml(
              content.locations.directions
            )} ${arrow("↗")}</a>
          </div>
        </article>`
          )
          .join("\n        ")}
      </div>
    </section>`;

const renderOrder = () => `
    <section class="order-section" id="pedidos">
      <div>
        <p class="eyebrow">${escapeHtml(content.order.eyebrow)}</p>
        <h2>${escapeHtml(content.order.heading)}</h2>
        <p>${escapeHtml(content.order.copy)}</p>
      </div>
      <div class="order-actions">
        ${locations
          .map(
            (place, index) =>
              `<a class="button ${
                index === 0 ? "button-dark" : "button-outline"
              }" href="${place.phoneHref}">${escapeHtml(
                `${content.order.callPrefix} ${place.name}`
              )}</a>`
          )
          .join("\n        ")}
        ${textLink(mailto("Consulta general"), content.order.email)}
      </div>
    </section>`;

const renderFooter = () => `
    <footer>
      <div class="footer-brand">
        <span class="brand-mark" role="img" aria-label="${escapeHtml(business.name)}"></span>
        <p>${escapeHtml(content.footer.tagline)}</p>
      </div>
      <div>
        <span>${escapeHtml(content.footer.contactLabel)}</span>
        <a href="mailto:${links.email}">${escapeHtml(links.email)}</a>
        <a href="${links.instagram}" target="_blank" rel="noopener noreferrer">${escapeHtml(
          links.instagramHandle
        )}</a>
      </div>
      <div>
        <span>${escapeHtml(content.footer.navLabel)}</span>
        ${content.footer.nav
          .map((item) => `<a href="${item.href}">${escapeHtml(item.label)}</a>`)
          .join("\n        ")}
      </div>
      <p class="copyright">© ${new Date().getFullYear()} ${escapeHtml(business.name)}</p>
    </footer>`;

/* --- document ------------------------------------------------------------- */

export function renderPage(origin) {
  const { meta } = content;
  return `<!doctype html>
<html lang="${meta.lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(meta.title)}</title>
  <meta name="description" content="${escapeHtml(meta.description)}">
  <link rel="canonical" href="${origin}/">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(meta.title)}">
  <meta property="og:description" content="${escapeHtml(meta.description)}">
  <meta property="og:url" content="${origin}/">
  <meta property="og:image" content="${origin}/assets/og.jpg">
  <meta property="og:image:alt" content="${escapeHtml(meta.ogAlt)}">
  <meta property="og:locale" content="es_AR">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#253f33">
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
  <link rel="stylesheet" href="assets/styles.css">
</head>
<body>
  <a class="skip-link" href="#inicio">Saltar al contenido</a>
  <main>
${renderTopNote()}
${renderHeader()}
${renderHero()}
${renderCategories()}
${renderSignatures()}
${renderCatering()}
${renderHeritage()}
${renderLocations()}
${renderOrder()}
${renderFooter()}
    <a class="mobile-order" href="#pedidos">${escapeHtml(content.cta.mobile)} ${arrow("→")}</a>
  </main>
  <script src="assets/site.js" defer></script>
</body>
</html>
`;
}

export function renderNotFound(origin) {
  const { meta } = content;
  return `<!doctype html>
<html lang="${meta.lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Página no encontrada | ${escapeHtml(business.name)}</title>
  <meta name="robots" content="noindex">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/styles.css">
</head>
<body class="error-page">
  <main>
    <p class="eyebrow">Error 404</p>
    <h1>Esta página no existe.</h1>
    <p>Puede que el enlace haya cambiado. Volvé al inicio para encontrar lo que buscabas.</p>
    <a class="button button-dark" href="${origin}/">Ir al inicio</a>
  </main>
</body>
</html>
`;
}

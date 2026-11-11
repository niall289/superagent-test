#!/usr/bin/env node
/**
 * Deterministic Section Slicer (Node)
 * Slices target sections (header, promo banner, hero, logo-carousel, before-after)
 * VERBATIM from business-os/workspaces/clones/modal/raw/<slug>/view/index.html
 * with matched CSS rules, local WOFF2 fonts, and local SVGs/images.
 * Parameterizes ONLY brand colours, fonts, copy, and media slots via JSON fixtures.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const RAW_ROOT = path.join(ROOT, 'business-os/workspaces/clones/modal/raw');
const OUT_DIR = path.join(ROOT, 'preview/sections');
const OUT_CSS_DIR = path.join(OUT_DIR, 'css');
const OUT_ASSETS_DIR = path.join(OUT_DIR, 'assets');

fs.mkdirSync(OUT_CSS_DIR, { recursive: true });
fs.mkdirSync(OUT_ASSETS_DIR, { recursive: true });

// 1. Copy all needed assets from plumbing-fdd41869, electrical-c5f445f5, fencing-710ae83c
function copyCloneAssets(slug, filterFn = () => true) {
  const srcAssets = path.join(RAW_ROOT, slug, 'assets');
  if (!fs.existsSync(srcAssets)) return 0;
  let copied = 0;
  for (const file of fs.readdirSync(srcAssets)) {
    if (!filterFn(file)) continue;
    const srcFile = path.join(srcAssets, file);
    const destFile = path.join(OUT_ASSETS_DIR, file);
    if (fs.statSync(srcFile).isFile()) {
      fs.copyFileSync(srcFile, destFile);
      copied++;
    }
  }
  return copied;
}

// Generate dark-ink vector SVG logo for Fully Wired on light header background
function buildFullyWiredDarkLogo() {
  const svgPath = path.join(RAW_ROOT, 'electrical-c5f445f5/assets/3582a16bf2074440.svg');
  let svg = fs.readFileSync(svgPath, 'utf8');
  // In 3582a16bf2074440.svg, .cls-1 is #e8f1f2 (white text for dark navbar) and .cls-4 is radial gradient for D.
  // Replace with crisp dark navy #0f172a so "FULLY WIRED" is 100% legible on the white site-header.
  svg = svg
    .replace('.cls-1{fill:#e8f1f2;}', '.cls-1{fill:#0f172a;}')
    .replace('.cls-4{fill:url(#New_Gradient_Swatch_copy_10);}', '.cls-4{fill:#0f172a;}')
    .replace(/stop-color="#0cac8c"/g, 'stop-color="#0b7a62"')
    .replace(/stop-color="#36f1cd"/g, 'stop-color="#0cac8c"');
  fs.writeFileSync(path.join(OUT_ASSETS_DIR, 'fully-wired-logo-dark.svg'), svg, 'utf8');
}

// 2. Copy and parameterize CSS from plumbing-fdd41869/view/css
function processPlumbingCss() {
  const srcCssDir = path.join(RAW_ROOT, 'plumbing-fdd41869/view/css');
  const cssFiles = ['216db5f36268.css', '02fde0c550dc.css', '178bc5fc7187.css', '2f7df68d5aea.css', 'be0993d89a43.css', '2d497bea42cd.css'];

  for (const file of cssFiles) {
    const fullPath = path.join(srcCssDir, file);
    if (!fs.existsSync(fullPath)) continue;
    let css = fs.readFileSync(fullPath, 'utf8');

    // Rewrite relative asset paths from ../../assets/ to ../assets/
    css = css.replace(/\.\.\/\.\.\/assets\//g, '../assets/');

    // Strip external @import url("https://p.typekit.net/...") tracker ping so offline load is instantaneous
    css = css.replace(/@import url\("https:\/\/p\.typekit\.net[^)]+\);\s*/g, '');

    if (file === '216db5f36268.css') {
      // Also register Sora local WOFF2 font for parameterized electrical trade fixture
      css += `\n@font-face {\n  font-family: "Sora";\n  src: url("../assets/93f322133a56cd58.woff2") format("woff2");\n  font-weight: 100 800;\n  font-style: normal;\n  font-display: swap;\n}\n`;
    }

    if (file === '2f7df68d5aea.css') {
      // Parameterize ONLY brand colours and font stack with fallback to exact original Pimlico tokens
      css = css
        .replace(/#28348a\b/gi, 'var(--brand-primary, #28348a)')
        .replace(/#182266\b/gi, 'var(--brand-primary-hover, #182266)')
        .replace(/#ed1b2f\b/gi, 'var(--brand-accent, #ed1b2f)')
        .replace(/#d1001c\b/gi, 'var(--brand-accent-hover, #d1001c)')
        .replace(/#091842\b/gi, 'var(--brand-dark, #091842)')
        .replace(/#071843\b/gi, 'var(--brand-dark-alt, #071843)')
        .replace(/#00b67a\b/gi, 'var(--brand-usp-icon, #00b67a)')
        .replace(/'sofia-pro'/g, "var(--brand-font, 'sofia-pro')");
    }

    fs.writeFileSync(path.join(OUT_CSS_DIR, file), css, 'utf8');
  }
}

// 3. Extract verbatim sections from plumbing-fdd41869/view/index.html
function extractPlumbingVerbatimDom() {
  const htmlPath = path.join(RAW_ROOT, 'plumbing-fdd41869/view/index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Extract inline Font Awesome and theme <style> blocks from <head>
  const headPart = html.slice(0, html.indexOf('</head>'));
  const inlineStyles = (headPart.match(/<style[\s\S]*?<\/style>/g) || []).join('\n');

  // Extract <header class="site-header">...</header> verbatim
  const headerStart = html.indexOf('<header class="site-header"');
  const headerEnd = html.indexOf('</header>', headerStart) + '</header>'.length;
  const headerHtml = html.slice(headerStart, headerEnd);

  // Extract <div aria-label="Site banners" ... class="discount-banners ..."> verbatim
  const bannerRibbonStart = html.indexOf('<div aria-label="Site banners"');
  const bannerRibbonEnd = html.indexOf('<div class="offcanvas offcanvas-start', bannerRibbonStart);
  const bannerRibbonHtml = html.slice(bannerRibbonStart, bannerRibbonEnd).trim();

  // Extract <section class="acf-component acf-component--banner acf-component--banner--home"> and <section class="acf-component acf-component--logo-carousel mt-sm mb-xs"> verbatim
  const heroStart = html.indexOf('<section class="acf-component acf-component--banner acf-component--banner--home">');
  const carouselStart = html.indexOf('<section class="acf-component acf-component--logo-carousel mt-sm mb-xs">', heroStart);
  const carouselEnd = html.indexOf('</section>', carouselStart) + '</section>'.length;
  const heroAndCarouselHtml = html.slice(heroStart, carouselEnd);

  return { inlineStyles, headerHtml, bannerRibbonHtml, heroAndCarouselHtml };
}

// Deterministic offline SVG replacement for the external Trustpilot 5419b732fbfb950b10de65e5 Micro Star iframe
function buildTrustpilotMicroStarWidget(label = 'Excellent') {
  return `<div class="trustpilot-widget" data-businessunit-id="4bded89a000064000506c4b6" data-locale="en-GB" data-style-height="24px" data-style-width="100%" data-template-id="5419b732fbfb950b10de65e5" data-theme="dark" data-trustpilot-state="loaded" style="min-height: 24px; position: relative; display: flex; align-items: center;">
    <svg width="262" height="24" viewBox="0 0 262 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label} 4.8 out of 5 on Trustpilot">
      <text x="0" y="17" fill="#ffffff" font-family="sofia-pro, Arial, sans-serif" font-size="15" font-weight="500" text-decoration="underline">${label}</text>
      <g transform="translate(74, 2)">
        <rect x="0" y="0" width="20" height="20" fill="#00b67a"/>
        <path d="M10 3.5L11.9 8.1H16.8L12.8 10.9L14.3 15.6L10 12.7L5.7 15.6L7.2 10.9L3.2 8.1H8.1L10 3.5Z" fill="#ffffff"/>
        <rect x="22" y="0" width="20" height="20" fill="#00b67a"/>
        <path d="M32 3.5L33.9 8.1H38.8L34.8 10.9L36.3 15.6L32 12.7L27.7 15.6L29.2 10.9L25.2 8.1H30.1L32 3.5Z" fill="#ffffff"/>
        <rect x="44" y="0" width="20" height="20" fill="#00b67a"/>
        <path d="M54 3.5L55.9 8.1H60.8L56.8 10.9L58.3 15.6L54 12.7L49.7 15.6L51.2 10.9L47.2 8.1H52.1L54 3.5Z" fill="#ffffff"/>
        <rect x="66" y="0" width="20" height="20" fill="#00b67a"/>
        <path d="M76 3.5L77.9 8.1H82.8L78.8 10.9L80.3 15.6L76 12.7L71.7 15.6L73.2 10.9L69.2 8.1H74.1L76 3.5Z" fill="#ffffff"/>
        <rect x="88" y="0" width="10" height="20" fill="#00b67a"/>
        <rect x="98" y="0" width="10" height="20" fill="#dcdce6"/>
        <path d="M98 3.5L99.9 8.1H104.8L100.8 10.9L102.3 15.6L98 12.7L93.7 15.6L95.2 10.9L91.2 8.1H96.1L98 3.5Z" fill="#ffffff"/>
      </g>
      <g transform="translate(192, 4)">
        <path d="M8 0L10.1 6.2H16.6L11.3 10L13.3 16.2L8 12.4L2.7 16.2L4.7 10L-0.6 6.2H5.9L8 0Z" fill="#00b67a"/>
        <text x="20" y="13" fill="#ffffff" font-family="sofia-pro, Arial, sans-serif" font-size="12.5" font-weight="600">Trustpilot</text>
      </g>
    </svg>
  </div>`;
}

// 4. Apply JSON fixture to verbatim DOM without changing a single layout class or box-model rule
function renderParameterizedSection(verbatim, fixture) {
  const { slots, tokens } = fixture;
  let header = verbatim.headerHtml;
  let ribbon = verbatim.bannerRibbonHtml;
  let heroAndCarousel = verbatim.heroAndCarouselHtml;

  // Rewrite ../assets/ to assets/ since output HTML sits in preview/sections/
  header = header.replace(/\.\.\/assets\//g, 'assets/');
  ribbon = ribbon.replace(/\.\.\/assets\//g, 'assets/');
  heroAndCarousel = heroAndCarousel.replace(/\.\.\/assets\//g, 'assets/');

  // Slot 1: Logo & alt in desktop + mobile header
  header = header
    .replace(/src="assets\/755505f561936735\.svg"/g, `src="${slots.logoSrc}"`)
    .replace(/alt="Pimlico Plumbers - Property Maintenance Services in London"/g, `alt="${slots.logoAlt}"`)
    .replace(/aria-label="Pimlico Plumbers - Property Maintenance Services in London"/g, `aria-label="${slots.logoAlt}"`);

  // Slot 2: Header tagline
  header = header.replace(
    /<p class="header-tagline text-primary mb-0">[\s\S]*?<\/p>/,
    `<p class="header-tagline text-primary mb-0">${slots.tagline}</p>`
  );

  // Slot 3: Emergency label & phone number
  // Unwrap Mediahawk's client-injected duplicate <a href="tel:..."> nested inside outer <a href="tel:..."> so HTML5 parser does not split the anchor tag
  header = header
    .replace(/<a href="tel:02045273790">020 4527 3790<\/a>/g, '020 4527 3790')
    .replace(/<span>24hrs &amp; emergencies<\/span>/g, `<span>${slots.emergencyLabel}</span>`)
    .replace(/href="tel:02045273790"/g, `href="${slots.phoneHref}"`)
    .replace(/>020 4527 3790</g, `>${slots.phoneDisplay}<`)
    .replace(/--header-phone-button-bg:\s*#ed1b2f/g, `--header-phone-button-bg: var(--brand-accent, #ed1b2f)`);

  // Slot 4: Top-level mega-menu nav trigger labels (7 items)
  if (Array.isArray(slots.navItems) && slots.navItems.length === 7) {
    let navIdx = 0;
    header = header.replace(
      /(<button[^>]*class="mega-menu__item-trigger link-has-arrow"[^>]*>)([\s\S]*?)(<\/button>)/g,
      (match, open, text, close) => {
        const replacement = slots.navItems[navIdx] || text.trim();
        navIdx++;
        return `${open}\n                        ${replacement}                    ${close}`;
      }
    );
  }

  // Slot 5: Discount / announcement banner ribbon
  // Fix Splide static transform from -2880px to -200% so slide01 is centered at ANY viewport width without Splide JS
  ribbon = ribbon.replace('transform: translateX(-2880px);', 'transform: translateX(-200%);');
  ribbon = ribbon.replace(
    /(id="splide03-slide01"[\s\S]*?<div class="discount-banner__content-text desktop text-wrapper">\s*<p>)(?:<a[^>]*>)?([\s\S]*?)(?:<\/a>)?(<\/p>[\s\S]*?<div class="discount-banner__content-text mobile text-wrapper">\s*<p>)(?:<a[^>]*>)?([\s\S]*?)(?:<\/a>)?(<\/p>)/,
    `$1<a href="#offer">${slots.promoBannerDesktopHtml}</a>$3<a href="#offer">${slots.promoBannerMobileHtml}</a>$5`
  );

  // Slot 6: Hero background images (desktop <source> + mobile/fallback <img>)
  heroAndCarousel = heroAndCarousel
    .replace(/assets\/746096b3f0ff7a7a\.jpeg/g, slots.heroDesktopSrc)
    .replace(/assets\/d65a5275310825fc\.jpeg/g, slots.heroMobileSrc);

  // Slot 7: Replace external Trustpilot iframe with deterministic inline SVG Micro Star widget
  heroAndCarousel = heroAndCarousel.replace(
    /<div class="trustpilot-widget"[\s\S]*?<\/iframe><\/div>/,
    buildTrustpilotMicroStarWidget(slots.trustpilotLabel || 'Excellent')
  );

  // Slot 8: Hero H1 and subtitle
  heroAndCarousel = heroAndCarousel.replace(
    /<h1 class="acf-component--banner__heading display-1">[\s\S]*?<\/h1>/,
    `<h1 class="acf-component--banner__heading display-1">${slots.h1Html}</h1>`
  );
  heroAndCarousel = heroAndCarousel.replace(
    /(<div class="acf-component--banner__text top text-wrapper">\s*<p>)[\s\S]*?(<\/p>\s*<\/div>)/,
    `$1${slots.subtitle}$2`
  );

  // Slot 9: Form prompt, <select> options, rolling display span, and CTA button text
  const optionsHtml = [
    `<option disabled="" selected="" value="">Please select...</option>`,
    ...slots.services.map(
      (s) => `<option value="${s}">\n                                                        ${s}                                                    </option>`
    ),
  ].join('\n');

  heroAndCarousel = heroAndCarousel.replace(
    /(<select[^>]*class="acf-component--banner__form-select[^"]*"[^>]*>)[\s\S]*?(<\/select>)/,
    `$1\n${optionsHtml}\n$2`
  );

  // Set initial display text directly inside .acf-component--banner__form-select-display (preserving exact verbatim DOM so .bg-dark * { color:#fff } does not override color: var(--brand-accent) !important)
  heroAndCarousel = heroAndCarousel.replace(
    /<span aria-hidden="true" class="acf-component--banner__form-select-display js-banner-form-select-display">[\s\S]*?<\/span>/,
    `<span aria-hidden="true" class="acf-component--banner__form-select-display js-banner-form-select-display">${slots.initialServiceDisplay}</span>`
  );

  heroAndCarousel = heroAndCarousel.replace(
    /(<button[^>]*class="acf-component--banner__form-button[^"]*"[^>]*>\s*<span>)[\s\S]*?(<\/span>\s*<\/button>)/,
    `$1${slots.ctaText}$2`
  );

  // Slot 10: 4 Hero USP items
  if (Array.isArray(slots.usps) && slots.usps.length === 4) {
    let uspIdx = 0;
    heroAndCarousel = heroAndCarousel.replace(
      /(<span class="acf-component--banner__usp-list-item-text p-xl m-0">)([\s\S]*?)(<\/span>)/g,
      (match, open, text, close) => {
        const val = slots.usps[uspIdx] || text.trim();
        uspIdx++;
        return `${open}\n                                    ${val}                                ${close}`;
      }
    );
  }

  // Slot 11: Accreditation logos in .acf-component--logo-carousel__marquee-track
  if (Array.isArray(slots.accreditations) && slots.accreditations.length > 0) {
    const itemsHtml = slots.accreditations
      .map(
        (acc) => `<div class="acf-component--logo-carousel__marquee-item">
<img alt="${acc.alt}" class="attachment-bf_logo size-bf_logo" decoding="async" height="86" loading="eager" src="${acc.src}" width="120" style="max-height: 86px; width: auto; object-fit: contain;"/> </div>`
      )
      .join('\n');
    heroAndCarousel = heroAndCarousel.replace(
      /(<div class="acf-component--logo-carousel__marquee-track js-logo-carousel-track"[^>]*>)[\s\S]*?(<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/section>)/,
      `$1\n${itemsHtml}\n$2`
    );
  }

  // Build token override block
  const tokenCssEntries = Object.entries(tokens)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');

  // Lightweight vanilla JS that replicates the exact live Pimlico rolling service ticker + native <select> handoff
  const runtimeInteractionScript = `<script>
(function() {
  var wrapper = document.querySelector('.js-banner-form-select-wrapper');
  var select = document.querySelector('.js-banner-form-service');
  var display = document.querySelector('.js-banner-form-select-display');
  var submitBtn = document.querySelector('.js-banner-form-button');
  if (!wrapper || !select || !display) return;

  var services = Array.from(select.querySelectorAll('option'))
    .filter(function(o) { return !o.disabled && o.value; })
    .map(function(o) { return o.value.trim().toLowerCase(); });

  var currentIdx = services.indexOf(display.textContent.trim().toLowerCase());
  if (currentIdx < 0) currentIdx = 0;
  var userSelected = false;
  var intervalId = null;

  function rollNext() {
    if (userSelected || document.hidden) return;
    currentIdx = (currentIdx + 1) % services.length;
    display.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    display.style.opacity = '0';
    display.style.transform = 'translateY(-6px)';
    setTimeout(function() {
      if (userSelected) return;
      display.textContent = services[currentIdx];
      display.style.transition = 'none';
      display.style.transform = 'translateY(6px)';
      void display.offsetWidth;
      display.style.transition = 'opacity 0.24s ease, transform 0.24s cubic-bezier(0.22,1,0.36,1)';
      display.style.opacity = '1';
      display.style.transform = 'translateY(0)';
    }, 200);
  }

  intervalId = setInterval(rollNext, 2600);

  select.addEventListener('change', function() {
    if (select.value) {
      userSelected = true;
      if (intervalId) clearInterval(intervalId);
      wrapper.classList.remove('is-showing-select-display');
      display.setAttribute('hidden', '');
      if (submitBtn) submitBtn.setAttribute('aria-disabled', 'false');
    }
  });
})();
</script>`;

  return `<!DOCTYPE html>
<html lang="en" style="--site-header-height: 167px; --vh: 9px;">
<head>
<meta charset="utf-8"/>
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"/>
<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no"/>
<title>${fixture.title}</title>
<link href="css/216db5f36268.css" rel="stylesheet"/>
${verbatim.inlineStyles}
<link href="css/02fde0c550dc.css" id="bootstrap-css" media="all" rel="stylesheet"/>
<link href="css/178bc5fc7187.css" id="splide-css" media="all" rel="stylesheet"/>
<link href="css/2f7df68d5aea.css" id="bf-css" media="all" rel="stylesheet"/>
<link href="css/be0993d89a43.css" id="gp-advanced-phone-field-css" media="all" rel="stylesheet"/>
<link href="css/2d497bea42cd.css" rel="stylesheet"/>
<style id="brand-parameterization-tokens">
:root {
${tokenCssEntries}
}
.mega-menu__item-trigger {
  white-space: nowrap;
}
</style>
</head>
<body class="home page-template-default page">
${header}
${ribbon}
<main class="main" id="main-content" tabindex="-1">
<div class="flexible-content" id="content">
${heroAndCarousel}
</div>
</main>
${runtimeInteractionScript}
</body>
</html>`;
}

// 5. Slice verbatim Before/After section from fencing-710ae83c/view/index.html
function sliceFencingBeforeAfter() {
  const srcCssDir = path.join(RAW_ROOT, 'fencing-710ae83c/view/css');
  for (const file of ['31a3cbf6a8c3.css', '9fda79cd5523.css']) {
    let css = fs.readFileSync(path.join(srcCssDir, file), 'utf8');
    css = css.replace(/\.\.\/\.\.\/assets\//g, '../assets/');
    fs.writeFileSync(path.join(OUT_CSS_DIR, file), css, 'utf8');
  }

  const htmlPath = path.join(RAW_ROOT, 'fencing-710ae83c/view/index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const start = html.indexOf('<section aria-labelledby="ba-title" class="beforeafter" id="beforeafter">');
  const end = html.indexOf('</section>', start) + '</section>'.length;
  let sectionHtml = html.slice(start, end);

  // Rewrite ../assets/ to assets/ and replace fallback external 1st4fencing.co.uk img src with the local webp asset in the preceding <source>
  sectionHtml = sectionHtml.replace(/\.\.\/assets\//g, 'assets/');
  sectionHtml = sectionHtml.replace(
    /<source srcset="(assets\/[^"]+)" type="image\/webp">\s*<img([^>]*?)src="https:\/\/www\.1st4fencing\.co\.uk[^"]+"([^>]*?)>/g,
    '<source srcset="$1" type="image/webp">\n<img$2src="$1"$3>'
  );

  const outHtml = `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>1st4FencingUK — Verbatim Sliced Before &amp; After Section (fencing-710ae83c)</title>
<link href="css/31a3cbf6a8c3.css" rel="stylesheet"/>
<link href="css/9fda79cd5523.css" rel="stylesheet"/>
</head>
<body style="margin:0;">
${sectionHtml}
<script>
document.querySelectorAll('.ba-frame').forEach(function(frame) {
  var range = frame.querySelector('.ba-range');
  if (!range) return;
  range.addEventListener('input', function(e) {
    frame.style.setProperty('--ba-pos', e.target.value + '%');
  });
});
</script>
</body>
</html>`;

  fs.writeFileSync(path.join(OUT_DIR, 'raw_beforeafter.html'), outHtml, 'utf8');
}

// 6. Build deterministic showcase harness page (with responsive 1440px desktop viewport scaling so iframes never accidentally trigger <1200px mobile header on smaller screens)
function buildShowcasePage() {
  const ts = Date.now();
  const showcaseHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deterministic Section Slicer — Verbatim Clone Parity &amp; Parameterization Suite</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --canvas: #09090b;
      --surface-1: #121215;
      --surface-2: #18181b;
      --hairline: rgba(255, 255, 255, 0.08);
      --text-1: #fafafa;
      --text-2: #a1a1aa;
      --text-3: #71717a;
      --ok: #10b981;
      --accent: #38bdf8;
      --font-sans: 'Geist', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }
    body {
      background-color: var(--canvas);
      color: var(--text-1);
      font-family: var(--font-sans);
      -webkit-font-smoothing: antialiased;
      padding-bottom: 64px;
    }
    .harness-strip {
      background-color: var(--surface-1);
      border-bottom: 1px solid var(--hairline);
      padding: 12px 24px;
      position: sticky;
      top: 0;
      z-index: 999;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.8125rem;
    }
    .harness-left { display: flex; align-items: center; gap: 12px; }
    .harness-badge {
      background-color: var(--surface-2);
      border: 1px solid var(--hairline);
      color: var(--text-1);
      padding: 4px 10px;
      border-radius: 4px;
      font-weight: 700;
      font-family: var(--font-mono);
      font-size: 0.75rem;
    }
    .harness-status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--ok);
      font-weight: 600;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--ok);
    }
    .harness-nav { display: flex; gap: 8px; }
    .harness-jump-btn {
      color: var(--text-2);
      text-decoration: none;
      padding: 6px 14px;
      border-radius: 6px;
      background-color: var(--surface-2);
      border: 1px solid var(--hairline);
      font-size: 0.78125rem;
      font-weight: 600;
    }
    .harness-jump-btn:hover { color: var(--text-1); }
    .showcase-wrapper {
      max-width: 1440px;
      margin: 0 auto;
    }
    .section-spec-header {
      padding: 32px 24px 14px 24px;
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      border-bottom: 1px solid var(--hairline);
      margin-bottom: 16px;
    }
    .section-spec-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--text-1);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .section-spec-title .tag {
      background-color: var(--surface-2);
      border: 1px solid var(--hairline);
      color: var(--accent);
      font-size: 0.75rem;
      font-family: var(--font-mono);
      padding: 2px 8px;
      border-radius: 4px;
    }
    .section-spec-meta {
      font-size: 0.8125rem;
      color: var(--text-2);
    }
    .preview-frame-container {
      background-color: #ffffff;
      border: 1px solid var(--hairline);
      margin-bottom: 40px;
      width: 100%;
      overflow: hidden;
    }
    iframe.section-embed {
      width: 1440px;
      height: 1020px;
      border: none;
      display: block;
      transform-origin: top left;
    }
    iframe.section-embed--ba {
      height: 1120px;
    }
  </style>
</head>
<body>
  <header class="harness-strip">
    <div class="harness-left">
      <span class="harness-badge">@factory/slicer v2.0 (Verbatim DOM+CSS)</span>
      <span class="harness-status">
        <span class="status-dot"></span>
        100% Verbatim Raw Clone DOM + Matched CSS + Local WOFF2 Fonts + JSON Slots
      </span>
    </div>
    <nav class="harness-nav">
      <a href="#pimlico" class="harness-jump-btn">1. Pimlico Verbatim Parity</a>
      <a href="#fully-wired" class="harness-jump-btn">2. Fully Wired Parameterized</a>
      <a href="#before-after" class="harness-jump-btn">3. 1st4Fencing Verbatim Before/After</a>
    </nav>
  </header>

  <main class="showcase-wrapper">
    <div id="pimlico" class="section-spec-header">
      <div class="section-spec-title">
        <span>1. Original Parity Slice — Pimlico Plumbers</span>
        <span class="tag">raw/plumbing-fdd41869/view/index.html</span>
      </div>
      <div class="section-spec-meta">
        Verbatim .site-header + .discount-banners + .acf-component--banner--home + .acf-component--logo-carousel + sofia-pro WOFF2
      </div>
    </div>
    <div class="preview-frame-container" id="wrap-pimlico">
      <iframe src="pimlico.html?v=${ts}" class="section-embed" title="Pimlico Verbatim Slice"></iframe>
    </div>

    <div id="fully-wired" class="section-spec-header">
      <div class="section-spec-title">
        <span>2. Parameterized Company Slice — Fully Wired Electrical (Cheshire)</span>
        <span class="tag">fixtures/fully-wired-cheshire.json</span>
      </div>
      <div class="section-spec-meta">
        Identical verbatim DOM &amp; CSS rules parameterized strictly via JSON tokens (--brand-primary, --brand-accent) &amp; Cheshire slots
      </div>
    </div>
    <div class="preview-frame-container" id="wrap-fullywired">
      <iframe src="fully-wired.html?v=${ts}" class="section-embed" title="Fully Wired Parameterized Slice"></iframe>
    </div>

    <div id="before-after" class="section-spec-header">
      <div class="section-spec-title">
        <span>3. Verbatim Before / After Grid Slice — 1st4FencingUK</span>
        <span class="tag">raw/fencing-710ae83c/view/index.html</span>
      </div>
      <div class="section-spec-meta">
        Verbatim 4-card .ba-grid with original Bricolage Grotesque + Archivo CSS &amp; local WebP before/after pairs
      </div>
    </div>
    <div class="preview-frame-container" id="wrap-ba">
      <iframe src="raw_beforeafter.html?v=${ts}" class="section-embed section-embed--ba" title="1st4Fencing Before/After Verbatim Slice"></iframe>
    </div>
  </main>

  <script>
    // Ensure 1440px desktop iframes never drop below 1200px breakpoint if viewed on a narrower laptop window
    function fitFrames() {
      document.querySelectorAll('.preview-frame-container').forEach(function(wrap) {
        var iframe = wrap.querySelector('iframe');
        if (!iframe) return;
        var w = wrap.clientWidth;
        var baseH = iframe.classList.contains('section-embed--ba') ? 1120 : 1020;
        if (w < 1440 && w > 0) {
          var scale = w / 1440;
          iframe.style.transform = 'scale(' + scale + ')';
          wrap.style.height = Math.round(baseH * scale) + 'px';
        } else {
          iframe.style.transform = 'none';
          wrap.style.height = baseH + 'px';
        }
      });
    }
    window.addEventListener('resize', fitFrames);
    fitFrames();
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(OUT_DIR, 'showcase.html'), showcaseHtml, 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), showcaseHtml, 'utf8');
}

// Run full pipeline
const pCount = copyCloneAssets('plumbing-fdd41869', (f) =>
  /\.(svg|png|jpe?g|webp|bin|woff2?)$/i.test(f)
);
const eCount = copyCloneAssets('electrical-c5f445f5', (f) =>
  /\.(svg|png|jpe?g|webp|woff2?)$/i.test(f)
);
const fCount = copyCloneAssets('fencing-710ae83c', (f) =>
  /\.(svg|png|jpe?g|webp|woff2?)$/i.test(f)
);
buildFullyWiredDarkLogo();
processPlumbingCss();

const verbatim = extractPlumbingVerbatimDom();
const pimlicoFixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'fixtures/pimlico-parity.json'), 'utf8'));
const fullyWiredFixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'fixtures/fully-wired-cheshire.json'), 'utf8'));
// Use crisp dark-ink SVG logo on light header for Fully Wired
fullyWiredFixture.slots.logoSrc = 'assets/fully-wired-logo-dark.svg';
fullyWiredFixture.tokens['--brand-accent'] = '#0b7a62';
fullyWiredFixture.tokens['--header-phone-button-bg'] = '#0b7a62';

const pimlicoHtml = renderParameterizedSection(verbatim, pimlicoFixture);
const fullyWiredHtml = renderParameterizedSection(verbatim, fullyWiredFixture);

fs.writeFileSync(path.join(OUT_DIR, 'pimlico.html'), pimlicoHtml, 'utf8');
fs.writeFileSync(path.join(OUT_DIR, 'fully-wired.html'), fullyWiredHtml, 'utf8');

sliceFencingBeforeAfter();
buildShowcasePage();

console.log(JSON.stringify({
  status: 'ok',
  assetsCopied: { plumbing: pCount, electrical: eCount, fencing: fCount },
  emitted: [
    'preview/sections/pimlico.html',
    'preview/sections/fully-wired.html',
    'preview/sections/raw_beforeafter.html',
    'preview/sections/showcase.html'
  ]
}, null, 2));

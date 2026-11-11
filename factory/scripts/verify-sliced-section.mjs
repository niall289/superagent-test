#!/usr/bin/env node
/**
 * Automated Playwright Parity, Overflow & Asset Verification Gate
 * 1. Screenshots the rendered original-parity slice (pimlico.html) vs home-1440.png
 * 2. Screenshots the parameterized second company slice (fully-wired.html — Fully Wired Electrical, Cheshire)
 * 3. Screenshots the verbatim 1st4Fencing before/after slice (raw_beforeafter.html)
 * 4. Runs deterministic DOM assertions for:
 *    - Zero broken <img> assets (naturalWidth > 0)
 *    - Zero text overflow/clipping on headers, nav links, rolling service display, buttons, and USPs
 *    - Live verification that the "I need help with" service ticker rolls cleanly on a timer
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ARTIFACT_DIR = 'C:/Users/niall/.gemini/antigravity/brain/368108c3-1a04-425d-842d-0bcbd4a4baba';
const BASE_URL = 'http://localhost:4382/preview/sections';

const TARGETS = [
  {
    name: 'pimlico-parity',
    url: `${BASE_URL}/pimlico.html`,
    screenshot: path.join(ARTIFACT_DIR, 'verbatim_pimlico_1440.png'),
    viewport: { width: 1440, height: 1020 },
    expectRollingTicker: true,
  },
  {
    name: 'fully-wired-cheshire',
    url: `${BASE_URL}/fully-wired.html`,
    screenshot: path.join(ARTIFACT_DIR, 'verbatim_fullywired_1440.png'),
    viewport: { width: 1440, height: 1020 },
    expectRollingTicker: true,
  },
  {
    name: 'fencing-before-after',
    url: `${BASE_URL}/raw_beforeafter.html`,
    screenshot: path.join(ARTIFACT_DIR, 'verbatim_beforeafter_1440.png'),
    viewport: { width: 1440, height: 1080 },
    expectRollingTicker: false,
  },
];

async function verifyTarget(browser, target) {
  const context = await browser.newContext({ viewport: target.viewport });
  const page = await context.newPage();

  const failedRequests = [];
  page.on('requestfailed', (req) => {
    failedRequests.push({ url: req.url(), reason: req.failure()?.errorText });
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      failedRequests.push({ url: res.url(), status: res.status() });
    }
  });

  await page.goto(target.url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);

  // Capture initial 1440px screenshot
  await page.screenshot({ path: target.screenshot, fullPage: false });

  // Run DOM audit for broken images, text clipping, and font loading
  const audit = await page.evaluate(() => {
    const brokenImages = [];
    for (const img of document.querySelectorAll('img')) {
      const style = window.getComputedStyle(img);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      if (!img.complete || img.naturalWidth === 0) {
        brokenImages.push({
          src: img.getAttribute('src'),
          alt: img.getAttribute('alt'),
        });
      }
    }

    const overflowIssues = [];
    const selectors = [
      '.header-tagline',
      '.header-phone-emergency span',
      '.header-phone-number',
      '.mega-menu__item-trigger',
      '.acf-component--banner__heading',
      '.acf-component--banner__form-label-text',
      '.acf-component--banner__form-select-display',
      '.js-rolling-service-word',
      '.acf-component--banner__form-button',
      '.acf-component--banner__usp-list-item-text',
      '#ba-title',
      '.ba figcaption',
    ];

    for (const sel of selectors) {
      for (const el of document.querySelectorAll(sel)) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;

        const horizOverflow = el.scrollWidth - el.clientWidth;
        const vertOverflow = el.scrollHeight - el.clientHeight;
        const clipsVertically = style.overflowY === 'hidden' || style.overflowY === 'clip' || style.overflowY === 'scroll';
        if (horizOverflow > 3 || (clipsVertically && vertOverflow > 3)) {
          overflowIssues.push({
            selector: sel,
            text: el.textContent.trim().slice(0, 50),
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight,
          });
        }
      }
    }

    const h1 = document.querySelector('h1, h2');
    const computedFont = h1 ? window.getComputedStyle(h1).fontFamily : 'none';
    const displayEl = document.querySelector('.js-banner-form-select-display');
    const initialWord = displayEl?.textContent?.trim() || null;
    const displayColor = displayEl ? window.getComputedStyle(displayEl).color : null;
    if (displayEl && displayColor === 'rgb(255, 255, 255)') {
      overflowIssues.push({
        selector: '.js-banner-form-select-display',
        reason: 'Invisible white-on-white text color',
        color: displayColor,
      });
    }

    return {
      brokenImages,
      overflowIssues,
      computedFont,
      initialWord,
      displayColor,
    };
  });

  // Verify rolling service ticker transitions cleanly if present
  let tickerRolledTo = null;
  if (target.expectRollingTicker) {
    await page.waitForTimeout(2800);
    tickerRolledTo = await page.evaluate(() => {
      return document.querySelector('.js-banner-form-select-display')?.textContent?.trim() || null;
    });
  }

  await context.close();

  return {
    name: target.name,
    screenshot: target.screenshot,
    failedRequests,
    ...audit,
    tickerRolledTo,
    tickerPassed: !target.expectRollingTicker || (audit.initialWord && tickerRolledTo && audit.initialWord !== tickerRolledTo),
  };
}

async function main() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
  });
  const results = [];
  try {
    for (const t of TARGETS) {
      results.push(await verifyTarget(browser, t));
    }

    // Also capture showcase.html full overview
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1020 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/showcase.html`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'verbatim_showcase_1440.png'),
      fullPage: true,
    });
    await ctx.close();
  } finally {
    await browser.close();
  }

  // Generate side-by-side comparison image: ground_truth_pimlico_1440.png vs verbatim_pimlico_1440.png
  const pyCmd = `python -c "from PIL import Image, ImageDraw; gt = Image.open('business-os/workspaces/clones/modal/raw/plumbing-fdd41869/home-1440.png').crop((0, 0, 1440, 1020)); sl = Image.open('${ARTIFACT_DIR}/verbatim_pimlico_1440.png').crop((0, 0, 1440, 1020)); out = Image.new('RGB', (2896, 1020), (15, 23, 42)); out.paste(gt, (0, 0)); out.paste(sl, (1456, 0)); out.save('${ARTIFACT_DIR}/pimlico_side_by_side_parity.png')"`;
  execSync(pyCmd, { stdio: 'inherit' });

  console.log(JSON.stringify(results, null, 2));

  const anyFailure = results.some(
    (r) =>
      r.brokenImages.length > 0 ||
      r.overflowIssues.length > 0 ||
      r.failedRequests.length > 0 ||
      !r.tickerPassed
  );
  if (anyFailure) {
    console.error('VERIFICATION GATE FAILED');
    process.exit(1);
  }
}

main();

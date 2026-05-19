#!/usr/bin/env node

import { mkdir } from 'node:fs/promises';
import { chromium, devices } from 'playwright';

const target = process.argv[2];

if (!target) {
  console.error('Usage: npm run verify:ui -- https://your-site.netlify.app');
  process.exit(1);
}

const outDir = new URL('../output/playwright/', import.meta.url);
await mkdir(outDir, { recursive: true });

const result = {
  target,
  checkedAt: new Date().toISOString(),
  status: 'pass',
  checks: [],
  console: [],
  failedRequests: []
};

const pass = (name, details = {}) => result.checks.push({ name, status: 'pass', details });
const fail = (name, details = {}) => {
  result.status = 'fail';
  result.checks.push({ name, status: 'fail', details });
};

const attachObservers = (page) => {
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      result.console.push({ type: message.type(), text: message.text() });
    }
  });
  page.on('requestfailed', (request) => {
    result.failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || 'unknown' });
  });
  page.on('pageerror', (error) => {
    result.console.push({ type: 'pageerror', text: error.message });
  });
};

const clickText = async (page, text, exact = true) => {
  await page.getByText(text, { exact }).click({ timeout: 10000 });
  pass(`clicked ${text}`);
};

const setRange = async (page, selector, value) => {
  await page.locator(selector).evaluate((element, nextValue) => {
    element.value = nextValue;
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
  pass(`range ${selector}`, { value });
};

const browser = await chromium.launch({ headless: true });

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await desktop.newPage();
  attachObservers(page);

  await page.goto(target, { waitUntil: 'networkidle' });
  await page.screenshot({ path: new URL('desktop-initial.png', outDir).pathname, fullPage: false });
  pass('desktop load', { title: await page.title() });

  await clickText(page, 'Begin Journey');
  await page.locator('#audio-shield.fade-out').waitFor({ state: 'attached', timeout: 10000 });
  await page.locator('#btn-audio-toggle', { hasText: 'Sound On' }).waitFor({ timeout: 10000 });
  pass('activation flow');

  for (const preset of ['Midnight Aurora', 'Solar Flare', 'Deep Ocean', 'Cosmic Nebula']) {
    await clickText(page, preset);
  }

  await setRange(page, '#slider-drone', '0.2');
  await setRange(page, '#slider-nature', '0.7');
  await setRange(page, '#slider-chimes', '0.3');
  await setRange(page, '#slider-particles', '260');
  await setRange(page, '#slider-speed', '1.8');
  await setRange(page, '#slider-attraction', '1.2');
  await page.locator('#select-scale').selectOption('lydian');
  pass('musical scale select', { value: 'lydian' });

  await clickText(page, 'Breath Work');
  await page.locator('#breathing-section:not(.hidden)').waitFor({ timeout: 10000 });
  await clickText(page, 'Deep Relax (4-7-8)');
  await clickText(page, 'Box Breathing (4-4-4-4)');
  await page.waitForTimeout(1200);
  pass('breathing timer visible', { text: await page.locator('#breath-instruction').innerText() });

  await clickText(page, 'Customize');
  await page.locator('#presets-panel:not(.hidden)').waitFor({ timeout: 10000 });
  await clickText(page, 'Sound On');
  await page.locator('#btn-audio-toggle', { hasText: 'Sound Off' }).waitFor({ timeout: 10000 });
  await clickText(page, 'Sound Off');
  await page.locator('#btn-audio-toggle', { hasText: 'Sound On' }).waitFor({ timeout: 10000 });

  await clickText(page, 'Zen Mode');
  await page.locator('body.zen-mode').waitFor({ timeout: 10000 });
  await page.keyboard.press('Escape');
  await page.locator('body.zen-mode').waitFor({ state: 'detached', timeout: 10000 });
  pass('zen mode escape exit');

  await clickText(page, 'Breath Work');
  await page.locator('#breathing-section.hidden').waitFor({ timeout: 10000 });
  pass('breathing workflow stopped before canvas gesture');

  const box = await page.locator('#visualizer-canvas').boundingBox();
  if (box) {
    const start = { x: box.x + box.width * 0.35, y: box.y + box.height * 0.35 };
    const end = { x: box.x + box.width * 0.65, y: box.y + box.height * 0.65 };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 20 });
    await page.mouse.up();
    await page.locator('#gesture-alert:not(.hidden)').waitFor({ timeout: 10000 });
    pass('canvas slash gesture');
  } else {
    fail('canvas slash gesture', { message: 'Canvas bounding box unavailable.' });
  }

  await page.screenshot({ path: new URL('desktop-after-controls.png', outDir).pathname, fullPage: false });
  await desktop.close();

  const mobile = await browser.newContext({
    ...devices['Pixel 7'],
    viewport: { width: 390, height: 844 }
  });
  const mobilePage = await mobile.newPage();
  attachObservers(mobilePage);
  await mobilePage.goto(target, { waitUntil: 'networkidle' });
  await mobilePage.getByText('Begin Journey', { exact: true }).click({ timeout: 10000 });
  await mobilePage.locator('#btn-audio-toggle').waitFor({ timeout: 10000 });
  await mobilePage.screenshot({ path: new URL('mobile-after-activation.png', outDir).pathname, fullPage: false });
  const visibleControls = await mobilePage.locator('.control-center button:visible').count();
  if (visibleControls === 4) {
    pass('mobile primary controls visible', { visibleControls });
  } else {
    fail('mobile primary controls visible', { visibleControls });
  }
  await mobile.close();

  const relevantConsole = result.console.filter((entry) => {
    return !entry.text.includes('[Gesture]');
  });
  if (relevantConsole.length) {
    fail('console health', { entries: relevantConsole });
  } else {
    pass('console health');
  }

  if (result.failedRequests.length) {
    fail('network health', { failedRequests: result.failedRequests });
  } else {
    pass('network health');
  }
} catch (error) {
  fail('playwright pass', { message: error instanceof Error ? error.message : String(error) });
} finally {
  await browser.close();
}

console.log(JSON.stringify(result, null, 2));
process.exit(result.status === 'pass' ? 0 : 1);

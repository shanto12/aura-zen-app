#!/usr/bin/env node

const target = process.argv[2];

if (!target) {
  console.error('Usage: npm run verify:production -- https://your-site.netlify.app');
  process.exit(1);
}

const url = new URL(target);
const requiredAssets = ['/', '/index.css', '/audio.js', '/canvas.js', '/main.js'];
const requiredHeaders = [
  'content-security-policy',
  'permissions-policy',
  'referrer-policy',
  'strict-transport-security',
  'x-content-type-options',
  'x-frame-options'
];

const result = {
  target: url.origin,
  checkedAt: new Date().toISOString(),
  status: 'pass',
  checks: []
};

const fail = (name, details) => {
  result.status = 'fail';
  result.checks.push({ name, status: 'fail', details });
};

const pass = (name, details) => {
  result.checks.push({ name, status: 'pass', details });
};

const get = async (path, method = 'GET') => {
  const response = await fetch(new URL(path, url.origin), { method, redirect: 'manual' });
  const body = method === 'GET' ? await response.text() : '';
  return { response, body };
};

try {
  for (const asset of requiredAssets) {
    const { response, body } = await get(asset);
    const contentType = response.headers.get('content-type') || '';
    if (response.status !== 200) {
      fail(`asset ${asset}`, { status: response.status, contentType });
      continue;
    }
    if (asset === '/' && !body.includes('Aura | Interactive Zen Soundscape')) {
      fail('document title', { message: 'Expected Aura title marker was not found.' });
    } else {
      pass(`asset ${asset}`, { status: response.status, contentType });
    }
  }

  const { response: head } = await get('/', 'HEAD');
  for (const header of requiredHeaders) {
    const value = head.headers.get(header);
    if (!value) {
      fail(`header ${header}`, { message: 'Header missing on production response.' });
    } else {
      pass(`header ${header}`, { value });
    }
  }

  const csp = head.headers.get('content-security-policy') || '';
  if (!csp.includes('fonts.googleapis.com') || !csp.includes('fonts.gstatic.com') || !csp.includes('data:')) {
    fail('csp compatibility', { message: 'CSP does not explicitly allow Google Fonts and data images.' });
  } else {
    pass('csp compatibility', { message: 'CSP allows current font and data-image requirements.' });
  }
} catch (error) {
  fail('production fetch', { message: error instanceof Error ? error.message : String(error) });
}

console.log(JSON.stringify(result, null, 2));
process.exit(result.status === 'pass' ? 0 : 1);

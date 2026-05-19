# Aura Enterprise Release Evidence

Release target: Netlify production
Repository: https://github.com/shanto12/aura-zen-app
Production URL: https://aura-zen-app.netlify.app
Netlify site: `aura-zen-app` (`848f3e46-219a-4207-95a9-d4da07df3b01`)
Production deploy: `6a0cdd53419ece09d80860d4`
Evidence updated: May 19, 2026 5:09 PM CDT

## Matrix

| Requirement | Evidence source | Status | Notes |
|---|---|---:|---|
| GitHub upload | GitHub CLI | Pass | Public repo `https://github.com/shanto12/aura-zen-app`, default branch `main`, latest release commit `15a1d3e`. |
| Netlify production deploy | Netlify CLI + Netlify API | Pass | Deployed `.` with no build to site `aura-zen-app`; API confirmed published deploy `6a0cdd53419ece09d80860d4`. |
| Deployed Netlify URL tested, not localhost | `npm run verify:production -- https://aura-zen-app.netlify.app` | Pass | `/`, `/index.css`, `/audio.js`, `/canvas.js`, and `/main.js` returned `200` with expected content types. |
| Security headers and CSP | `curl -I` + production verifier | Pass | CSP, Permissions-Policy, Referrer-Policy, HSTS, `x-content-type-options`, `x-frame-options`, and `x-permitted-cross-domain-policies` present on production. |
| Production npm audit | npm | Pass | `npm audit --omit=dev --audit-level=moderate` found 0 vulnerabilities. |
| Automated desktop workflow | `npm run verify:ui -- https://aura-zen-app.netlify.app` | Pass | Clicked activation, all four presets, sliders, scale select, breath work, audio toggle, zen mode, and canvas slash gesture. |
| Automated mobile layout | Playwright mobile viewport in `verify:ui` | Pass | Pixel 7 viewport showed all four primary controls and completed the production smoke pass without failed requests. |
| Real Chrome profile final pass | Codex Chrome extension controlling Chrome profile `Person 1` | Pass | Opened production URL in real Chrome, clicked visible controls/workflows, adjusted sliders via keyboard, verified canvas gesture, and captured screenshots. |
| Welcome activation | Real Chrome + Playwright | Pass | `Begin Journey` activated Web Audio/canvas and changed audio state to `Sound On`. |
| Primary bottom controls | Real Chrome + Playwright | Pass | `Sound On/Off`, `Breath Work`, `Zen Mode`, and `Customize` were clicked and state changes were verified. |
| Soundscape presets | Real Chrome + Playwright | Pass | Midnight Aurora, Solar Flare, Deep Ocean, and Cosmic Nebula were clicked; final active preset was Cosmic Nebula. |
| Customizer controls | Real Chrome + Playwright | Pass | Six range sliders were clicked/adjusted and musical scale was changed to `lydian`. |
| Breath-work workflow | Real Chrome + Playwright | Pass | Breath Work opened; Box Breathing and Deep Relax were selected; timer/instruction was visible; workflow was then closed. |
| Canvas gesture workflow | Real Chrome + Playwright | Pass | Slash gesture triggered the Shooting Star gesture alert. |
| Desktop layout | Real Chrome screenshot + Playwright desktop screenshot | Pass | Production desktop was nonblank, controls visible, and no failed resource/console checks. |
| Mobile layout | Playwright mobile screenshot/check | Pass | Mobile primary controls visible; no failed resource/console checks. |
| Console errors | Real Chrome + Playwright | Pass | No relevant production warnings/errors after removing unsupported `ambient-light-sensor` Permissions-Policy token. |
| Failed network requests | Real Chrome resource inspection + Playwright request tracking | Pass | Core assets loaded and no failed/suspicious resources were reported. |
| Auth/login/logout/password manager | Static app inspection | Not applicable | Static app has no auth, logout/login, password fields, or password-manager flow. |
| API/backend/runner jobs | Static app inspection | Not applicable | Static app has no API calls, backend, or runner jobs. |

## Verification Commands

```bash
npm audit --omit=dev --audit-level=moderate
npm run verify:production -- https://aura-zen-app.netlify.app
npm run verify:ui -- https://aura-zen-app.netlify.app
curl -I https://aura-zen-app.netlify.app
```

## Notes

- The app is static HTML/CSS/JS and uses Google Fonts, Web Audio, Canvas 2D, and CSS `data:` SVG backgrounds.
- CSP allows `fonts.googleapis.com`, `fonts.gstatic.com`, and `data:` images.
- Netlify had a transient May 19 outage during the initial release attempt. Final production deployment and verification completed after API recovery.

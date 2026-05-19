# Aura

Aura is a static browser-only ambient soundscape and generative particle visualizer. It combines Web Audio synthesis, canvas particles, guided breathing, soundscape presets, and gesture-triggered visual effects.

## Production Hosting

This app is designed for Netlify static hosting.

- Publish directory: `.`
- Build command: none
- Security headers: `netlify.toml`

## Verification

After a production deploy, run:

```bash
npm run verify:production -- https://your-site.netlify.app
npm audit --omit=dev --audit-level=moderate
```

Then complete the real Chrome profile pass and update `docs/enterprise-release-evidence.md`.

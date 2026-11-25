# Stretchtext

> Browser extension that turns any web page into **stretchtext**: click a phrase to grow it where it stands, click again to shrink it back. Readers pay with their own Pollinations Pollen.

[![Language](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?logo=javascript&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Platform](https://img.shields.io/badge/Chrome-MV3%20%7C%20min%20127-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3)
[![License](https://img.shields.io/badge/License-MIT-blue)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-node%20--test-brightgreen)](./package.json)

## Table des matières

- [À propos](#à-propos)
- [Structure du dépôt](#structure-du-dépôt)
- [Stack technique](#stack-technique)
- [Installation](#installation)
- [Sécurité](#sécurité)
- [Contribution](#contribution)
- [Licence](#licence)
- [Changelog](#changelog)
- [Roadmap](#roadmap)

## About

**What** — Stretchtext is a browser extension (Manifest V3) that rewrites prose blocks on a page into clickable sentences: clicking expands the sentence in place via the Pollinations API, clicking again collapses it.

**Who** — Readers who want more detail on a sentence without leaving the page or opening a new tab.

**Why** — Avoid breaking the reading flow (new tab, reformatting) while keeping the cost on the reader (BYOP — Bring Your Own Pollen).

**Who** — Author/maintainer: `g33ky00` (GitHub account). Contact via repository issues.

## Structure

```text
stretchtext/
├── manifest.json          # MV3
├── background.js          # device flow, balance, message surface
├── content.js             # page walker + expand/collapse
├── content.css
├── lib/
│   ├── sentences.js       # pure helpers, shared with tests
│   └── storage.js         # opens chrome.storage.session to the content script
├── popup.html / popup.js / popup.css
├── options.html / options.js / options.css
├── icons/
├── demo/
│   └── index.html         # controlled page for screenshots
├── docs/
│   └── screenshot.png
├── test/
│   └── sentences.test.cjs
└── package.json
```

## Stack

| Composant | Version | Source |
|-----------|---------|--------|
| Extension (manifest) | 1.0.0 | `manifest.json` |
| Manifest V3 | 3 | `manifest.json` |
| Chrome minimum | 127 | `manifest.json` (`minimum_chrome_version`) |
| Node.js (tests) | LTS | `package.json` (`scripts.test`) |
| Pollinations API | gen.pollinations.ai / enter.pollinations.ai | `content.js`, `background.js` |

## Installation

Prérequis : Chrome/Edge/Brave/Arc ≥ 127, ou Firefox.

```bash
git clone git@github.com:g33ky00/stretchtext.git
cd stretchtext
npm test
```

Puis charger l'extension non empaquetée :

- **Chrome / Edge / Brave / Arc** : `chrome://extensions` → mode développeur → « Charger l'extension non empaquetée » → dossier `stretchtext/`.
- **Firefox** : `about:debugging#/runtime/this-firefox` → « Charger un module temporaire » → `stretchtext/manifest.json`.

## Sécurité

- [x] Secrets gérés correctement : clé API dans `chrome.storage.session` (mémoire, effacée à la fermeture), jamais `chrome.storage.local`.
- [x] Accès restreints : permissions hôte limitées à `gen.pollinations.ai` et `enter.pollinations.ai`.
- [x] Validation des entrées : phrases < 4 mots ignorées ; blocs non purement textuels non réécrits.
- [x] Protection XSS : réécriture uniquement de nœuds texte ; pas d'injection HTML arbitraire.
- [x] Aucune télémétrie, analytics ni configuration distante.

## Contributing

### Commit conventions

| Préfixe | Usage |
|---------|-------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation |
| `chore:` | Maintenance |
| `test:` | Tests |

Process: dedicated branch, PR to `main`, `npm test` green.

## License

This project is licensed under **MIT**. See [`LICENSE`](./LICENSE).

## Changelog

### v1.0.0 — 2026-10
- 📝 Extension initiale (MV3)
- ✅ Device flow + paste key
- ✅ 18 tests (segmentation, seuil, URL, prompt, manifest)

## Roadmap

### ✅ Terminé
- [x] Extension MV3 fonctionnelle
- [x] Device flow conforme BYOP
- [x] Tests automatisés

### 🔵 En cours
- [ ] Aucune tâche en cours

### 🟡 Planifié
- [ ] Publication sur Chrome Web Store

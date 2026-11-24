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

## À propos

**Quoi** — Stretchtext est une extension navigateur (Manifest V3) qui réécrit les blocs de prose d'une page en phrases cliquables : cliquer développe la phrase en place via l'API Pollinations, recliquer la réduit.

**Pour qui** — Lecteurs qui veulent plus de détail sur une phrase sans quitter la page ni ouvrir un nouvel onglet.

**Pourquoi** — Éviter la rupture de lecture (nouvel onglet, reformatage) tout en gardant le coût à la charge du lecteur (BYOP — Bring Your Own Pollen).

**Qui** — Auteur/mainteneur : `g33ky00` (compte GitHub). Contact via les issues du dépôt.

## Structure du dépôt

```text
stretchtext/
├── manifest.json          # MV3
├── background.js          # device flow, balance, surface de messages
├── content.js             # walker de page + expand/collapse
├── content.css
├── lib/
│   ├── sentences.js       # helpers purs, partagés avec les tests
│   └── storage.js         # ouvre chrome.storage.session au content script
├── popup.html / popup.js / popup.css
├── options.html / options.js / options.css
├── icons/
├── demo/
│   └── index.html         # page contrôlée pour captures
├── docs/
│   └── screenshot.png
├── test/
│   └── sentences.test.cjs
└── package.json
```

## Stack technique

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

## Contribution

### Conventions de commit

| Préfixe | Usage |
|---------|-------|
| `feat:` | Nouvelle fonctionnalité |
| `fix:` | Correction |
| `docs:` | Documentation |
| `chore:` | Maintenance |
| `test:` | Tests |

Processus : branche dédiée, PR vers `main`, `npm test` vert.

## Licence

Ce projet est sous licence **MIT**. Voir [`LICENSE`](./LICENSE).

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

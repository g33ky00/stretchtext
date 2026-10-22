# Stretchtext

[![Made with pollinations.ai](https://raw.githubusercontent.com/pollinations/pollinations/main/packages/ui/src/brand/badge-made-with.svg)](https://pollinations.ai/?ref=badge)

A browser extension that turns any web page into **stretchtext**: text that grows
where the reader wants more and shrinks back where they don't.

Read a sentence, want more? Click it and it expands in place. Click again and it
collapses back. No page reload, no new tab, no reformatting of the article.

Every expansion is generated on demand by the Pollinations API and **billed to
the reader's own Pollen**. The extension never pays for anything and never sees
the reader's balance beyond the number it displays.

---

## Install

The extension is distributed as source and loaded unpacked, so the reader can
inspect exactly what it does.

**Chrome / Edge / Brave / Arc**

1. Download or clone this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the `stretchtext/` folder.

**Firefox**

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on** and select `stretchtext/manifest.json`.

To remove it, remove the extension — the page is restored to its original shape
the moment the content script stops.

---

## Connect

Open the toolbar popup and choose one of two ways to pay with your own Pollen.

**Paste a key** (works immediately)

1. Create a secret key at [enter.pollinations.ai/keys](https://enter.pollinations.ai/keys).
2. Paste it into the popup.

**Device flow** (no long-lived secret in the browser)

1. Register an **App Key** (`pk_…`) at [enter.pollinations.ai/keys](https://enter.pollinations.ai/keys).
2. Open the extension's options page and start the device flow.
3. Approve the code in your browser. The extension receives a scoped key that
   works until it expires or is revoked.

Either way the key stays in `chrome.storage.local` in that browser profile and
is sent **only** to `gen.pollinations.ai` (the generation call) or
`enter.pollinations.ai` (the device flow). The extension requests host
permission for exactly those two origins and nothing else.

---

## Use

- **Click** an underlined phrase to expand it.
- **Click again** to collapse it.
- **Tab** to a phrase and press **Enter** or **Space** — every stretchable
  phrase is a real focusable control, not a click-only affordance.
- Open the popup to enable or disable the extension on new pages, and to switch
  the model used for expansions.
- Expansions are cached per page load, so re-reading a phrase costs nothing.

Phrases shorter than four words are left alone — a bare "Yes." is not worth
expanding.

---

## How it works

The content script walks the page for prose blocks — paragraphs, list items,
table cells, headings, blockquotes, captions. An element is rewritten **only
when its content is purely text**; anything containing links, emphasis, code or
form controls is left exactly as the author wrote it, and the walker still
descends into it.

Each sentence becomes a `<span>`. The original text is preserved verbatim, and
`document.normalize()` restores the page to its original shape when the
extension is disabled. Machine-readable regions — `script`, `style`, `code`,
`pre`, form controls, `svg`, `math`, media and editable areas — are skipped
entirely.

The expansion is one HTTP request:

```
GET https://gen.pollinations.ai/text/{prompt}?key=<reader key>&model=<model>
```

The prompt asks for two to three sentences of elaboration and explicitly tells
the model not to repeat the source sentence.

---

## Development

```
npm test
```

13 tests cover the parts worth testing: sentence segmentation (including
lossless rejoining), the stretchable threshold, URL construction, the prompt,
and two manifest assertions — that the shared helper is loaded before the
content script, and that the extension requests only the two hosts it calls.

```
stretchtext/
├── manifest.json        # MV3
├── lib/sentences.js     # pure helpers, shared with the tests
├── content.js           # page walker + expand/collapse
├── content.css
├── background.js        # device flow, balance, message surface
├── popup.html/.js/.css
├── options.html/.js/.css
├── icons/
├── demo/index.html      # controlled page for screenshots
└── test/sentences.test.cjs
```

---

## Privacy

- No analytics, no telemetry, no remote configuration.
- The API key is stored in the browser profile and sent only to Pollinations.
- The extension reads page text only to segment it into sentences; the sentence
  text is sent to the Pollinations API solely to generate the expansion the
  reader asked for, which is the same thing any reader-triggered generation
  does.

---

## Licence

MIT

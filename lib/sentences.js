// Pure helpers shared by the content script and the test suite.
//
// Loaded as a plain script (not a module) because MV3 content scripts do not
// support `import`. It publishes one global and nothing else, so it is safe to
// evaluate on every page.
//
// The functions here are the parts worth testing: sentence segmentation and
// the Pollinations request URL. Everything else in the extension touches the
// DOM or the extension API.

globalThis.Stretchtext = (() => {
    "use strict";

    const MIN_WORDS = 4;
    const API_BASE = "https://gen.pollinations.ai";

    const SENTENCES = /[^.!?…]+[.!?…]+["'”’)\]]*\s*|[^.!?…]+$/g;

    /**
     * Splits prose into sentences, keeping the trailing whitespace with each
     * part so rejoining reproduces the original text exactly.
     */
    function sentences(text) {
        const out = [];
        SENTENCES.lastIndex = 0;
        let match;
        while ((match = SENTENCES.exec(text)) !== null) {
            if (match[0]) out.push(match[0]);
        }
        return out;
    }

    /**
     * A sentence is stretchable when it carries enough words to be worth
     * expanding — a bare "Yes." is not.
     */
    function isStretchable(text) {
        return text.trim().split(/\s+/).filter(Boolean).length >= MIN_WORDS;
    }

    /**
     * The elaboration request. `/text/{prompt}` takes the key as a query
     * parameter rather than a bearer header, which is why this builds a URL
     * instead of calling fetch with an Authorization header.
     */
    function textUrl(prompt, key, model) {
        return (
            `${API_BASE}/text/${encodeURIComponent(prompt)}` +
            `?key=${encodeURIComponent(key)}` +
            `&model=${encodeURIComponent(model)}`
        );
    }

    /**
     * The prompt sent for one sentence. It asks for the elaboration only —
     * repeating the original would double the reading.
     */
    function promptFor(sentence) {
        return (
            "Expand this into 2-3 sentences for a reader who wants more " +
            "detail. Keep the same language and tone. Do not repeat the " +
            `original text.\n\nText: ${sentence.trim()}`
        );
    }

    /**
     * Wraps a generated elaboration with a space on both sides.
     *
     * The API returns a bare string, and the elaboration is inserted directly
     * after a phrase span. Without a trailing space it would run straight into
     * the next sentence whenever the phrase it follows was the last one split
     * off — "installation process.Click any underlined phrase".
     */
    function expansionText(body) {
        return ` ${body.trim()} `;
    }

    return {
        MIN_WORDS,
        sentences,
        isStretchable,
        textUrl,
        promptFor,
        expansionText,
    };
})();

// Stretchtext content script.
//
// Walks the page for prose, wraps each sentence in a focusable phrase, and
// grows or shrinks it on demand. The elaboration is generated on demand by
// Pollinations and billed to the reader's own key.
//
// Constraints that matter:
// - Never rewrites markup. Only elements whose content is *purely* text are
//   wrapped, so links, emphasis, code and forms survive untouched. The
//   original text is restored on disable.
// - Never runs twice on the same element: the marker attribute is the guard.

(() => {
    "use strict";

    const MARKER = "data-stretchtext";
    const PHRASE = "stretch-phrase";
    const MORE = "stretch-more";

    // Containers whose text is not prose, or whose rewriting would break them.
    const SKIP = new Set([
        "SCRIPT",
        "STYLE",
        "NOSCRIPT",
        "TEMPLATE",
        "TEXTAREA",
        "INPUT",
        "SELECT",
        "BUTTON",
        "CODE",
        "PRE",
        "KBD",
        "SAMP",
        "VAR",
        "SVG",
        "MATH",
        "IFRAME",
        "OBJECT",
        "EMBED",
        "CANVAS",
        "AUDIO",
        "VIDEO",
    ]);

    const BLOCKS = new Set([
        "P",
        "LI",
        "TD",
        "TH",
        "DD",
        "DT",
        "BLOCKQUOTE",
        "FIGCAPTION",
        "SUMMARY",
        "H1",
        "H2",
        "H3",
        "H4",
        "H5",
        "H6",
    ]);

    // Pure helpers live in lib/sentences.js, loaded before this script so the
    // same code is covered by the test suite.
    const { sentences: splitSentences, isStretchable, textUrl, promptFor } =
        globalThis.Stretchtext;

    const state = {
        enabled: true,
        model: "openai/gpt-5.4-nano",
        key: "",
        cache: new Map(),
        inFlight: new Set(),
        observer: null,
        raf: null,
    };

    // ---- settings ----------------------------------------------------------

    function readStored(stored) {
        if (typeof stored.enabled === "boolean") state.enabled = stored.enabled;
        if (typeof stored.model === "string" && stored.model) {
            state.model = stored.model;
        }
        if (typeof stored.apiKey === "string") state.key = stored.apiKey;
    }

    // chrome.storage.session is the extension analogue of sessionStorage: the
    // key lives in memory and is gone when the browser closes. Re-running the
    // connect step is the intended flow — there are no refresh tokens.
    chrome.storage.session.get(["enabled", "model", "apiKey"], (stored) => {
        if (chrome.runtime.lastError) return;
        readStored(stored);
        render();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "session") return;
        readStored({
            enabled: changes.enabled?.newValue,
            model: changes.model?.newValue,
            apiKey: changes.apiKey?.newValue,
        });
        render();
    });

    // ---- wrapping ----------------------------------------------------------

    function isSkippable(node) {
        for (let el = node; el && el.nodeType === 1; el = el.parentElement) {
            if (SKIP.has(el.tagName)) return true;
            if (el.isContentEditable) return true;
        }
        return false;
    }

    function wrapElement(element) {
        const children = [...element.childNodes];
        // Only rewrite elements that are nothing but text. Anything else keeps
        // its markup; the walker still visits its block children.
        if (!children.every((node) => node.nodeType === Node.TEXT_NODE)) {
            return;
        }
        const text = children.map((node) => node.nodeValue).join("");
        if (text.trim().length < 3) return;

        const fragment = document.createDocumentFragment();
        let wrapped = false;

        for (const node of children) {
            for (const part of splitSentences(node.nodeValue)) {
                const span = document.createElement("span");
                span.className = PHRASE;
                span.textContent = part;
                span.setAttribute(MARKER, "phrase");
                if (isStretchable(part)) {
                    span.tabIndex = 0;
                    span.setAttribute("role", "button");
                    span.setAttribute("data-stretchable", "1");
                }
                fragment.appendChild(span);
                wrapped = true;
            }
        }

        if (!wrapped) return;
        element.textContent = "";
        element.appendChild(fragment);
        element.setAttribute(MARKER, "done");
    }

    function candidateRoots() {
        if (!document.body) return [];
        const seen = new Set();
        const roots = [];
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_ELEMENT,
            {
                acceptNode(node) {
                    if (!BLOCKS.has(node.tagName)) return NodeFilter.FILTER_SKIP;
                    if (isSkippable(node)) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                },
            },
        );
        let node;
        while ((node = walker.nextNode()) !== null) {
            // A block inside an already-accepted block is covered by it.
            let ancestor = node.parentElement;
            let covered = false;
            while (ancestor && ancestor !== document.body) {
                if (seen.has(ancestor)) {
                    covered = true;
                    break;
                }
                ancestor = ancestor.parentElement;
            }
            if (!covered) {
                seen.add(node);
                roots.push(node);
            }
        }
        return roots;
    }

    // ---- expansion ---------------------------------------------------------

    function insertMore(span, text, loading) {
        const more = document.createElement("span");
        more.className = MORE + (loading ? ` ${MORE}--loading` : "");
        more.textContent = loading ? " …" : expansionText(text);
        span.insertAdjacentElement("afterend", more);
        span.setAttribute("aria-expanded", "true");
    }

    function collapse(span) {
        const more = span.nextElementSibling;
        if (more && more.classList.contains(MORE)) more.remove();
        span.setAttribute("aria-expanded", "false");
    }

    async function expand(span) {
        if (!state.key) {
            span.setAttribute("aria-expanded", "false");
            chrome.runtime.openOptionsPage();
            return;
        }
        const sentence = span.textContent.trim();
        if (!sentence) return;

        if (span.getAttribute("aria-expanded") === "true") {
            collapse(span);
            return;
        }
        if (state.cache.has(sentence)) {
            insertMore(span, state.cache.get(sentence));
            return;
        }
        if (state.inFlight.has(sentence)) return;
        state.inFlight.add(sentence);
        insertMore(span, "", true);

        const more = span.nextElementSibling;
        try {
            const url = textUrl(promptFor(sentence), state.key, state.model);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`${response.status} ${response.statusText}`);
            }
            const body = (await response.text()).trim();
            if (!body) throw new Error("empty response");
            state.cache.set(sentence, body);
            more.classList.remove(`${MORE}--loading`);
            more.textContent = ` ${body}`;
        } catch (error) {
            span.setAttribute("aria-expanded", "false");
            more.classList.remove(`${MORE}--loading`);
            more.classList.add(`${MORE}--error`);
            more.textContent = ` (could not expand — ${error.message})`;
        } finally {
            state.inFlight.delete(sentence);
        }
    }

    // ---- lifecycle ---------------------------------------------------------

    function unwind() {
        // Expansions first, then the sentence wrappers, then merge the text
        // nodes back so the page returns to its original shape.
        document.querySelectorAll(`.${MORE}`).forEach((more) => more.remove());
        document
            .querySelectorAll(`[${MARKER}="phrase"]`)
            .forEach((span) =>
                span.replaceWith(document.createTextNode(span.textContent)),
            );
        document.querySelectorAll(`[${MARKER}="done"]`).forEach((element) => {
            element.normalize();
            element.removeAttribute(MARKER);
        });
    }

    function apply() {
        if (!state.enabled) return;
        for (const root of candidateRoots()) {
            if (root.getAttribute(MARKER) === "done") continue;
            wrapElement(root);
        }
    }

    function render() {
        stopObserving();
        unwind();
        if (!state.enabled) return;
        apply();
        startObserving();
    }

    function scheduleApply() {
        if (state.raf) return;
        state.raf = requestAnimationFrame(() => {
            state.raf = null;
            apply();
        });
    }

    function startObserving() {
        if (state.observer || !document.body) return;
        state.observer = new MutationObserver((records) => {
            for (const record of records) {
                if (record.target.nodeType === 1 && isSkippable(record.target)) {
                    continue;
                }
                scheduleApply();
                return;
            }
        });
        state.observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    function stopObserving() {
        if (!state.observer) return;
        state.observer.disconnect();
        state.observer = null;
    }

    function onToggle(event) {
        const span = event.target.closest?.(`.${PHRASE}`);
        if (!span || !span.hasAttribute("data-stretchable")) return;
        event.preventDefault();
        void expand(span);
    }

    document.addEventListener("click", onToggle);
    document.addEventListener(
        "keydown",
        (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            onToggle(event);
        },
        true,
    );
    document.addEventListener("stretchtext:revert", unwind, { once: true });
})();

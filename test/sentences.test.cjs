"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");

const path = require("node:path");

const root = path.join(__dirname, "..");

// lib/sentences.js publishes a global; evaluate it the way a content script
// would, then read the global back.
(new Function(readFileSync(path.join(root, "lib/sentences.js"), "utf8")))();
const { MIN_WORDS, sentences, isStretchable, textUrl, promptFor, expansionText } =
globalThis.Stretchtext;

test("splits prose into sentences", () => {
    const parts = sentences("Hello world. How are you? Fine!");
    assert.deepEqual(parts, ["Hello world. ", "How are you? ", "Fine!"]);
});

test("keeps trailing whitespace with each sentence so rejoining is lossless", () => {
    const source = "One.  Two.\n\nThree";
    const joined = sentences(source).join("");
    assert.equal(joined, source);
});

test("handles prose without terminal punctuation", () => {
    assert.deepEqual(sentences("Just a phrase"), ["Just a phrase"]);
});

test("treats an ellipsis as a sentence boundary", () => {
    const parts = sentences("Wait… then go.");
    assert.equal(parts.length, 2);
});

test("keeps a trailing quote or bracket with its sentence", () => {
    const parts = sentences('He said "stop." Then left.');
    assert.equal(parts[0], 'He said "stop." ');
});

test("marks only sentences with enough words as stretchable", () => {
    assert.equal(isStretchable("Yes."), false);
    assert.equal(isStretchable("This sentence has plenty of words."), true);
    assert.equal(isStretchable("   "), false);
});

test("builds the Pollinations text URL with the key as a query parameter", () => {
    const url = textUrl("Expand this.", "sk_secret", "openai/gpt-5.4-nano");
    const parsed = new URL(url);
    assert.equal(parsed.origin, "https://gen.pollinations.ai");
    assert.equal(parsed.pathname.startsWith("/text/"), true);
    assert.equal(parsed.searchParams.get("key"), "sk_secret");
    assert.equal(parsed.searchParams.get("model"), "openai/gpt-5.4-nano");
    assert.equal(
        decodeURIComponent(parsed.pathname.slice("/text/".length)),
        "Expand this.",
    );
});

test("URL-encodes a prompt that would otherwise break the path", () => {
    const url = textUrl('a/b?c&d "e"', "sk_secret", "m");
    const parsed = new URL(url);
    assert.equal(decodeURIComponent(parsed.pathname.slice("/text/".length)), 'a/b?c&d "e"');
});

test("asks for elaboration only, and names the source sentence", () => {
    const prompt = promptFor("The sky is blue.");
    assert.match(prompt, /2-3 sentences/);
    assert.match(prompt, /Do not repeat the original text/);
    assert.match(prompt, /The sky is blue\./);
});

test("never puts a key in the prompt", () => {
    const prompt = promptFor("Some sentence that is long enough.");
    assert.doesNotMatch(prompt, /sk_/);
});

test("pads an expansion with a space on both sides", () => {
    // Regression: without the trailing space the elaboration ran straight into
    // the next sentence — "installation process.Click any underlined phrase".
    assert.equal(expansionText("Some elaboration."), " Some elaboration. ");
    assert.ok(expansionText("x").endsWith(" "));
    assert.ok(expansionText("x").startsWith(" "));
});

test("trims an expansion the API returned with surrounding whitespace", () => {
    assert.equal(expansionText("\n  Some elaboration.  \n"), " Some elaboration. ");
});

test("exposes a minimum word threshold that matches the content script", () => {
    assert.equal(typeof MIN_WORDS, "number");
    assert.ok(MIN_WORDS >= 3);
});

test("the manifest loads the shared helpers before the content script", () => {
    const manifest = JSON.parse(
        readFileSync(path.join(root, "manifest.json"), "utf8"),
    );
    const scripts = manifest.content_scripts[0].js;
    assert.equal(scripts[0], "lib/sentences.js");
    assert.equal(scripts[1], "content.js");
});

test("the manifest asks only for the hosts it calls", () => {
    const manifest = JSON.parse(
        readFileSync(path.join(root, "manifest.json"), "utf8"),
    );
    assert.deepEqual(manifest.host_permissions, [
        "https://gen.pollinations.ai/*",
        "https://enter.pollinations.ai/*",
    ]);
});

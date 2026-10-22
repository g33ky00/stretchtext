// Opens chrome.storage.session to the content script.
//
// chrome.storage.session defaults to trusted contexts only, so the popup and
// the options page each widen it on load — otherwise the content script cannot
// read the reader's key and every page looks "not connected".
//
// Loaded as a plain script (like lib/sentences.js) because MV3 extension pages
// and content scripts cannot share ES modules.

globalThis.StretchtextStorage = (() => {
    "use strict";

    async function open() {
        try {
            await chrome.storage.session.setAccessLevel({
                accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
            });
        } catch {
            // Older Chrome, or the call is not permitted in this context. The
            // extension still works from the popup and options page; only the
            // content script's direct read is unavailable.
        }
    }

    return { open };
})();

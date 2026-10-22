// Stretchtext background service worker.
//
// Owns the two ways a reader can pay with their own Pollen:
//
//   1. Device flow (BYOP) — the headless path the Pollinations BYOP reference
//      prescribes for CLIs, bots and extensions. It needs no App Key at all; a
//      registered `pk_...` App Key only attributes the traffic to an account.
//   2. Paste a Pollinations secret key (sk_...) — zero configuration.
//
// Storage follows the BYOP checklist: "token kept in memory/sessionStorage;
// expiry handled by re-running the flow". `chrome.storage.session` is the
// extension analogue of sessionStorage — memory-backed, cleared when the
// browser closes. There are no refresh tokens, so the flow is re-run rather
// than the key renewed. The key is only ever sent to gen.pollinations.ai
// (generation) or enter.pollinations.ai (device flow).

const GEN_BASE = "https://gen.pollinations.ai";
const ENTER_BASE = "https://enter.pollinations.ai";

const STORE = chrome.storage.session;

const DEFAULTS = {
    enabled: true,
    model: "openai/gpt-5.4-nano",
    apiKey: "",
    appId: "",
};

async function readSettings() {
    const stored = await STORE.get(Object.keys(DEFAULTS));
    return { ...DEFAULTS, ...stored };
}

function writeSettings(patch) {
    return STORE.set(patch);
}

// ---- device flow ---------------------------------------------------------

async function requestDeviceCode(appId) {
    const response = await fetch(`${ENTER_BASE}/api/device/code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // An empty client_id is accepted; the consent screen then falls back to
        // the redirect hostname and the traffic is unattributed.
        body: JSON.stringify({ client_id: appId || "" }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(body?.error_description || body?.error || `${response.status}`);
    }
    return body;
}

async function pollDeviceToken(deviceCode) {
    const response = await fetch(`${ENTER_BASE}/api/device/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_code: deviceCode }),
    });
    const body = await response.json().catch(() => null);
    if (response.ok && body?.access_token) return body.access_token;
    if (body?.error === "authorization_pending") return null;
    if (body?.error === "slow_down") return { slowDown: true };
    throw new Error(body?.error_description || body?.error || `${response.status}`);
}

// ---- balance -------------------------------------------------------------

async function readBalance(key) {
    const response = await fetch(`${GEN_BASE}/account/balance`, {
        headers: { Authorization: `Bearer ${key}` },
    });
    if (!response.ok) return null;
    const body = await response.json().catch(() => null);
    return body?.balance ?? null;
}

// ---- message surface -----------------------------------------------------

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== "object") return undefined;

    switch (message.type) {
        case "stretchtext/settings":
            void readSettings().then(sendResponse);
            return true;

        case "stretchtext/save":
            void writeSettings(message.patch || {}).then(() =>
                readSettings().then(sendResponse),
            );
            return true;

        case "stretchtext/balance":
            void readSettings()
                .then((settings) =>
                    settings.apiKey
                        ? readBalance(settings.apiKey)
                        : Promise.resolve(null),
                )
                .then(sendResponse);
            return true;

        case "stretchtext/device/start":
            void readSettings()
                .then((settings) => requestDeviceCode(settings.appId))
                .then(sendResponse)
                .catch((error) => sendResponse({ error: String(error.message || error) }));
            return true;

        case "stretchtext/device/poll":
            void pollDeviceToken(message.deviceCode, message.interval)
                .then((token) => sendResponse({ token }))
                .catch((error) => sendResponse({ error: String(error.message || error) }));
            return true;

        default:
            return undefined;
    }
});

// Stretchtext background service worker.
//
// Owns the two ways a reader can pay with their own Pollen:
//
//   1. Paste a Pollinations secret key (sk_...) — zero configuration.
//   2. Connect with the device flow, using a registered App Key (pk_...) as
//      the OAuth client id. The flow returns a scoped user key, so the reader
//      never pastes a long-lived secret into the extension.
//
// Keys live in chrome.storage.local and are only ever sent to gen.pollinations.ai
// (API calls) or enter.pollinations.ai (device flow) — never anywhere else.

const GEN_BASE = "https://gen.pollinations.ai";
const ENTER_BASE = "https://enter.pollinations.ai";

const DEFAULTS = {
    enabled: true,
    model: "openai/gpt-5.4-nano",
    apiKey: "",
    appId: "",
};

async function readSettings() {
    const stored = await chrome.storage.local.get(Object.keys(DEFAULTS));
    return { ...DEFAULTS, ...stored };
}

function writeSettings(patch) {
    return chrome.storage.local.set(patch);
}

// ---- device flow ---------------------------------------------------------

async function requestDeviceCode(appId) {
    const response = await fetch(`${ENTER_BASE}/api/device/code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: appId }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(body?.error_description || body?.error || `${response.status}`);
    }
    return body;
}

async function pollDeviceToken(deviceCode, interval) {
    const response = await fetch(`${ENTER_BASE}/api/device/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_code: deviceCode }),
    });
    const body = await response.json().catch(() => null);
    if (response.ok && body?.access_token) return body.access_token;
    if (body?.error === "authorization_pending") return null;
    if (body?.error === "slow_down") return undefined;
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

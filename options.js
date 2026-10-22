"use strict";

const $ = (id) => document.getElementById(id);

function send(message) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, (response) => {
            resolve(chrome.runtime.lastError ? { error: chrome.runtime.lastError.message } : response);
        });
    });
}

function save(patch) {
    return send({ type: "stretchtext/save", patch });
}

function report(text) {
    $("status").textContent = text;
}

async function load() {
    const settings = await send({ type: "stretchtext/settings" });
    if (settings.error) {
        report(settings.error);
        return;
    }
    $("apiKey").value = settings.apiKey || "";
    $("appId").value = settings.appId || "";
    $("model").value = settings.model || "openai/gpt-5.4-nano";
    $("enabled").checked = settings.enabled !== false;
    report(
        settings.apiKey
            ? "A key is stored. Expansions are billed to it."
            : "No key stored yet.",
    );
}

$("apiKey").addEventListener("change", (event) => {
    void save({ apiKey: event.target.value.trim() }).then(load);
});

$("appId").addEventListener("change", (event) => {
    void save({ appId: event.target.value.trim() });
});

$("model").addEventListener("change", (event) => {
    void save({ model: event.target.value });
});

$("enabled").addEventListener("change", (event) => {
    void save({ enabled: event.target.checked });
});

$("clear").addEventListener("click", () => {
    void save({ apiKey: "" }).then(load);
});

// Device flow: request a code, show where to approve, then poll for the key.
$("device").addEventListener("click", async () => {
    const status = $("deviceStatus");
    status.textContent = "Requesting a device code…";

    const started = await send({ type: "stretchtext/device/start" });
    if (started.error) {
        status.textContent = `Could not start: ${started.error}`;
        return;
    }

    const target = started.verification_uri_complete || started.verification_uri;
    status.innerHTML = "";
    const link = document.createElement("a");
    link.href = target;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = `Approve in your browser (code ${started.user_code})`;
    status.appendChild(link);

    const interval = Math.max(2, started.interval || 5) * 1000;
    const deadline = Date.now() + (started.expires_in || 900) * 1000;

    // RFC 8628: a `slow_down` reply means the client is polling too fast —
    // back off 5s each time instead of hammering the token endpoint.
    let intervalMs = interval;

    const tick = async () => {
        const result = await send({
            type: "stretchtext/device/poll",
            deviceCode: started.device_code,
            interval: started.interval,
        });
        if (result.error) {
            status.textContent = `Device flow failed: ${result.error}`;
            return;
        }
        if (result.token) {
            await save({ apiKey: result.token });
            status.textContent = "Connected. The reader's own Pollen will now be used.";
            await load();
            return;
        }
        if (result.token && result.token.slowDown) {
            intervalMs += 5000;
        }
        if (Date.now() > deadline) {
            status.textContent = "The device code expired. Start again.";
            return;
        }
        setTimeout(() => void tick(), intervalMs);
    };

    setTimeout(() => void tick(), intervalMs);
});

void globalThis.StretchtextStorage?.open().finally(load);

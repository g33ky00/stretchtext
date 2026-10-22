"use strict";

const $ = (id) => document.getElementById(id);

function send(message) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, (response) => {
            resolve(chrome.runtime.lastError ? { error: chrome.runtime.lastError.message } : response);
        });
    });
}

function setStatus(text) {
    $("status").textContent = text;
}

async function refresh() {
    const settings = await send({ type: "stretchtext/settings" });
    if (settings.error) {
        setStatus(settings.error);
        return;
    }
    $("enabled").checked = settings.enabled !== false;
    $("model").value = settings.model || "openai/gpt-5.4-nano";

    if (!settings.apiKey) {
        setStatus("Not connected — connect to start expanding.");
        $("balance").textContent = "";
        return;
    }

    const balance = await send({ type: "stretchtext/balance" });
    if (balance && typeof balance.balance === "number") {
        $("balance").textContent = `${balance.balance} pollen`;
        setStatus("Connected. Click a phrase to expand it.");
    } else if (balance && balance.error) {
        setStatus(`Connected, but the balance could not be read (${balance.error}).`);
        $("balance").textContent = "";
    } else {
        setStatus("Connected. The key was rejected — reconnect with a valid one.");
        $("balance").textContent = "";
    }
}

$("enabled").addEventListener("change", (event) => {
    void send({
        type: "stretchtext/save",
        patch: { enabled: event.target.checked },
    }).then(() => {
        setStatus(event.target.checked ? "Enabled." : "Disabled — the page is back to normal.");
    });
});

$("model").addEventListener("change", (event) => {
    void send({ type: "stretchtext/save", patch: { model: event.target.value } });
});

$("connect").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
});

void refresh();

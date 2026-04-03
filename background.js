// background.js — Proxies requests from content scripts to local Ollama instance.
// This avoids CORS/mixed-content issues since the service worker can fetch
// http://localhost freely, while content scripts on https://chatgpt.com cannot.

const OLLAMA_BASE = "http://localhost:11434";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "ollama") {
    const t0 = performance.now();
    const model = request.payload?.model || "?";
    const userMsg =
      request.payload?.messages?.find((m) => m.role === "user")?.content || "";
    const preview = userMsg.slice(0, 120) + (userMsg.length > 120 ? "…" : "");
    console.log(
      `[Ollama] ➜ ${request.endpoint} model=${model}\n  user: "${preview}"`
    );

    fetchOllama(request.endpoint, request.payload)
      .then((data) => {
        const ms = (performance.now() - t0).toFixed(0);
        const reply = data.message?.content || JSON.stringify(data).slice(0, 200);
        console.log(
          `[Ollama] ✓ ${request.endpoint} (${ms}ms)\n  response: ${reply.slice(0, 300)}`
        );
        sendResponse(data);
      })
      .catch((err) => {
        const ms = (performance.now() - t0).toFixed(0);
        console.error(`[Ollama] ✗ ${request.endpoint} (${ms}ms): ${err.message}`);
        sendResponse({ error: err.message });
      });
    return true; // keep the message channel open for async response
  }
});

async function fetchOllama(endpoint, payload) {
  const url = `${OLLAMA_BASE}${endpoint}`;
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new Error(
      `Cannot reach Ollama at ${OLLAMA_BASE}. Is Ollama running? (${err.message})`
    );
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Ollama ${response.status}: ${text}`);
  }

  return await response.json();
}

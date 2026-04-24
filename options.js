// Transformers.js supports only "simple" and "none" (unlike Python transformers,
// which also supports "first" / "average" / "max").
const VALID_AGGREGATIONS = ["simple", "none"];
const DEFAULT_AGGREGATION = "simple";
const DEFAULT_THRESHOLD = 0;

document.getElementById("saveButton").addEventListener("click", () => {
  const apiKey = document.getElementById("apiKey").value;
  const ollamaModel = document.getElementById("ollamaModel").value.trim() || "llama3";
  const detectionMode = document.querySelector(
    'input[name="detectionMode"]:checked'
  ).value;

  const aggregationRaw = document.getElementById("privacyFilterAggregation").value;
  const privacyFilterAggregation = VALID_AGGREGATIONS.includes(aggregationRaw)
    ? aggregationRaw
    : DEFAULT_AGGREGATION;

  const thresholdRaw = parseFloat(
    document.getElementById("privacyFilterThreshold").value
  );
  const privacyFilterThreshold = Number.isFinite(thresholdRaw)
    ? Math.min(Math.max(thresholdRaw, 0), 1)
    : DEFAULT_THRESHOLD;

  chrome.storage.sync.set(
    {
      openaiApiKey: apiKey,
      ollamaModel,
      detectionMode,
      privacyFilterAggregation,
      privacyFilterThreshold,
    },
    () => {
      alert("Settings saved.");
    }
  );
});

chrome.storage.sync.get(
  [
    "openaiApiKey",
    "ollamaModel",
    "detectionMode",
    "privacyFilterAggregation",
    "privacyFilterThreshold",
  ],
  (result) => {
    if (result.openaiApiKey) {
      document.getElementById("apiKey").value = result.openaiApiKey;
    }
    if (result.ollamaModel) {
      document.getElementById("ollamaModel").value = result.ollamaModel;
    }
    if (result.detectionMode) {
      const radio = document.querySelector(
        `input[name="detectionMode"][value="${result.detectionMode}"]`
      );
      if (radio) radio.checked = true;
    }
    if (VALID_AGGREGATIONS.includes(result.privacyFilterAggregation)) {
      document.getElementById("privacyFilterAggregation").value =
        result.privacyFilterAggregation;
    }
    if (
      typeof result.privacyFilterThreshold === "number" &&
      result.privacyFilterThreshold >= 0 &&
      result.privacyFilterThreshold <= 1
    ) {
      document.getElementById("privacyFilterThreshold").value = String(
        result.privacyFilterThreshold
      );
    }
    updateSections();
  }
);

// Show/hide sections based on detection mode
function updateSections() {
  const mode = document.querySelector('input[name="detectionMode"]:checked').value;
  document.getElementById("privacyFilterSection").style.display = mode === "privacy_filter" ? "" : "none";
  document.getElementById("ollamaSection").style.display = mode === "ondevice" ? "" : "none";
  document.getElementById("presidioSection").style.display = mode === "presidio" ? "" : "none";
}

document.querySelectorAll('input[name="detectionMode"]').forEach((radio) => {
  radio.addEventListener("change", updateSections);
});

document.getElementById("viewStoredDataButton").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("mappings.html") });
});

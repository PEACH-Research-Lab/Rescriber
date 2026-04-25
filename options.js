// Transformers.js supports only "simple" and "none" (unlike Python transformers,
// which also supports "first" / "average" / "max").
const VALID_AGGREGATIONS = ["simple", "none"];
const DEFAULT_AGGREGATION = "simple";
const DEFAULT_THRESHOLD = 0;
const VALID_SEGMENTATIONS = ["sentence", "whole"];
const DEFAULT_SEGMENTATION = "whole";

document.getElementById("saveButton").addEventListener("click", () => {
  const apiKey = document.getElementById("apiKey").value;
  const ollamaModel = document.getElementById("ollamaModel").value.trim() || "llama3";
  const detectionMode = document.querySelector(
    'input[name="detectionMode"]:checked'
  ).value;
  const debugLogging = document.getElementById("debugLogging").checked;

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

  const segmentationRaw = document.getElementById("privacyFilterSegmentation").value;
  const privacyFilterSegmentation = VALID_SEGMENTATIONS.includes(segmentationRaw)
    ? segmentationRaw
    : DEFAULT_SEGMENTATION;

  // API key goes to storage.local so it isn't replicated via Google account
  // sync. Other settings stay in sync — they're not secrets and users expect
  // them to follow them across devices.
  chrome.storage.local.set({ openaiApiKey: apiKey });
  chrome.storage.sync.set(
    {
      ollamaModel,
      detectionMode,
      privacyFilterAggregation,
      privacyFilterThreshold,
      privacyFilterSegmentation,
      debugLogging,
    },
    () => {
      alert("Settings saved.");
    }
  );
});

(async () => {
  // One-shot migration: any prior install stored the API key in storage.sync.
  // Move it to storage.local on first load of the new options page, then
  // remove the sync copy.
  const localKey = await chrome.storage.local.get(["openaiApiKey"]);
  if (!localKey.openaiApiKey) {
    const syncKey = await chrome.storage.sync.get(["openaiApiKey"]);
    if (syncKey.openaiApiKey) {
      await chrome.storage.local.set({ openaiApiKey: syncKey.openaiApiKey });
      await chrome.storage.sync.remove("openaiApiKey");
    }
  }

  const localData = await chrome.storage.local.get(["openaiApiKey"]);
  const syncData = await chrome.storage.sync.get([
    "ollamaModel",
    "detectionMode",
    "privacyFilterAggregation",
    "privacyFilterThreshold",
    "privacyFilterSegmentation",
    "debugLogging",
  ]);

  if (localData.openaiApiKey) {
    document.getElementById("apiKey").value = localData.openaiApiKey;
  }
  if (syncData.ollamaModel) {
    document.getElementById("ollamaModel").value = syncData.ollamaModel;
  }
  if (syncData.detectionMode) {
    const radio = document.querySelector(
      `input[name="detectionMode"][value="${syncData.detectionMode}"]`
    );
    if (radio) radio.checked = true;
  }
  if (VALID_AGGREGATIONS.includes(syncData.privacyFilterAggregation)) {
    document.getElementById("privacyFilterAggregation").value =
      syncData.privacyFilterAggregation;
  }
  if (
    typeof syncData.privacyFilterThreshold === "number" &&
    syncData.privacyFilterThreshold >= 0 &&
    syncData.privacyFilterThreshold <= 1
  ) {
    document.getElementById("privacyFilterThreshold").value = String(
      syncData.privacyFilterThreshold
    );
  }
  if (VALID_SEGMENTATIONS.includes(syncData.privacyFilterSegmentation)) {
    document.getElementById("privacyFilterSegmentation").value =
      syncData.privacyFilterSegmentation;
  }
  document.getElementById("debugLogging").checked = !!syncData.debugLogging;
  updateSections();
})();

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

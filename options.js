document.getElementById("saveButton").addEventListener("click", () => {
  const apiKey = document.getElementById("apiKey").value;
  const ollamaModel = document.getElementById("ollamaModel").value.trim() || "llama3";
  const detectionMode = document.querySelector(
    'input[name="detectionMode"]:checked'
  ).value;

  chrome.storage.sync.set({ openaiApiKey: apiKey, ollamaModel, detectionMode }, () => {
    alert("Settings saved.");
  });
});

chrome.storage.sync.get(["openaiApiKey", "ollamaModel", "detectionMode"], (result) => {
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
  updateSections();
});

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

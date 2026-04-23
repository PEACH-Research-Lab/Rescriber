## Install Rescriber

### Easiest: prebuilt release (recommended)

1. Download `rescriber-v1.0.0.zip` from the
   [latest release](https://github.com/PEACH-Research-Lab/Rescriber_frontend_ondevice/releases/latest).
   It already bundles the Transformers.js + ONNX Runtime Web assets under
   `vendor/`, so no extra downloads are required.
2. Unzip it. You'll get a folder named `rescriber-v1.0.0/`.
3. Open Chrome and go to `chrome://extensions/`.
4. Enable **Developer mode** (top-right toggle)
   ![image](https://github.com/jigglypuff96/inline_pii_replacer/assets/49411569/9c89c2e2-498f-4b1f-93cd-4ae168d2f01e)
5. Click **Load unpacked**.
6. Select the unzipped `rescriber-v1.0.0/` folder.
7. Go to ChatGPT and try it out. The first detection downloads the
   `openai/privacy-filter` model (~30–50 MB, cached afterwards).

https://github.com/jigglypuff96/inline_pii_replacer/assets/49411569/fcf3a176-baf0-4eee-b01d-790751406ebc

### From source (developers)

1. Clone this repo.
2. Fetch the Transformers.js vendor bundle used by the default "Privacy Filter"
   detection mode. Transformers.js 4.2.0+ is required — earlier versions do
   not support the `openai_privacy_filter` model class.
   ```
   cd vendor
   curl -L -O https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/dist/transformers.min.js
   # ONNX Runtime Web assets (single-threaded WebGPU uses the asyncify variant;
   # jsep is kept as a fallback).
   ORT=https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0-dev.20260416-b7804b056c/dist
   curl -L -O $ORT/ort-wasm-simd-threaded.asyncify.mjs
   curl -L -O $ORT/ort-wasm-simd-threaded.asyncify.wasm
   curl -L -O $ORT/ort-wasm-simd-threaded.jsep.mjs
   curl -L -O $ORT/ort-wasm-simd-threaded.jsep.wasm
   ```
3. Load the repo folder via `chrome://extensions/` → **Load unpacked** as above.

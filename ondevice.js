// ondevice.js — Calls Ollama via the background service worker.
// Prompts mirror those in openai.js so both backends produce the same output format.

const OLLAMA_MODEL = "llama3";

const DETECT_SYSTEM_PROMPT = `You an expert in cybersecurity and data privacy. You are now tasked to detect PII from the given text, using the following taxonomy only:

  ADDRESS
  IP_ADDRESS
  URL
  SSN
  PHONE_NUMBER
  EMAIL
  DRIVERS_LICENSE
  PASSPORT_NUMBER
  TAXPAYER_IDENTIFICATION_NUMBER
  ID_NUMBER
  NAME
  USERNAME

  KEYS: Passwords, passkeys, API keys, encryption keys, and any other form of security keys.
  GEOLOCATION: Places and locations, such as cities, provinces, countries, international regions, or named infrastructures (bus stops, bridges, etc.).
  AFFILIATION: Names of organizations, such as public and private companies, schools, universities, public institutions, prisons, healthcare institutions, non-governmental organizations, churches, etc.
  DEMOGRAPHIC_ATTRIBUTE: Demographic attributes of a person, such as native language, descent, heritage, ethnicity, nationality, religious or political group, birthmarks, ages, sexual orientation, gender and sex.
  TIME: Description of a specific date, time, or duration.
  HEALTH_INFORMATION: Details concerning an individual's health status, medical conditions, treatment records, and health insurance information.
  FINANCIAL_INFORMATION: Financial details such as bank account numbers, credit card numbers, investment records, salary information, and other financial statuses or activities.
  EDUCATIONAL_RECORD: Educational background details, including academic records, transcripts, degrees, and certification.

    For the given message that a user sends to a chatbot, identify all the personally identifiable information using the above taxonomy only, and the entity_type should be selected from the all-caps categories.
    Note that the information should be related to a real person not in a public context, but okay if not uniquely identifiable.
    Result should be in its minimum possible unit.
    Return me ONLY a json in the following format: {"results": [{"entity_type": YOU_DECIDE_THE_PII_TYPE, "text": PART_OF_MESSAGE_YOU_IDENTIFIED_AS_PII}]}`;

const CLUSTER_SYSTEM_PROMPT = `For the given message, find ALL segments of the message with the same contextual meaning as the given PII. Consider segments that are semantically related or could be inferred from the original PII or share a similar context or meaning. List all of them in a list, and each segment should only appear once in each list.  Please return only in JSON format. Each PII provided will be a key, and its value would be the list PIIs (include itself) that has the same contextual meaning.

  Example 1:
  Input:
  <message>I will be the valedictorian of my class. Please write me a presentation based on the following information: As a student at Vanderbilt University, I feel honored. The educational journey at Vandy has been nothing less than enlightening. The dedicated professors here at Vanderbilt are the best. As an 18 year old student at VU, the opportunities are endless.</message>
  <pii1>Vanderbilt University</pii1>
  <pii2>18 year old</pii2>
  <pii3>VU</pii3>
  Expected JSON output:
  {'Vanderbilt University': ['Vanderbilt University', 'Vandy', 'VU', 'Vanderbilt'], '18 year old':['18 year old'], 'VU':[ 'VU', 'Vanderbilt University', 'Vandy', 'Vanderbilt']}

  Example 2:
  Input:
  <message>Do you know Bill Gates and the company he founded, Microsoft? Can you send me an article about how he founded it to my email at jeremyKwon@gmail.com please?</message>
  <pii1>Bill Gates</pii1>
  <pii2>jeremyKwon@gmail.com</pii2>
  Expected JSON output:
  {'Bill Gates': ['Bill Gates', 'Microsoft'], 'jeremyKwon@gmail.com':['jeremyKwon@gmail.com']}`;

const ABSTRACT_SYSTEM_PROMPT = `Rewrite the text to abstract the protected information. For each protected item, return the original and its abstracted replacement. Do not change other parts of the text. Return ONLY a JSON in the following format: {"results": [{"protected": ORIGINAL_TEXT, "abstracted": REPLACEMENT_TEXT}]}`;

// Helper: send a request to Ollama through the background service worker
function callOllama(messages, format = "json") {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: "ollama",
        endpoint: "/api/chat",
        payload: {
          model: OLLAMA_MODEL,
          messages,
          stream: false,
          format,
          options: { temperature: 0 },
        },
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response?.error) {
          reject(new Error(response.error));
          return;
        }
        resolve(response);
      }
    );
  });
}

export async function getOnDeviceResponseDetect(userMessage, onResultCallback) {
  console.log("[ondevice:detect] Input:", userMessage.slice(0, 200));
  const t0 = performance.now();

  const response = await callOllama([
    { role: "system", content: DETECT_SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ]);

  const ms = (performance.now() - t0).toFixed(0);
  console.log(`[ondevice:detect] Raw response (${ms}ms):`, response.message?.content);

  let content;
  try {
    content = JSON.parse(response.message.content);
  } catch (e) {
    console.error("[ondevice:detect] JSON parse failed:", response.message?.content, e);
    return [];
  }

  const results = content.results || [];
  console.log(`[ondevice:detect] Parsed ${results.length} entities:`, results);
  if (results.length > 0 && onResultCallback) {
    await onResultCallback(results);
  }
  return results;
}

export async function getOnDeviceResponseCluster(userMessageCluster) {
  console.log("[ondevice:cluster] Input:", userMessageCluster.slice(0, 200));
  const t0 = performance.now();

  const response = await callOllama([
    { role: "system", content: CLUSTER_SYSTEM_PROMPT },
    { role: "user", content: userMessageCluster },
  ]);

  const ms = (performance.now() - t0).toFixed(0);
  console.log(`[ondevice:cluster] Raw response (${ms}ms):`, response.message?.content);

  let content;
  try {
    content =
      typeof response.message.content === "string"
        ? response.message.content
        : JSON.stringify(response.message.content);
  } catch (e) {
    console.error("[ondevice:cluster] Parse failed:", e);
    return "{}";
  }
  return content;
}

export async function getOnDeviceAbstractResponse(
  originalMessage,
  currentMessage,
  abstractList,
  onResultCallback
) {
  const userPrompt = `Text: ${currentMessage}\nProtected information: ${abstractList.join(", ")}`;
  console.log("[ondevice:abstract] Input:", userPrompt.slice(0, 200));
  const t0 = performance.now();

  const response = await callOllama([
    { role: "system", content: ABSTRACT_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ]);

  const ms = (performance.now() - t0).toFixed(0);
  console.log(`[ondevice:abstract] Raw response (${ms}ms):`, response.message?.content);

  let content;
  try {
    content = JSON.parse(response.message.content);
  } catch (e) {
    console.error("[ondevice:abstract] JSON parse failed:", response.message?.content, e);
    return;
  }

  console.log("[ondevice:abstract] Parsed results:", content.results);
  if (content.results && onResultCallback) {
    await onResultCallback(content.results);
  }
}

"""
Presidio PII detection server for Rescriber.

Usage:
    pip install presidio-analyzer presidio-anonymizer flask flask-cors
    python -m spacy download en_core_web_lg
    python presidio_server.py

Runs on http://localhost:5002 by default.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from presidio_analyzer import AnalyzerEngine, RecognizerResult

app = Flask(__name__)
CORS(app)

analyzer = AnalyzerEngine()

# Map Presidio entity types to Rescriber entity types
PRESIDIO_TO_RESCRIBER = {
    "PERSON": "NAME",
    "EMAIL_ADDRESS": "EMAIL",
    "PHONE_NUMBER": "PHONE_NUMBER",
    "LOCATION": "ADDRESS",
    "US_SSN": "SSN",
    "IP_ADDRESS": "IP_ADDRESS",
    "URL": "URL",
    "US_DRIVER_LICENSE": "DRIVERS_LICENSE",
    "US_PASSPORT": "PASSPORT_NUMBER",
    "US_ITIN": "TAXPAYER_IDENTIFICATION_NUMBER",
    "US_BANK_NUMBER": "FINANCIAL_INFORMATION",
    "CREDIT_CARD": "FINANCIAL_INFORMATION",
    "IBAN_CODE": "FINANCIAL_INFORMATION",
    "CRYPTO": "KEYS",
    "NRP": "DEMOGRAPHIC_ATTRIBUTE",
    "DATE_TIME": "TIME",
    "AGE": "DEMOGRAPHIC_ATTRIBUTE",
    "AU_ABN": "ID_NUMBER",
    "AU_ACN": "ID_NUMBER",
    "AU_TFN": "TAXPAYER_IDENTIFICATION_NUMBER",
    "AU_MEDICARE": "HEALTH_INFORMATION",
    "UK_NHS": "HEALTH_INFORMATION",
    "SG_NRIC_FIN": "ID_NUMBER",
    "MEDICAL_LICENSE": "HEALTH_INFORMATION",
    "IN_PAN": "TAXPAYER_IDENTIFICATION_NUMBER",
    "IN_AADHAAR": "ID_NUMBER",
    "IN_VEHICLE_REGISTRATION": "ID_NUMBER",
    "IN_PASSPORT": "PASSPORT_NUMBER",
}

# Presidio entity types to request (all built-in recognizers)
ENTITIES_TO_ANALYZE = list(PRESIDIO_TO_RESCRIBER.keys())


@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    text = data.get("text", "")
    language = data.get("language", "en")
    score_threshold = data.get("score_threshold", 0.4)

    if not text:
        return jsonify({"results": []})

    results = analyzer.analyze(
        text=text,
        entities=ENTITIES_TO_ANALYZE,
        language=language,
        score_threshold=score_threshold,
    )

    # Convert to Rescriber format
    entities = []
    seen = set()
    for result in sorted(results, key=lambda r: r.start):
        entity_text = text[result.start : result.end]
        rescriber_type = PRESIDIO_TO_RESCRIBER.get(result.entity_type)
        if not rescriber_type:
            continue
        key = (rescriber_type, entity_text)
        if key in seen:
            continue
        seen.add(key)
        entities.append(
            {
                "entity_type": rescriber_type,
                "text": entity_text,
                "score": round(result.score, 3),
            }
        )

    return jsonify({"results": entities})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    print("Starting Presidio server on http://localhost:5002")
    app.run(host="localhost", port=5002, debug=False)

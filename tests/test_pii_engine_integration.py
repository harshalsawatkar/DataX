from backend.core.pii_classifier import (
    generate_synthetic_aadhaar,
    generate_synthetic_gstin,
    generate_synthetic_pan,
    is_valid_aadhaar,
    is_valid_gstin,
    is_valid_pan,
)
from backend.engines.ai_firewall_engine import intercept_agent_tool_call, scan_single_chunk
from backend.engines.consensus_engine import compute_layer1_stats
from backend.engines.ml_certification_engine import (
    _sanitize_sft_text,
    certify_sft_jsonl_dataset,
)
from backend.engines.privacy_gateway_engine import TokenVault, anonymize_text


def test_ai_firewall_redacts_classifier_pii_in_chunks_and_tool_arguments(monkeypatch):
    aadhaar = generate_synthetic_aadhaar(seed=21)
    chunk = scan_single_chunk(
        f"customer identifier {aadhaar}",
        policy={"redactSsnAndCards": True},
    )
    assert aadhaar not in chunk["sanitizedText"]
    assert "[REDACTED_AADHAAR]" in chunk["sanitizedText"]

    monkeypatch.setattr(
        "backend.engines.ai_firewall_engine.get_active_firewall_policy",
        lambda _policy_id: {},
    )
    tool_result = intercept_agent_tool_call({
        "tool_name": "lookup_customer",
        "arguments": {"identity": aadhaar},
        "policies": {"redact_pii_in_args": True},
    })
    assert tool_result["isRedacted"]
    assert tool_result["sanitizedArguments"]["identity"] == "[REDACTED_AADHAAR]"


def test_privacy_gateway_format_preserving_pii_round_trip():
    values = [
        generate_synthetic_aadhaar(seed=31),
        generate_synthetic_pan(seed=32),
        generate_synthetic_gstin(seed=33, state_code="27"),
    ]
    original = " | ".join(values)
    vault = TokenVault()
    policy = {
        "action_prompt_injection": "ALLOW",
        "action_secrets": "MASK",
        "action_ssn_cards": "TOKENIZE",
        "action_emails_phones": "TOKENIZE",
        "pseudonymization_mode": "FORMAT_PRESERVING",
    }

    anonymized, detected = anonymize_text(
        original,
        "pii-integration-session",
        policy=policy,
        vault=vault,
    )

    assert len(detected) == 3
    assert anonymized != original
    assert anonymized.split(" | ")[0].startswith("9999")
    assert is_valid_aadhaar(anonymized.split(" | ")[0])
    assert is_valid_pan(anonymized.split(" | ")[1])
    assert is_valid_gstin(anonymized.split(" | ")[2])
    assert vault.detokenize_text("pii-integration-session", anonymized) == original


def test_consensus_engine_reports_classified_values_without_raw_pii():
    aadhaar = generate_synthetic_aadhaar(seed=41)
    stats = compute_layer1_stats([
        {"aadhaar": aadhaar, "customer_name": "Sample Customer"},
    ])

    assert any(item["type"] == "SENSITIVE_COLUMN_NAME" for item in stats["detectedPii"])
    assert any(item["type"] == "AADHAAR" for item in stats["detectedPii"])
    assert all(aadhaar not in item["sample"] for item in stats["detectedPii"])


def test_ml_certification_uses_shared_classifier_for_redaction_and_safe_tags():
    aadhaar = generate_synthetic_aadhaar(seed=51)
    pan = generate_synthetic_pan(seed=52)
    secret = "password=TEST_ONLY_NOT_A_CREDENTIAL"

    sanitized, tags = _sanitize_sft_text(
        f"Identity {aadhaar}; PAN {pan}; {secret}",
        redact_secrets_pii=True,
        redact_emails_phones=False,
    )

    assert aadhaar not in sanitized
    assert pan not in sanitized
    assert secret not in sanitized
    assert {"PII:AADHAAR", "PII:PAN", "SECRET:GENERIC_SECRET"} <= set(tags)


def test_ml_certification_returns_redacted_records_and_diagnostics():
    aadhaar = generate_synthetic_aadhaar(seed=61)
    certification = certify_sft_jsonl_dataset(
        [{
            "prompt": f"Look up customer {aadhaar}",
            "completion": f"Verified customer identity {aadhaar} in the record.",
        }],
        remediate_options={"redactSecretsAndPii": True},
    )

    record = certification["sanitizedRecords"][0]
    assert aadhaar not in record["prompt"]
    assert aadhaar not in record["completion"]
    assert certification["piiLeaksFound"] == 0
    assert aadhaar not in str(certification["pairDiagnostics"])

"""
Unit Tests for DataX DPDP 2025 & Global PII Classifier (Task S1-09 Gate)
=======================================================================
Verifies:
  1. Aadhaar: Positive Verhoeff D5 validation & ZERO false-positives on 12-digit order IDs.
  2. PAN: Valid status character checks & reject invalid formats.
  3. GSTIN: Exact Modulo-36 check character validation.
  4. Credit Card: Luhn Modulo-10 checksum validation.
  5. Indian Mobile: +91 / 0 prefix and legitimate 6-9 leading digit.
  6. IFSC: 5th character '0' guard and length.
  7. UPI VPA: Distinguishing UPI handles from standard email domains.
  8. US SSN: Invalid area/group number rejection.
  9. API Secrets: AWS, OpenAI, GitHub token detection.
  10. scan_text & redact_text: Full pipeline integration across complex text.
"""

import os
import sys
import pytest

# Ensure backend/core is in sys.path
backend_core = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "core"))
if backend_core not in sys.path:
    sys.path.insert(0, backend_core)

from pii_classifier import (
    PIIClassifier,
    get_pii_classifier,
    is_valid_aadhaar,
    is_valid_pan,
    is_valid_gstin,
    is_valid_ifsc,
    is_valid_upi,
    is_valid_indian_mobile,
    is_valid_luhn_credit_card,
    is_valid_ssn,
    is_valid_email,
    generate_verhoeff_check_digit
)


@pytest.fixture
def classifier():
    return get_pii_classifier()


# -----------------------------------------------------------------------------
# 1. Aadhaar (Verhoeff D5) Tests (Positive & Negative)
# -----------------------------------------------------------------------------
def test_aadhaar_valid_verhoeff():
    """Assert valid 12-digit numbers with correct Verhoeff checksum pass."""
    assert is_valid_aadhaar("543210987652") is True
    assert is_valid_aadhaar("5432 1098 7652") is True
    assert is_valid_aadhaar("5432-1098-7652") is True

    # Generate a second dynamic test vector
    base = "98765432109"
    check = generate_verhoeff_check_digit(base)
    assert is_valid_aadhaar(base + str(check)) is True


def test_aadhaar_invalid_order_id_false_positive_guard():
    """CRITICAL: Arbitrary 12-digit order IDs must NOT be flagged as Aadhaar."""
    # 123456789012 fails Verhoeff D5
    assert is_valid_aadhaar("123456789012") is False
    assert is_valid_aadhaar("999999999999") is False
    assert is_valid_aadhaar("888888888888") is False


def test_aadhaar_invalid_leading_digits_and_length():
    """Aadhaar cannot start with 0 or 1, and must be exactly 12 digits."""
    assert is_valid_aadhaar("012345678901") is False
    assert is_valid_aadhaar("123456789018") is False
    assert is_valid_aadhaar("54321098765") is False  # 11 digits
    assert is_valid_aadhaar("5432109876521") is False  # 13 digits


# -----------------------------------------------------------------------------
# 2. PAN (Permanent Account Number) Tests
# -----------------------------------------------------------------------------
def test_pan_valid_individual_and_company():
    """Assert valid PAN structures with standard 4th-char status codes pass."""
    assert is_valid_pan("ABCPE1234F") is True  # 4th char 'P' - Individual / Person
    assert is_valid_pan("AAACB1234F") is True  # 4th char 'C' - Company
    assert is_valid_pan("AAAFB1234F") is True  # 4th char 'F' - Firm / LLP
    assert is_valid_pan("AAATB1234F") is True  # 4th char 'T' - Trust


def test_pan_invalid_status_character_and_length():
    """Assert invalid 4th-char or incorrect format fails."""
    assert is_valid_pan("ABCDX1234F") is False  # 'X' is not a valid PAN entity type
    assert is_valid_pan("ABCDE1234F") is False  # 'D' is not a valid PAN entity type
    assert is_valid_pan("ABCD12345F") is False  # 4th char is a digit
    assert is_valid_pan("ABCDE1234") is False   # 9 chars
    assert is_valid_pan("ABCDE12345F") is False  # 11 chars


# -----------------------------------------------------------------------------
# 3. GSTIN (Modulo-36 Checksum) Tests
# -----------------------------------------------------------------------------
def test_gstin_valid_modulo36():
    """Assert valid 15-char GSTIN with state code and Modulo-36 checksum passes."""
    # 29 (Karnataka) + ABCPE1234F (PAN) + 1 + Z + 7 (Modulo-36 checksum)
    valid_gstin = "29ABCPE1234F1Z7"
    assert is_valid_gstin(valid_gstin) is True


def test_gstin_invalid_checksum_or_state():
    """Assert tampered checksum char, wrong 14th char, or invalid state fails."""
    assert is_valid_gstin("29ABCPE1234F1Z8") is False  # Checksum tampered ('8' != '7')
    assert is_valid_gstin("29ABCPE1234F1A7") is False  # 14th char must be 'Z'
    assert is_valid_gstin("00ABCPE1234F1Z7") is False  # State code '00' does not exist
    assert is_valid_gstin("29ABCDX1234F1ZW") is False  # Embedded PAN is invalid


# -----------------------------------------------------------------------------
# 4. Credit Card (Luhn Modulo-10) Tests
# -----------------------------------------------------------------------------
def test_credit_card_valid_luhn():
    """Assert valid Visa and Mastercard numbers passing Luhn test return True."""
    assert is_valid_luhn_credit_card("4532 0150 0000 0007") is True
    assert is_valid_luhn_credit_card("4532-0150-0000-0007") is True
    assert is_valid_luhn_credit_card("4532015000000007") is True


def test_credit_card_invalid_luhn():
    """Assert single-digit corruption fails Luhn checksum."""
    assert is_valid_luhn_credit_card("4532 0150 0000 0008") is False
    assert is_valid_luhn_credit_card("1234567812345678") is False
    assert is_valid_luhn_credit_card("12345") is False  # Too short


# -----------------------------------------------------------------------------
# 5. Indian Mobile & Contact PII Tests
# -----------------------------------------------------------------------------
def test_indian_mobile_valid():
    """Assert valid Indian mobile numbers with prefixes pass."""
    assert is_valid_indian_mobile("+91 9876543210") is True
    assert is_valid_indian_mobile("+91-8123456789") is True
    assert is_valid_indian_mobile("09123456789") is True
    assert is_valid_indian_mobile("7012345678") is True
    assert is_valid_indian_mobile("6312345678") is True


def test_indian_mobile_invalid():
    """Assert non-Indian or invalid leading digits fail."""
    assert is_valid_indian_mobile("5012345678") is False  # Starts with 5
    assert is_valid_indian_mobile("1234567890") is False  # Starts with 1
    assert is_valid_indian_mobile("+1 555-0199") is False


def test_ifsc_code():
    """Assert valid IFSC codes pass and invalid 5th-char fails."""
    assert is_valid_ifsc("SBIN0001234") is True
    assert is_valid_ifsc("HDFC0000123") is True
    assert is_valid_ifsc("SBIN1001234") is False  # 5th char must be '0'
    assert is_valid_ifsc("SBI0001234") is False   # Too short


def test_upi_vpa():
    """Assert UPI VPA addresses pass and standard web emails are excluded."""
    assert is_valid_upi("harshal@okhdfcbank") is True
    assert is_valid_upi("merchant.99@upi") is True
    assert is_valid_upi("payments@paytm") is True
    assert is_valid_upi("someone@gmail.com") is False  # Web email, not UPI handle


def test_us_ssn():
    """Assert valid SSN passes and invalid area numbers are rejected."""
    assert is_valid_ssn("123-45-6789") is True
    assert is_valid_ssn("000-12-3456") is False  # Area 000
    assert is_valid_ssn("666-12-3456") is False  # Area 666
    assert is_valid_ssn("912-34-5678") is False  # Area 900+


# -----------------------------------------------------------------------------
# 6. Classifier Pipeline (scan_text & redact_text) Integration
# -----------------------------------------------------------------------------
def test_scan_text_mixed_payload(classifier):
    """Verifies that scan_text detects and classifies multiple PII types accurately."""
    sample_text = (
        "Customer Rajesh Kumar (PAN: ABCPE1234F, Aadhaar: 5432 1098 7652) "
        "paid via card 4532 0150 0000 0007. GSTIN: 29ABCPE1234F1Z7. "
        "Contact: +91 9876543210 or rajesh@example.com. "
        "System order ID 123456789012 was processed."
    )

    detections = classifier.scan_text(sample_text)
    subtypes = [d.subtype for d in detections]

    assert "PAN" in subtypes
    assert "AADHAAR" in subtypes
    assert "CREDIT_CARD" in subtypes
    assert "GSTIN" in subtypes
    assert "INDIAN_MOBILE" in subtypes
    assert "EMAIL" in subtypes

    # Crucial check: Order ID 123456789012 MUST NOT be detected as Aadhaar
    order_id_matches = [d for d in detections if d.raw_value == "123456789012"]
    assert len(order_id_matches) == 0


def test_redact_text_sanitization(classifier):
    """Verifies that redact_text replaces all sensitive PII with masked tokens."""
    sample = "Transfer ₹50,000 to Aadhaar 5432 1098 7652 or card 4532 0150 0000 0007."
    redacted = classifier.redact_text(sample)

    assert "5432 1098 7652" not in redacted
    assert "4532 0150 0000 0007" not in redacted
    assert "XXXX-XXXX-7652" in redacted or "[REDACTED_AADHAAR]" in redacted
    assert "****-****-****-0007" in redacted or "[REDACTED_CARD]" in redacted


def test_secret_detection_aws_and_openai(classifier):
    """Verifies detection of raw API credentials."""
    sample = "Connecting to AWS using AKIAIOSFODNN7EXAMPLE and OpenAI key sk-proj-abc123def456ghi789jkl012mno."
    detections = classifier.scan_text(sample)
    subtypes = [d.subtype for d in detections]

    assert "AWS_ACCESS_KEY" in subtypes
    assert "OPENAI_API_KEY" in subtypes


def test_classify_standalone_values(classifier):
    """Verifies standalone single-value classification."""
    d1 = classifier.classify_value("543210987652")
    assert d1 is not None and d1.subtype == "AADHAAR"

    d2 = classifier.classify_value("ABCPE1234F")
    assert d2 is not None and d2.subtype == "PAN"

    d3 = classifier.classify_value("4532015000000007")
    assert d3 is not None and d3.subtype == "CREDIT_CARD"

    d4 = classifier.classify_value("random_inventory_sku_998877")
    assert d4 is None


def test_hindi_english_mixed_prompt(classifier):
    """Verifies accurate PII detection and redaction in mixed Hindi/English prompts."""
    mixed_text = "कृपया ग्राहक का पैन ABCPE1234F और आधार 5432 1098 7652 तुरंत सत्यापित करें।"
    detections = classifier.scan_text(mixed_text)
    subtypes = [d.subtype for d in detections]

    assert "PAN" in subtypes
    assert "AADHAAR" in subtypes

    redacted = classifier.redact_text(mixed_text)
    assert "ABCPE1234F" not in redacted
    assert "5432 1098 7652" not in redacted
    assert "कृपया ग्राहक का पैन" in redacted


def test_fpe_synthetic_generation_and_roundtrip_detokenize():
    """
    Task S1-10 Gate: Verifies FPE synthetic generation for Aadhaar, PAN, GSTIN
    and round-trip tokenize -> detokenize on mixed Hindi/English prompt.
    """
    import privacy_gateway_engine as pge

    session_id = "sess_fpe_roundtrip_test"
    vault = pge.TokenVault()

    # 1. Test FPE Synthetic Generators
    raw_aadhaar = "5432 1098 7652"
    synth_aadhaar = pge.generate_synthetic_aadhaar(raw_aadhaar, session_id)
    assert is_valid_aadhaar(synth_aadhaar) is True
    assert synth_aadhaar != raw_aadhaar

    raw_pan = "ABCPE1234F"
    synth_pan = pge.generate_synthetic_pan(raw_pan, session_id)
    assert is_valid_pan(synth_pan) is True
    assert synth_pan != raw_pan
    assert synth_pan[3] == raw_pan[3]  # Preserves entity type

    raw_gstin = "29ABCPE1234F1Z7"
    synth_gstin = pge.generate_synthetic_gstin(raw_gstin, session_id)
    assert is_valid_gstin(synth_gstin) is True
    assert synth_gstin[:2] == raw_gstin[:2]  # Preserves state code

    # 2. Test Round-Trip Tokenize -> Detokenize (FORMAT_PRESERVING Mode)
    original_prompt = (
        "नमस्ते! ग्राहक का पैन ABCPE1234F और आधार 5432 1098 7652 है। "
        "जीएसटीआईएन 29ABCPE1234F1Z7 पर ₹50,000 की छूट लागू करें।"
    )

    t_pan = vault.tokenize_entity(session_id, "PAN", raw_pan, mode="FORMAT_PRESERVING")
    t_aadhaar = vault.tokenize_entity(session_id, "AADHAAR", raw_aadhaar, mode="FORMAT_PRESERVING")
    t_gstin = vault.tokenize_entity(session_id, "GSTIN", raw_gstin, mode="FORMAT_PRESERVING")

    tokenized_prompt = (
        original_prompt.replace(raw_pan, t_pan)
        .replace(raw_aadhaar, t_aadhaar)
        .replace(raw_gstin, t_gstin)
    )

    # Real entities must be absent in tokenized prompt
    assert raw_pan not in tokenized_prompt
    assert raw_aadhaar not in tokenized_prompt
    assert raw_gstin not in tokenized_prompt

    # Detokenization restores exact original Hindi/English prompt
    restored_prompt = vault.detokenize_text(session_id, tokenized_prompt)
    assert restored_prompt == original_prompt


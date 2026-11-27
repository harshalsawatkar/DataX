import pytest

from backend.core.pii_classifier import (
    generate_synthetic_aadhaar,
    generate_synthetic_aadhaar_number,
    generate_synthetic_gstin,
    generate_synthetic_pan,
    generate_synthetic_pan_org,
    is_sensitive_key,
    is_valid_aadhaar,
    is_valid_gstin,
    is_valid_ifsc,
    is_valid_indian_state_code,
    is_valid_luhn,
    is_valid_mobile,
    is_valid_pan,
    is_valid_ssn,
    is_valid_upi_vpa,
    pii_classifier,
    scan_column,
    scan_text,
)

TEST_AADHAAR = generate_synthetic_aadhaar(seed=41)
TEST_AADHAAR_DIGITS = TEST_AADHAAR.replace(" ", "")
TEST_PAN = generate_synthetic_pan(seed=42)
TEST_GSTIN = generate_synthetic_gstin(seed=43, state_code="99")


@pytest.mark.parametrize(
    ("aadhaar", "expected"),
    [
        (TEST_AADHAAR, True),
        (TEST_AADHAAR_DIGITS, True),
        (TEST_AADHAAR_DIGITS[:-1] + str((int(TEST_AADHAAR_DIGITS[-1]) + 1) % 10), False),
        ("123456789012", False),
        ("199999999999", False),
        ("", False),
        ("000000000000", False),
    ],
)
def test_aadhaar_verhoeff(aadhaar, expected):
    assert is_valid_aadhaar(aadhaar) is expected


@pytest.mark.parametrize(("code", "expected"), [
    ("01", True), ("27", True), ("38", True), ("97", True),
    ("99", True), ("00", False), ("39", False), ("98", False), ("X", False),
])
def test_indian_state_codes(code, expected):
    assert is_valid_indian_state_code(code) is expected


@pytest.mark.parametrize(("pan", "expected"), [
    (TEST_PAN, True),
    ("AAAPX1234Z", True),
    ("AAADX1234Z", False),
    ("ABCDE123", False),
    ("ABCDE1234", False),
    ("AB12E1234F", False),
    ("", False),
])
def test_pan_format_validation(pan, expected):
    assert is_valid_pan(pan) is expected


@pytest.mark.parametrize(("mobile", "expected"), [
    ("9876543210", True),
    ("+91 9876543210", True),
    ("919876543210", True),
    ("5987654321", False),
    ("987654321", False),
    ("98765432101", False),
])
def test_indian_mobile_validation(mobile, expected):
    assert is_valid_mobile(mobile) is expected


@pytest.mark.parametrize(("value", "expected"), [
    (TEST_GSTIN, True),
    (TEST_GSTIN[:-1] + ("0" if TEST_GSTIN[-1] != "0" else "1"), False),
    ("98" + TEST_GSTIN[2:], False),
])
def test_gstin_validation(value, expected):
    assert is_valid_gstin(value) is expected


@pytest.mark.parametrize(("key", "expected"), [
    ("password", True),
    ("api_key", True),
    ("private_key", True),
    ("AZURE_OPENAI_API_KEY", True),
    ("customer_name", False),
    ("bearer_token", True),
])
def test_sensitive_key_detection(key, expected):
    assert is_sensitive_key(key) is expected


def test_synthetic_aadhaar_is_valid_and_deterministic():
    first = generate_synthetic_aadhaar(42)
    second = generate_synthetic_aadhaar(42)
    assert first == second
    assert first.startswith("9999")
    assert is_valid_aadhaar(first)
    assert is_valid_aadhaar(generate_synthetic_aadhaar_number(7))


def test_synthetic_aadhaar_preserves_original_separators():
    original = "1234-5678-9012"
    synthetic = generate_synthetic_aadhaar(original, seed=7)
    assert synthetic[4] == "-"
    assert synthetic[9] == "-"
    assert synthetic.startswith("9999-")
    assert is_valid_aadhaar(synthetic)


def test_synthetic_pan_aliases_are_valid():
    pan = generate_synthetic_pan(42)
    assert pan == generate_synthetic_pan_org(42)
    assert is_valid_pan(pan)


def test_synthetic_pan_preserves_entity_class():
    original = "AAACX1234Z"
    synthetic = generate_synthetic_pan(original, seed=12)
    assert synthetic[3] == original[3]
    assert is_valid_pan(synthetic)


def test_synthetic_gstin_is_valid():
    gstin = generate_synthetic_gstin(42)
    assert is_valid_gstin(gstin)


def test_synthetic_gstin_preserves_state_and_pan_class():
    original = generate_synthetic_gstin(seed=43, state_code="99")
    synthetic = generate_synthetic_gstin(original, seed=11)
    assert synthetic[:2] == original[:2]
    assert synthetic[5] == original[5]
    assert is_valid_gstin(synthetic)


@pytest.mark.parametrize(("value", "expected"), [
    ("4111 1111 1111 1111", True),
    ("4111-1111-1111-1112", False),
    ("123456789012", False),
    ("4111 1111 1111 111a", False),
])
def test_luhn_validation(value, expected):
    assert is_valid_luhn(value) is expected


@pytest.mark.parametrize(("value", "expected"), [
    ("123-45-6789", True),
    ("000-45-6789", False),
    ("666-45-6789", False),
    ("900-45-6789", False),
    ("123-00-6789", False),
    ("123-45-0000", False),
    ("123456789", False),
])
def test_ssn_validation_rejects_reserved_ranges(value, expected):
    assert is_valid_ssn(value) is expected


@pytest.mark.parametrize(("value", "expected"), [
    ("HDFC0001234", True),
    ("ABCD0123456", True),
    ("HDFC1001234", False),
    ("HDFC000123", False),
])
def test_ifsc_validation(value, expected):
    assert is_valid_ifsc(value) is expected


@pytest.mark.parametrize(("value", "expected"), [
    ("user@okaxis", True),
    ("a.user_2@ybl", True),
    ("user@unknownhandle", False),
    ("x@okaxis", False),
    ("user.example.com", False),
])
def test_upi_vpa_validation(value, expected):
    assert is_valid_upi_vpa(value) is expected


def test_scan_text_detects_indian_pii_and_secrets():
    text = f"PAN {TEST_PAN} Aadhaar {TEST_AADHAAR} Mobile +91 9876543210 password=TEST_ONLY_NOT_A_CREDENTIAL"
    result = scan_text(text)
    subtypes = {item["subtype"] for item in result["detections"]}
    assert result["has_pii"]
    assert result["has_secrets"]
    assert {"PAN", "AADHAAR", "INDIAN_MOBILE", "GENERIC_SECRET"} <= subtypes


def test_scan_column_preserves_column_name():
    result = scan_column(["safe text", f"Aadhaar {TEST_AADHAAR_DIGITS}"], "customer_name")
    assert result["has_pii"]
    assert any(item["column"] == "customer_name" for item in result["detections"])


def test_sensitive_column_name_is_detected():
    result = scan_column(["value"], "api_key")
    assert result["has_secrets"]
    assert result["detections"][0]["subtype"] == "SENSITIVE_COLUMN_NAME"


def test_scan_text_detects_github_slack_and_jwt_secrets():
    text = (
        f"github_pat_{'A' * 40} "
        f"xoxb-{'1' * 20} "
        f"eyJ{'A' * 12}.eyJ{'B' * 12}.{'C' * 12}"
    )
    result = pii_classifier(text)
    subtypes = {item["subtype"] for item in result["detections"]}
    assert {"GITHUB_PAT", "SLACK_TOKEN", "GENERIC_BEARER_JWT"} <= subtypes


def test_invalid_mixed_identifiers_are_not_validated_as_pii():
    result = scan_text("PAN AB12E1234F Aadhaar 123456789012 SSN 900-45-6789")
    assert not result["has_pii"]


def test_random_order_number_is_not_misclassified_as_aadhaar():
    order_number = "234567890123"
    assert not is_valid_aadhaar(order_number)
    assert not scan_text(f"PO number {order_number}")["has_pii"]


@pytest.mark.parametrize(("sample", "subtype"), [
    (f"OPENAI_API_KEY=sk-proj-{'A' * 30}", "OPENAI_API_KEY"),
    (f"ANTHROPIC_API_KEY=sk-ant-api03-{'A' * 30}", "ANTHROPIC_API_KEY"),
    (f"AWS_ACCESS_KEY_ID=AKIA{'A' * 16}", "AWS_ACCESS_KEY"),
    (f"AZURE_STORAGE_KEY={'A' * 32}", "AZURE_KEY"),
    (f"GITHUB_PAT=ghp_{'A' * 40}", "GITHUB_PAT"),
    (f"SLACK_TOKEN=xoxb-{'A' * 20}", "SLACK_TOKEN"),
    ("DATABASE_URI=postgresql://test_user:test_password@db.example.invalid/app", "DATABASE_URI"),
    ("-----BEGIN PRIVATE KEY-----\n" + "A" * 32 + "\n-----END PRIVATE KEY-----", "PRIVATE_KEY_HEADER"),
])
def test_secret_patterns_are_detected(sample, subtype):
    result = scan_text(sample)
    assert result["has_secrets"]
    assert subtype in {item["subtype"] for item in result["detections"]}


def test_scanner_validates_cards_ssns_ifsc_and_upi():
    result = scan_text(
        f"card 4111 1111 1111 1111; SSN 123-45-6789; "
        "IFSC HDFC0001234; UPI user@okaxis"
    )
    subtypes = {item["subtype"] for item in result["detections"]}
    assert {"CREDIT_CARD", "SSN", "IFSC", "UPI_VPA"} <= subtypes


def test_scanner_rejects_invalid_checksums_and_reserved_ssn_ranges():
    invalid_aadhaar = TEST_AADHAAR_DIGITS[:-1] + str((int(TEST_AADHAAR_DIGITS[-1]) + 1) % 10)
    result = scan_text(
        f"{invalid_aadhaar} 4111 1111 1111 1112 900-45-6789"
    )
    assert not result["has_pii"]

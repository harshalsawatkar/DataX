"""
Unified PII and secret classifier for DataX.

This module provides deterministic, offline validation for Indian identifiers
and common credential formats. Detection functions never make network calls.
"""

import random
import re
from typing import Any, Iterable, List, Dict, Optional


AADHAAR_REGEX = re.compile(r"(?<!\d)([2-9]\d{3}(?:[\s-]?\d{4}){2})(?!\d)")
PAN_REGEX = re.compile(
    r"(?<![A-Z0-9])([A-Z]{3}[PCAFHTBLJG][A-Z][0-9]{4}[A-Z])(?![A-Z0-9])",
    re.IGNORECASE,
)
GSTIN_REGEX = re.compile(
    r"(?<![A-Z0-9])([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])(?![A-Z0-9])",
    re.IGNORECASE,
)
INDIAN_MOBILE_REGEX = re.compile(r"(?<!\d)(?:\+91[\s-]?|91[\s-]?|0)?([6-9]\d{9})(?!\d)")
EMAIL_REGEX = re.compile(r"(?<![\w.+-])([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})(?![\w.-])")
SSN_REGEX = re.compile(r"(?<!\d)(\d{3}-\d{2}-\d{4})(?!\d)")
CREDIT_CARD_REGEX = re.compile(r"(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)")
PHONE_REGEX = re.compile(r"\b(?:\+?\d{1,3}[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}\b")
IFSC_REGEX = re.compile(r"(?<![A-Z0-9])([A-Z]{4}0[A-Z0-9]{6})(?![A-Z0-9])", re.IGNORECASE)
UPI_VPA_REGEX = re.compile(
    r"(?<![A-Z0-9._-])([A-Z0-9._-]{2,256}@[A-Z][A-Z0-9.-]{1,63})(?![A-Z0-9.-])",
    re.IGNORECASE,
)
UPI_PSP_HANDLES = frozenset({
    "okaxis", "okhdfcbank", "ybl", "paytm", "ibl", "upi", "apl",
    "okicici", "oksbi", "axl", "okbizaxis", "freecharge", "airtel",
    "indus", "ikwik", "waicici", "wahdfcbank", "waaxis",
})

SECRET_PATTERNS = [
    ("ANTHROPIC_API_KEY", re.compile(r"\bsk-ant-[A-Za-z0-9_-]{20,}\b")),
    ("OPENAI_API_KEY", re.compile(r"\bsk-(?!ant-)(?:proj-)?[A-Za-z0-9_-]{20,}\b")),
    ("AWS_ACCESS_KEY", re.compile(r"\b(?:AKIA|ASIA|ABIA|ACCA)[A-Z0-9]{16}\b")),
    ("AZURE_KEY", re.compile(
        r"(?i)\b(?:azure(?:[_-]?storage)?[_-]?key|azure_openai(?:_api)?_key)\b"
        r"\s*[:=]\s*[A-Za-z0-9+/=]{16,}"
    )),
    ("GITHUB_PAT", re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b")),
    ("SLACK_TOKEN", re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b")),
    ("GENERIC_BEARER_JWT", re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b")),
    ("DATABASE_URI", re.compile(
        r"(?i)\b(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|mariadb|mssql|redis|snowflake|clickhouse)"
        r"://[^/\s:@]+:[^@\s/]+@[^'\s]+"
    )),
    ("PRIVATE_KEY_HEADER", re.compile(
        r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"
        r"[\s\S]{0,8192}?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"
    )),
    ("GENERIC_SECRET", re.compile(
        r"(?i)\b(?:password|passwd|secret|otp|auth|bearer|api[_-]?key|client[_-]?secret)"
        r"\b\s*[:=]\s*(?:\"[^\"]+\"|'[^']+'|[^\s,;]+)"
    )),
]

SENSITIVE_KEY_WORDS = (
    "password", "passwd", "secret", "otp", "auth", "bearer",
    "api_key", "apikey", "private_key", "github_pat", "slack",
    "azure", "aws", "access_key", "client_secret",
)
SENSITIVE_PII_KEY_WORDS = (
    "aadhaar", "pan", "gstin", "ssn", "credit_card", "card_number",
    "upi", "ifsc", "mobile", "phone", "email",
)

VERHOEFF_D = (
    (0, 1, 2, 3, 4, 5, 6, 7, 8, 9),
    (1, 2, 3, 4, 0, 6, 7, 8, 9, 5),
    (2, 3, 4, 0, 1, 7, 8, 9, 5, 6),
    (3, 4, 0, 1, 2, 8, 9, 5, 6, 7),
    (4, 0, 1, 2, 3, 9, 5, 6, 7, 8),
    (5, 9, 8, 7, 6, 0, 4, 3, 2, 1),
    (6, 5, 9, 8, 7, 1, 0, 4, 3, 2),
    (7, 6, 5, 9, 8, 2, 1, 0, 4, 3),
    (8, 7, 6, 5, 9, 3, 2, 1, 0, 4),
    (9, 8, 7, 6, 5, 4, 3, 2, 1, 0),
)
VERHOEFF_P = (
    (0, 1, 2, 3, 4, 5, 6, 7, 8, 9),
    (1, 5, 7, 6, 2, 8, 3, 0, 9, 4),
    (5, 8, 0, 3, 7, 9, 6, 1, 4, 2),
    (8, 9, 1, 6, 0, 4, 3, 5, 2, 7),
    (9, 4, 5, 3, 1, 2, 6, 8, 7, 0),
    (4, 2, 8, 6, 5, 7, 3, 9, 0, 1),
    (2, 7, 9, 3, 8, 0, 6, 4, 1, 5),
    (7, 0, 4, 6, 9, 1, 3, 2, 5, 8),
)
VERHOEFF_INV = (0, 4, 3, 2, 1, 5, 6, 7, 8, 9)


def _canonical_digits(value: Any) -> str:
    return re.sub(r"\D", "", str(value)) if value is not None else ""


def _verhoeff_check(number: str) -> str:
    if not number.isdigit():
        raise ValueError("Verhoeff input must contain digits only")
    checksum = 0
    for i, char in enumerate(reversed(number)):
        checksum = VERHOEFF_D[checksum][VERHOEFF_P[(i + 1) % 8][int(char)]]
    return str(VERHOEFF_INV[checksum])


def is_valid_aadhaar(aadhaar: Any) -> bool:
    if aadhaar is None:
        return False
    digits = re.sub(r"[\s-]", "", str(aadhaar))
    if not re.fullmatch(r"[2-9]\d{11}", digits):
        return False
    checksum = 0
    for i, char in enumerate(reversed(digits)):
        checksum = VERHOEFF_D[checksum][VERHOEFF_P[i % 8][int(char)]]
    return checksum == 0


is_valid_aadhaar_verhoeff = is_valid_aadhaar
is_valid_aadhaar_number = is_valid_aadhaar


def is_valid_indian_state_code(state_code: Any) -> bool:
    code = str(state_code).strip().zfill(2)
    if not re.fullmatch(r"\d{2}", code):
        return False
    number = int(code)
    return 1 <= number <= 38 or number in {97, 99}


def _mod36_value(char: str) -> int:
    return int(char) if char.isdigit() else ord(char.upper()) - ord("A") + 10


def _mod36_char(value: int) -> str:
    chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    return chars[value % 36]


def is_valid_pan(pan: Any) -> bool:
    value = str(pan).strip().upper()
    if not re.fullmatch(r"[A-Z]{5}[0-9]{4}[A-Z]", value):
        return False
    return value[3] in "PCAFHTBLJG"


is_valid_pan_mod36 = is_valid_pan


def is_valid_luhn(card_number: Any) -> bool:
    value = str(card_number).strip()
    if not re.fullmatch(r"\d[\d -]*\d", value):
        return False
    digits = re.sub(r"[ -]", "", value)
    if not 13 <= len(digits) <= 19:
        return False
    total = 0
    for index, char in enumerate(reversed(digits)):
        digit = int(char)
        if index % 2:
            digit *= 2
            if digit > 9:
                digit -= 9
        total += digit
    return total % 10 == 0


def is_valid_ssn(ssn: Any) -> bool:
    value = str(ssn).strip()
    match = re.fullmatch(r"(\d{3})-(\d{2})-(\d{4})", value)
    if not match:
        return False
    area, group, serial = match.groups()
    return area not in {"000", "666"} and not area.startswith("9") and group != "00" and serial != "0000"


def is_valid_ifsc(ifsc: Any) -> bool:
    return re.fullmatch(r"[A-Z]{4}0[A-Z0-9]{6}", str(ifsc).strip().upper()) is not None


def is_valid_upi_vpa(vpa: Any) -> bool:
    match = UPI_VPA_REGEX.fullmatch(str(vpa).strip())
    return match is not None and match.group(1).rsplit("@", 1)[1].lower() in UPI_PSP_HANDLES


def is_valid_phone(phone: Any) -> bool:
    digits = _canonical_digits(phone)
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
    return (
        len(digits) == 10
        and digits[0] in "23456789"
        and digits[3] in "23456789"
    )


def is_valid_gstin(gstin: Any) -> bool:
    value = str(gstin).strip().upper()
    if not re.fullmatch(r"[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]", value):
        return False
    if not is_valid_indian_state_code(value[:2]):
        return False
    if not is_valid_pan(value[2:12]):
        return False
    total = 0
    for i, char in enumerate(value[:-1]):
        factor = 1 if i % 2 == 0 else 2
        result = factor * _mod36_value(char)
        total += (result // 36) + (result % 36)
    remainder = total % 36
    check_code = (36 - remainder) % 36
    return _mod36_char(check_code) == value[-1]


is_valid_gst = is_valid_gstin


def is_valid_mobile(mobile: Any) -> bool:
    value = str(mobile).strip()
    match = re.fullmatch(r"(?:\+91[\s-]?|91[\s-]?|0)?([6-9]\d{9})", value)
    return match is not None


def is_sensitive_key(key: Any) -> bool:
    if key is None:
        return False
    normalized = re.sub(r"[^a-z0-9]+", "_", str(key).lower()).strip("_")
    return any(word in normalized for word in SENSITIVE_KEY_WORDS)


def _generator_rng(orig: Any, seed: Any) -> random.Random:
    if seed is None:
        return random.Random()
    return random.Random(f"{seed!r}:{orig!r}")


def _preserve_separators(original: str, generated: str) -> str:
    output = []
    generated_index = 0
    for char in original:
        if char.isalnum():
            replacement = generated[generated_index]
            output.append(replacement.lower() if char.islower() else replacement)
            generated_index += 1
        else:
            output.append(char)
    return "".join(output) if generated_index == len(generated) else generated


def generate_synthetic_aadhaar(orig: Optional[Any] = None, seed: Optional[Any] = None) -> str:
    if isinstance(orig, int) and seed is None:
        seed, orig = orig, None
    original = str(orig) if orig is not None else ""
    rng = _generator_rng(original, seed)
    first_eleven = "9999" + "".join(str(rng.randrange(10)) for _ in range(7))
    digits = first_eleven + _verhoeff_check(first_eleven)
    if original and len(_canonical_digits(original)) == 12:
        return _preserve_separators(original, digits)
    return f"{digits[:4]} {digits[4:8]} {digits[8:]}"


def generate_synthetic_pan(orig: Optional[Any] = None, seed: Optional[Any] = None) -> str:
    if isinstance(orig, int) and seed is None:
        seed, orig = orig, None
    original = str(orig) if orig is not None else ""
    rng = _generator_rng(original, seed)
    letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    entity_class = original[3].upper() if re.fullmatch(r"[A-Z]{5}[0-9]{4}[A-Z]", original.upper()) else "P"
    pan = "".join(rng.choice(letters) for _ in range(3))
    pan += entity_class + rng.choice(letters)
    pan += "".join(str(rng.randrange(10)) for _ in range(4))
    pan += rng.choice(letters)
    return _preserve_separators(original, pan) if original and len(re.sub(r"[^A-Z0-9]", "", original.upper())) == 10 else pan


def generate_synthetic_aadhaar_number(orig: Optional[Any] = None, seed: Optional[Any] = None) -> str:
    return generate_synthetic_aadhaar(orig, seed).replace(" ", "").replace("-", "")


def generate_synthetic_pan_org(orig: Optional[Any] = None, seed: Optional[Any] = None) -> str:
    return generate_synthetic_pan(orig, seed)


def generate_synthetic_gstin(
    orig: Optional[Any] = None,
    seed: Optional[Any] = None,
    state_code: str = "27",
) -> str:
    if isinstance(orig, int):
        if isinstance(seed, str):
            state_code, seed = seed, orig
        elif seed is None:
            seed, orig = orig, None
    original = str(orig) if orig is not None else ""
    rng = _generator_rng(original, seed)
    source_state = original[:2] if re.fullmatch(r"\d{2}", original[:2]) else str(state_code).zfill(2)
    output_state = source_state if is_valid_indian_state_code(source_state) else str(state_code).zfill(2)
    pan_source = original[2:12] if len(original) >= 12 and is_valid_pan(original[2:12]) else None
    pan = generate_synthetic_pan(pan_source, seed=f"{seed!r}:{original!r}")
    entity = original[12] if len(original) > 12 and re.fullmatch(r"[1-9A-Z]", original[12].upper()) else rng.choice("123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    base = f"{output_state}{pan}{entity.upper()}Z"
    total = 0
    for i, char in enumerate(base):
        factor = 1 if i % 2 == 0 else 2
        result = factor * _mod36_value(char)
        total += (result // 36) + (result % 36)
    check_code = _mod36_char((36 - (total % 36)) % 36)
    generated = base + check_code
    return _preserve_separators(original, generated) if original and len(re.sub(r"[^A-Z0-9]", "", original.upper())) == 15 else generated


is_valid_aadhaar_uidai = is_valid_aadhaar
is_valid_aadhaar_checksum = is_valid_aadhaar
is_valid_gstin_mod36 = is_valid_gstin


def _secret_matches(text: str) -> List[Dict[str, Any]]:
    matches = []
    for subtype, pattern in SECRET_PATTERNS:
        for match in pattern.finditer(text):
            matches.append({
                "type": "SECRET",
                "subtype": subtype,
                "value": match.group(0),
                "start": match.start(),
                "end": match.end(),
            })
    return matches


def scan_text(text: Any) -> Dict[str, Any]:
    if text is None:
        text = ""
    if not isinstance(text, str):
        text = str(text)

    detections: List[Dict[str, Any]] = []
    seen = set()
    indian_mobile_spans = []

    def add_detection(kind: str, subtype: str, match: re.Match, value: Optional[str] = None) -> None:
        raw = value if value is not None else match.group(0)
        key = (kind, subtype, raw, match.start(), match.end())
        if key in seen:
            return
        seen.add(key)
        detections.append({
            "type": kind,
            "subtype": subtype,
            "value": raw,
            "start": match.start(),
            "end": match.end(),
        })

    for match in AADHAAR_REGEX.finditer(text):
        if is_valid_aadhaar(match.group(1)):
            add_detection("PII", "AADHAAR", match, match.group(1))

    for match in PAN_REGEX.finditer(text):
        if is_valid_pan(match.group(1)):
            add_detection("PII", "PAN", match, match.group(1).upper())

    for match in GSTIN_REGEX.finditer(text):
        if is_valid_gstin(match.group(1)):
            add_detection("PII", "GSTIN", match, match.group(1).upper())

    for match in INDIAN_MOBILE_REGEX.finditer(text):
        digits = _canonical_digits(match.group(0))
        if digits.startswith("91") and len(digits) == 12:
            digits = digits[2:]
        elif digits.startswith("0") and len(digits) == 11:
            digits = digits[1:]
        if is_valid_mobile(digits):
            add_detection("PII", "INDIAN_MOBILE", match, match.group(0).strip())
            indian_mobile_spans.append((match.start(), match.end()))

    for match in IFSC_REGEX.finditer(text):
        if is_valid_ifsc(match.group(1)):
            add_detection("PII", "IFSC", match, match.group(1).upper())

    for match in UPI_VPA_REGEX.finditer(text):
        if is_valid_upi_vpa(match.group(1)):
            add_detection("PII", "UPI_VPA", match, match.group(1))

    for match in CREDIT_CARD_REGEX.finditer(text):
        if is_valid_luhn(match.group(0)):
            add_detection("PII", "CREDIT_CARD", match)

    for match in SSN_REGEX.finditer(text):
        if is_valid_ssn(match.group(1)):
            add_detection("PII", "SSN", match)

    for match in EMAIL_REGEX.finditer(text):
        add_detection("PII", "EMAIL", match, match.group(1))

    for match in PHONE_REGEX.finditer(text):
        overlaps_indian_mobile = any(
            match.start() < end and start < match.end()
            for start, end in indian_mobile_spans
        )
        if not overlaps_indian_mobile and is_valid_phone(match.group(0)):
            add_detection("PII", "PHONE", match)

    detections.extend(_secret_matches(text))
    pii_priority = {
        "GSTIN": 100,
        "AADHAAR": 95,
        "CREDIT_CARD": 90,
        "SSN": 90,
        "UPI_VPA": 85,
        "IFSC": 80,
        "PAN": 75,
        "INDIAN_MOBILE": 70,
        "EMAIL": 60,
        "PHONE": 50,
    }
    def detection_priority(item: Dict[str, Any]) -> int:
        if item["type"] == "SECRET":
            return 110
        return pii_priority.get(item["subtype"], 0)

    selected = []
    for candidate in sorted(
        detections,
        key=lambda item: (-detection_priority(item), item["start"], -(item["end"] - item["start"])),
    ):
        overlaps = any(
            candidate["start"] < existing["end"] and existing["start"] < candidate["end"]
            for existing in selected
        )
        if not overlaps:
            selected.append(candidate)
    detections = sorted(selected, key=lambda item: (item["start"], item["end"]))
    return {
        "has_pii": any(item["type"] == "PII" for item in detections),
        "has_secrets": any(item["type"] == "SECRET" for item in detections),
        "detections": detections,
    }


def pii_classifier(text: Any) -> Dict[str, Any]:
    return scan_text(text)


def scan_column(values: Iterable[Any], column_name: Optional[str] = None) -> Dict[str, Any]:
    items = list(values or [])
    detections: List[Dict[str, Any]] = []
    for index, value in enumerate(items):
        result = scan_text(value)
        for detection in result["detections"]:
            detections.append({
                **detection,
                "index": index,
                "column": column_name,
            })
    if column_name and is_sensitive_key(column_name):
        detections.append({
            "type": "SECRET",
            "subtype": "SENSITIVE_COLUMN_NAME",
            "column": column_name,
            "index": None,
        })
    elif column_name:
        normalized_column = re.sub(r"[^a-z0-9]+", "_", column_name.lower())
        if any(word in normalized_column for word in SENSITIVE_PII_KEY_WORDS):
            detections.append({
                "type": "PII",
                "subtype": "SENSITIVE_COLUMN_NAME",
                "column": column_name,
                "index": None,
            })
    return {
        "has_pii": any(item["type"] == "PII" for item in detections),
        "has_secrets": any(item["type"] == "SECRET" for item in detections),
        "detections": detections,
    }

import pytest
import os
import sys

_TEST_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_TEST_DIR)
_BACKEND_DIR = os.path.join(_PROJECT_ROOT, "backend")
for d in [_BACKEND_DIR, os.path.join(_BACKEND_DIR, "core"), os.path.join(_BACKEND_DIR, "engines")]:
    if d not in sys.path:
        sys.path.insert(0, d)

from consensus_engine import (
    compute_layer1_stats,
    evaluate_consensus_guard,
    Layer1MetricResult,
    DomainAgentVote,
    ConsensusVerdict,
)


def test_consensus_guard_clamps_hallucinated_high_score():
    """
    Gate S1-13: Verifies that an LLM scoring 9.5 on a 5.0 Layer-1 dataset
    is mathematically clamped to <= 7.5 (baseline + 2.5 tolerance band).
    """
    # 1. Test against exact 5.0 baseline
    l1_exact_5 = {
        "rowCount": 100,
        "columnCount": 10,
        "nullRatios": {"c0": 0.0},
        "completenessScore": 0.5,
        "cardinalityRatios": {"c0": 1.0},
        "outlierCount": 0,
        "detectedPii": [],
        "baselineScore": 5.0,
        "executionTimeMs": 2.5
    }
    res_exact = evaluate_consensus_guard([], simulated_llm_score=9.5, layer1_override=l1_exact_5)
    assert res_exact["layer1BaselineScore"] == 5.0
    assert res_exact["unanchoredQualitativeScore"] == 9.5
    assert res_exact["anchoredScore"] == 7.5
    assert res_exact["toleranceBand"] == "±2.5"
    assert res_exact["clampedBandRange"] == [2.5, 7.5]

    # 2. Test against live records
    records = []
    for i in range(16):
        row = {f"c{k}": None for k in range(14)}
        row["val"] = 10.0 + i if i < 13 else 99999.0
        row["category"] = "alpha" if i % 2 == 0 else "beta"
        records.append(row)

    l1 = compute_layer1_stats(records)
    baseline = l1["baselineScore"]

    # LLM hallucinates 9.5 on live dataset
    res = evaluate_consensus_guard(records, simulated_llm_score=9.5)
    expected_ceiling = round(baseline + 2.5, 2)

    assert res["unanchoredQualitativeScore"] == 9.5
    assert res["anchoredScore"] == expected_ceiling
    assert res["anchoredScore"] <= round(baseline + 2.5, 2)
    assert res["toleranceBand"] == "±2.5"


def test_consensus_guard_clamps_unduly_harsh_low_score():
    """Verifies that an unduly harsh LLM score of 2.0 on clean data is clamped up by baseline - 2.5."""
    clean_records = [
        {"id": i, "name": f"User_{i}", "active": True, "score": 100.0 + i}
        for i in range(1, 15)
    ]
    l1 = compute_layer1_stats(clean_records)
    baseline = l1["baselineScore"]
    assert baseline >= 8.5

    # LLM gives unduly harsh 2.0
    res = evaluate_consensus_guard(clean_records, simulated_llm_score=2.0)
    expected_floor = round(baseline - 2.5, 2)

    assert res["unanchoredQualitativeScore"] == 2.0
    assert res["anchoredScore"] >= expected_floor
    assert res["anchoredScore"] >= 5.5


def test_consensus_guard_unmasked_pii_caps_score_and_suspends():
    """
    Gate S1-13: Verifies unmasked Aadhaar or SSN caps score at <= 2.0 and sets disposition SUSPENDED.
    """
    # Record containing valid Verhoeff Aadhaar
    # 2932 7431 8295 is valid Verhoeff
    records_with_aadhaar = [
        {"id": 1, "citizen_name": "Ravi Kumar", "aadhaar_no": "2932 7431 8295", "city": "Bengaluru"},
        {"id": 2, "citizen_name": "Priya Sharma", "aadhaar_no": "2932 7431 8295", "city": "Mysuru"},
        {"id": 3, "citizen_name": "Anand Rao", "aadhaar_no": "2932 7431 8295", "city": "Mangaluru"},
        {"id": 4, "citizen_name": "Deepa Hegde", "aadhaar_no": "2932 7431 8295", "city": "Hubballi"},
        {"id": 5, "citizen_name": "Vijay Patil", "aadhaar_no": "2932 7431 8295", "city": "Belagavi"},
    ]

    res = evaluate_consensus_guard(records_with_aadhaar, simulated_llm_score=9.8)

    assert res["anchoredScore"] <= 2.0
    assert res["disposition"] == "SUSPENDED"
    assert res["status"] == "REJECTED"
    assert any("Fatal Flaw: PII Guard" in f for f in res["fatalFlawOverrides"])


def test_consensus_guard_ssn_caps_score():
    """Verifies US SSN pattern caps score at <= 2.0."""
    records_with_ssn = [
        {"id": 1, "name": "John Doe", "ssn": "123-45-6789"},
        {"id": 2, "name": "Jane Smith", "ssn": "987-65-4321"},
        {"id": 3, "name": "Bob Brown", "ssn": "555-55-5555"},
        {"id": 4, "name": "Alice Green", "ssn": "111-11-1111"},
        {"id": 5, "name": "Charlie White", "ssn": "222-22-2222"},
    ]
    res = evaluate_consensus_guard(records_with_ssn, simulated_llm_score=8.5)
    assert res["anchoredScore"] <= 2.0
    assert res["disposition"] == "SUSPENDED"


def test_consensus_guard_models_instantiation():
    """Verifies that Pydantic Consensus models instantiate cleanly."""
    metric = Layer1MetricResult(
        rowCount=100,
        columnCount=5,
        completenessScore=0.98,
        baselineScore=9.2,
        executionTimeMs=12.4
    )
    assert metric.rowCount == 100
    assert metric.baselineScore == 9.2

    vote = DomainAgentVote(
        agentName="Schema Integrity",
        score=0.95,
        confidence=0.90,
        verdict="PASS",
        reasoning="All columns conform to SQL standards."
    )
    assert vote.verdict == "PASS"

    verdict = ConsensusVerdict(
        status="APPROVED",
        disposition="READY",
        layer1BaselineScore=9.0,
        unanchoredQualitativeScore=9.2,
        anchoredScore=9.1,
        manifestHash="abc123hash",
        executionTimeMs=15.0
    )
    assert verdict.status == "APPROVED"

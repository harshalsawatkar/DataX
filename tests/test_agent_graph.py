import pytest
import os
import sys

_TEST_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_TEST_DIR)
_BACKEND_DIR = os.path.join(_PROJECT_ROOT, "backend")
for d in [_PROJECT_ROOT, _BACKEND_DIR, os.path.join(_BACKEND_DIR, "ai_substrate")]:
    if d not in sys.path:
        sys.path.insert(0, d)

from ai_substrate.agent_graph import DataXStateGraph


def test_agent_graph_clean_run_completes_automatically():
    """Gate S1-25: Clean dataset above HITL threshold completes without interruption."""
    graph = DataXStateGraph()
    clean_records = [
        {"PO_NUMBER": "1001", "QUANTITY": 10, "TOTAL_AMOUNT": 1000.0, "VENDOR_ID": "V1", "DELIVERY_PLANT": "P1000"},
        {"PO_NUMBER": "1002", "QUANTITY": 20, "TOTAL_AMOUNT": 2000.0, "VENDOR_ID": "V2", "DELIVERY_PLANT": "Plant-Dallas"},
        {"PO_NUMBER": "1003", "QUANTITY": 30, "TOTAL_AMOUNT": 3000.0, "VENDOR_ID": "V3", "DELIVERY_PLANT": "P2000"},
        {"PO_NUMBER": "1004", "QUANTITY": 40, "TOTAL_AMOUNT": 4000.0, "VENDOR_ID": "V4", "DELIVERY_PLANT": "P3000"},
        {"PO_NUMBER": "1005", "QUANTITY": 50, "TOTAL_AMOUNT": 5000.0, "VENDOR_ID": "V5", "DELIVERY_PLANT": "P1000"},
        {"PO_NUMBER": "1006", "QUANTITY": 60, "TOTAL_AMOUNT": 6000.0, "VENDOR_ID": "V6", "DELIVERY_PLANT": "P2000"},
    ]

    res = graph.run(clean_records, hitl_threshold_rate=0.80)
    assert res["status"] == "COMPLETED"
    assert res["hitl_required"] is False
    assert res["staged_dispatch"]["s4hana_staged_orders"] == 6
    assert res["normalized_records"][1]["DELIVERY_PLANT"] == "P1000"


def test_agent_graph_hitl_pause_and_resume():
    """
    Gate S1-25: Verifies that when anomalous records breach threshold,
    the graph pauses at HITL gate (PAUSED_HITL), checkpoints state,
    and cleanly resumes upon human approval.
    """
    graph = DataXStateGraph()
    dirty_records = [
        {"PO_NUMBER": "2001", "QUANTITY": 10, "TOTAL_AMOUNT": 1000.0, "VENDOR_ID": "V1", "DELIVERY_PLANT": "P1000"},
        {"PO_NUMBER": "2002", "QUANTITY": -5, "TOTAL_AMOUNT": -500.0, "VENDOR_ID": "V2", "DELIVERY_PLANT": "P1000"},  # Anomaly
        {"PO_NUMBER": "2003", "QUANTITY": 15, "TOTAL_AMOUNT": 1500.0, "VENDOR_ID": "", "DELIVERY_PLANT": "UNKNOWN_XYZ"},  # Anomaly
    ]

    # Run with threshold 85% (compliance will be 33% -> triggers pause)
    paused = graph.run(dirty_records, hitl_threshold_rate=0.85)
    sid = paused["session_id"]

    assert paused["status"] == "PAUSED_HITL"
    assert paused["hitl_required"] is True
    assert "falls below 85.0% threshold" in paused["hitl_reason"]

    # 1. Resume with approval
    resumed = graph.resume_hitl(session_id=sid, approved=True, reviewer="sr_finance_controller")

    assert resumed["status"] == "COMPLETED"
    assert resumed["hitl_approved"] is True
    assert resumed["staged_dispatch"]["s4hana_staged_orders"] == 1


def test_agent_graph_hitl_rejection():
    """Verifies that human rejection halts dispatch cleanly."""
    graph = DataXStateGraph()
    records = [{"PO_NUMBER": "3001", "QUANTITY": -10, "TOTAL_AMOUNT": 0.0, "VENDOR_ID": ""}]

    paused = graph.run(records, hitl_threshold_rate=0.90)
    sid = paused["session_id"]
    assert paused["status"] == "PAUSED_HITL"

    rejected = graph.resume_hitl(session_id=sid, approved=False, reviewer="risk_officer")
    assert rejected["status"] == "REJECTED"
    assert rejected["hitl_approved"] is False
    assert "staged_dispatch" not in rejected or not rejected["staged_dispatch"]

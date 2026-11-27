import pytest
import os
import sys
from unittest.mock import patch, MagicMock

_TEST_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_TEST_DIR)
_BACKEND_DIR = os.path.join(_PROJECT_ROOT, "backend")
for d in [_PROJECT_ROOT, _BACKEND_DIR, os.path.join(_BACKEND_DIR, "connectors")]:
    if d not in sys.path:
        sys.path.insert(0, d)

try:
    from backend.connectors.dataglow_client import (
        DataGlowClient,
        CircuitState,
        CONTRACT_VERSION
    )
except ImportError:
    from dataglow_client import (
        DataGlowClient,
        CircuitState,
        CONTRACT_VERSION
    )


def test_dataglow_client_online_mocked_response():
    """
    Gate S1-16: Tests that when DataGlow (:8000) is online,
    responses return with online=True and remote payload.
    """
    client = DataGlowClient(base_url="http://127.0.0.1:8000")

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = '{"status": "healthy", "service": "DataGlow-Master"}'
    mock_resp.json.return_value = {"status": "healthy", "service": "DataGlow-Master"}

    with patch("requests.request", return_value=mock_resp):
        res = client.check_health()
        assert res["online"] is True
        assert res["source"] == "remote"
        assert res["circuit_state"] == CircuitState.CLOSED
        assert res["data"]["service"] == "DataGlow-Master"


def test_dataglow_client_offline_graceful_fallback():
    """
    Gate S1-16: Tests that when DataGlow is unreachable (port offline / connection refused),
    the client returns graceful fallback without crashing.
    """
    client = DataGlowClient(base_url="http://127.0.0.1:9999", timeout=0.1)

    with patch("requests.request", side_effect=ConnectionRefusedError("Connection refused to 9999")):
        policy_res = client.get_tenant_policy("tenant_alpha")
        assert policy_res["online"] is False
        assert policy_res["source"] == "fallback"
        assert policy_res["data"]["tenant_id"] == "tenant_alpha"
        assert policy_res["data"]["policy_source"] == "datax_local_default"
        assert policy_res["data"]["dpdp_enforced"] is True


def test_dataglow_client_circuit_breaker_trips_to_open():
    """
    Gate S1-16: Tests that 3 consecutive failures trip circuit breaker to OPEN,
    preventing any further network calls.
    """
    client = DataGlowClient(
        base_url="http://127.0.0.1:9999",
        failure_threshold=3,
        recovery_timeout=60.0
    )

    with patch("requests.request", side_effect=TimeoutError("Connection timed out")) as mock_req:
        # Calls 1, 2, 3 fail and record failures
        res1 = client.check_health()
        res2 = client.check_health()
        res3 = client.check_health()

        assert res3["circuit_state"] == CircuitState.OPEN
        assert mock_req.call_count == 3

        # Call 4: should immediately short-circuit without calling requests.request
        res4 = client.check_health()
        assert res4["circuit_state"] == CircuitState.OPEN
        assert res4["source"] == "fallback"
        assert mock_req.call_count == 3  # Network was NOT hit on call 4!


def test_dataglow_client_reset_circuit():
    """Verifies manual circuit breaker reset restores CLOSED state."""
    client = DataGlowClient(failure_threshold=1)
    with patch("requests.request", side_effect=Exception("Network down")):
        client.check_health()
        assert client.state == CircuitState.OPEN

    client.reset_circuit()
    assert client.state == CircuitState.CLOSED
    assert client.get_circuit_state()["consecutive_failures"] == 0


def test_dataglow_client_audit_and_llm_sync_fallback():
    """Verifies that audit event forwarding and LLM token sync gracefully queue locally when offline."""
    client = DataGlowClient(base_url="http://127.0.0.1:9999")

    with patch("requests.request", side_effect=ConnectionError("Port offline")):
        audit_res = client.forward_audit_event({"event_id": "evt_123", "action": "SANITY_CHECK"})
        assert audit_res["online"] is False
        assert audit_res["data"]["queued_locally"] is True

        llm_res = client.sync_llm_usage({"tokens": 150, "cost_usd": 0.003})
        assert llm_res["online"] is False
        assert llm_res["data"]["cached_locally"] is True

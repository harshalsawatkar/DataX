"""
Unit Tests for DataX Centralized LLM Gateway (Task S1-07 Gate)
=============================================================
Verifies:
  1. Row-loop breaker: 26th call in a single request session raises TokenBudgetViolationError.
  2. Content-addressed cache: Identical prompt returns cached=True, 0 tokens, and ₹0 cost.
  3. Per-tenant daily budget: Exceeding daily budget raises DailyBudgetExceededError.
  4. Telemetry: get_budget_status returns structured live telemetry.
"""

import os
import sys
import pytest
from unittest.mock import MagicMock

# Add backend dirs to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
for d in [backend_dir, os.path.join(backend_dir, "core"), os.path.join(backend_dir, "engines")]:
    if d not in sys.path:
        sys.path.insert(0, d)

from llm_gateway import (
    LLMGateway,
    llm_request_context,
    TokenBudgetViolationError,
    DailyBudgetExceededError,
    LLMUnavailableError,
    MAX_CALLS_PER_REQUEST,
)


@pytest.fixture
def temp_gateway(tmp_path):
    """Fixture providing a fresh isolated gateway backed by temporary SQLite and meter store."""
    cache_db = str(tmp_path / "test_cache.sqlite")
    meter_store = str(tmp_path / "test_meter.json")
    gateway = LLMGateway(cache_db_path=cache_db, meter_store_path=meter_store)

    # Setup mock Azure OpenAI client
    mock_client = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = '{"rules": [{"id": "r_test", "name": "Test Rule"}]}'
    mock_choice.finish_reason = "stop"

    mock_usage = MagicMock()
    mock_usage.prompt_tokens = 120
    mock_usage.completion_tokens = 60
    mock_usage.total_tokens = 180

    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_response.usage = mock_usage

    mock_client.chat.completions.create.return_value = mock_response
    gateway.set_mock_client(mock_client, deployment="gpt-5-mini")

    return gateway


def test_cache_hit_returns_zero_tokens(temp_gateway):
    """Verifies that a repeated identical prompt returns cached=True with 0 billable tokens."""
    messages = [
        {"role": "system", "content": "You are a data quality assistant."},
        {"role": "user", "content": "Synthesize a rule for email syntax."}
    ]

    # First call: cache miss, executes upstream mock
    res1 = temp_gateway.chat_completion(messages=messages, model="gpt-5-mini", request_id="req_cache_1")
    assert res1.cached is False
    assert res1.prompt_tokens == 120
    assert res1.completion_tokens == 60
    assert res1.total_tokens == 180
    assert res1.cost_inr > 0.0

    # Second call: cache hit, 0 tokens and ₹0 cost
    res2 = temp_gateway.chat_completion(messages=messages, model="gpt-5-mini", request_id="req_cache_2")
    assert res2.cached is True
    assert res2.prompt_tokens == 0
    assert res2.completion_tokens == 0
    assert res2.total_tokens == 0
    assert res2.cost_inr == 0.0
    assert res2.cost_usd == 0.0
    assert res2.content == res1.content


def test_row_loop_guard_trips_on_26th_call(temp_gateway):
    """
    Verifies that the row-loop guardrail permits up to 25 calls in a single request,
    and the 26th call raises TokenBudgetViolationError cleanly.
    """
    request_id = "request_batch_proc_101"

    with llm_request_context(request_id):
        # Calls 1 to 25 should succeed
        for i in range(MAX_CALLS_PER_REQUEST):
            messages = [{"role": "user", "content": f"Check unique row #{i}"}]
            res = temp_gateway.chat_completion(
                messages=messages,
                model="gpt-5-mini",
                bypass_cache=True
            )
            assert res is not None

        # Call 26 in the same request session must trip the breaker
        with pytest.raises(TokenBudgetViolationError) as exc_info:
            temp_gateway.chat_completion(
                messages=[{"role": "user", "content": "Check row #26 which should fail"}],
                model="gpt-5-mini",
                bypass_cache=True
            )

        assert "Row-loop budget violation" in str(exc_info.value)
        assert f"Maximum {MAX_CALLS_PER_REQUEST} LLM calls exceeded" in str(exc_info.value)


def test_per_tenant_daily_budget_breaker(temp_gateway, monkeypatch):
    """Verifies that exceeding daily budget cap trips DailyBudgetExceededError."""
    # Temporarily lower daily budget limit to ₹0.001
    monkeypatch.setattr("llm_gateway.DEFAULT_DAILY_INR_LIMIT", 0.001)

    messages = [{"role": "user", "content": "Initial budget eating call"}]
    # First call records usage exceeding 0.001 INR
    temp_gateway.chat_completion(messages=messages, bypass_cache=True, tenant_id="tenant_budget_test")

    # Second call must raise DailyBudgetExceededError
    with pytest.raises(DailyBudgetExceededError) as exc_info:
        temp_gateway.chat_completion(
            messages=[{"role": "user", "content": "Second call after budget blown"}],
            bypass_cache=True,
            tenant_id="tenant_budget_test"
        )
    assert "Daily spend limit reached" in str(exc_info.value)


def test_telemetry_get_budget_status(temp_gateway):
    """Verifies structured budget and cache telemetry output."""
    status = temp_gateway.get_budget_status(tenant_id="default")
    assert "daily_tokens_used" in status
    assert "daily_cost_inr" in status
    assert "daily_cost_inr_limit" in status
    assert "budget_remaining_inr" in status
    assert "cache" in status
    assert "unique_prompts" in status["cache"]
    assert status["status"] in ["HEALTHY", "BUDGET_EXCEEDED"]


def test_llm_unavailable_when_unconfigured(tmp_path):
    """Verifies LLMUnavailableError when no client is configured and cache misses."""
    cache_db = str(tmp_path / "test_unconf_cache.sqlite")
    meter_store = str(tmp_path / "test_unconf_meter.json")
    gateway = LLMGateway(cache_db_path=cache_db, meter_store_path=meter_store)
    # Ensure client is None
    gateway.set_mock_client(None, deployment=None)

    with pytest.raises(LLMUnavailableError):
        gateway.chat_completion(
            messages=[{"role": "user", "content": "Hello"}],
            bypass_cache=True
        )


def test_api_get_llm_budget_endpoint():
    """Verifies that GET /governance/llm-budget returns live telemetry over HTTP."""
    from fastapi.testclient import TestClient
    from service import app

    client = TestClient(app)
    response = client.get("/governance/llm-budget?tenant_id=default")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "telemetry" in data
    assert data["telemetry"]["tenant_id"] == "default"
    assert "daily_tokens_limit" in data["telemetry"]
    assert "budget_remaining_inr" in data["telemetry"]


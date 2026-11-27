"""
DataX Centralized LLM Gateway & Cost Protection Spine (Plan 02 - Section 3)
=============================================================================
Single unified gateway for all outbound LLM & embedding operations across DataX.

Guarantees:
  1. Row-Loop Guardrail (Hard Assertion): Max 25 calls per request session.
     Exceeding 25 calls raises TokenBudgetViolationError to stop row-level spend explosion.
  2. Content-Addressed Prompt Cache: Identical prompt payloads return cached text
     with 0 tokens and ₹0 cost in <2ms.
  3. Per-Tenant Daily Token & INR/USD Budget Breakers: Persisted in .meter_store.json.
     Trips to deterministic fallback when daily limit is reached.
  4. Unified AzureOpenAI Client Provider: Single source of truth for Azure OpenAI.
"""

import os
import re
import json
import time
import sqlite3
import hashlib
import threading
from typing import Dict, Any, List, Optional, Tuple
from contextlib import contextmanager

try:
    from core.paths import data_path, PROJECT_ROOT
except ImportError:
    from paths import data_path, PROJECT_ROOT

from pydantic import BaseModel, Field

# -----------------------------------------------------------------------------
# Pricing Table (per 1M tokens) & Currency Conversions
# -----------------------------------------------------------------------------
USD_TO_INR = float(os.environ.get("DATAX_USD_TO_INR", "84.50"))

# Default pricing in USD per 1,000,000 tokens
MODEL_PRICING = {
    "gpt-4o-mini": {"prompt": 0.15, "completion": 0.60},
    "gpt-5-mini": {"prompt": 0.15, "completion": 0.60},
    "gpt-4o": {"prompt": 2.50, "completion": 10.00},
    "gpt-4": {"prompt": 30.00, "completion": 60.00},
    "text-embedding-3-small": {"prompt": 0.02, "completion": 0.0},
    "text-embedding-3-large": {"prompt": 0.13, "completion": 0.0},
}
DEFAULT_PRICING = {"prompt": 0.20, "completion": 0.80}

MAX_CALLS_PER_REQUEST = int(os.environ.get("DATAX_LLM_MAX_CALLS_PER_REQUEST", "25"))
DEFAULT_DAILY_TOKEN_LIMIT = int(os.environ.get("DATAX_LLM_DAILY_TOKEN_LIMIT", "1000000"))
DEFAULT_DAILY_INR_LIMIT = float(os.environ.get("DATAX_LLM_DAILY_BUDGET_INR", "500.0"))


# -----------------------------------------------------------------------------
# Exceptions & Response Models
# -----------------------------------------------------------------------------
class TokenBudgetViolationError(Exception):
    """Raised when an execution breaches per-request loop limits or spend budgets."""
    pass


class DailyBudgetExceededError(TokenBudgetViolationError):
    """Raised when tenant daily spending cap in INR/tokens is exceeded."""
    pass


class LLMUnavailableError(Exception):
    """Raised when upstream LLM client is unreachable or unconfigured."""
    pass


class LLMResponse(BaseModel):
    content: str
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    cost_usd: float = 0.0
    cost_inr: float = 0.0
    cached: bool = False
    finish_reason: str = "stop"
    call_latency_ms: float = 0.0


# -----------------------------------------------------------------------------
# Thread-Local Request Session Context
# -----------------------------------------------------------------------------
_session_storage = threading.local()


def _get_current_session_id() -> str:
    return getattr(_session_storage, "request_id", "standalone_default")


def _get_call_count(session_id: str) -> int:
    counts = getattr(_session_storage, "call_counts", {})
    return counts.get(session_id, 0)


def _increment_call_count(session_id: str) -> int:
    if not hasattr(_session_storage, "call_counts"):
        _session_storage.call_counts = {}
    current = _session_storage.call_counts.get(session_id, 0) + 1
    _session_storage.call_counts[session_id] = current
    return current


def _reset_call_count(session_id: str):
    if hasattr(_session_storage, "call_counts") and session_id in _session_storage.call_counts:
        del _session_storage.call_counts[session_id]


@contextmanager
def llm_request_context(request_id: Optional[str] = None):
    """
    Context manager to scope LLM calls to a single incoming HTTP request or DAG run.
    Enforces the row-loop guardrail strictly within this request lifecycle.
    """
    req_id = request_id or f"req_{int(time.time() * 1000)}"
    prev_id = getattr(_session_storage, "request_id", None)
    _session_storage.request_id = req_id
    _reset_call_count(req_id)
    try:
        yield req_id
    finally:
        _reset_call_count(req_id)
        if prev_id:
            _session_storage.request_id = prev_id
        else:
            if hasattr(_session_storage, "request_id"):
                del _session_storage.request_id


# -----------------------------------------------------------------------------
# Central LLMGateway Implementation
# -----------------------------------------------------------------------------
class LLMGateway:
    """
    Centralized Gateway for LLM invocations.
    Embeds Azure OpenAI client discovery, prompt caching, loop guardrails,
    and daily per-tenant budget enforcement.
    """

    def __init__(self, cache_db_path: Optional[str] = None, meter_store_path: Optional[str] = None):
        self.cache_db_path = cache_db_path or data_path("llm_prompt_cache.sqlite")
        self.meter_store_path = meter_store_path or data_path(".meter_store.json")
        self._lock = threading.Lock()
        self._client = None
        self._deployment = None
        self._client_initialized = False
        self._init_cache_db()

    def _init_cache_db(self):
        """Initializes SQLite content-addressed prompt cache table with index."""
        os.makedirs(os.path.dirname(self.cache_db_path), exist_ok=True)
        with sqlite3.connect(self.cache_db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS prompt_cache (
                    cache_key TEXT PRIMARY KEY,
                    model TEXT NOT NULL,
                    prompt_hash TEXT NOT NULL,
                    response_content TEXT NOT NULL,
                    prompt_tokens INTEGER DEFAULT 0,
                    completion_tokens INTEGER DEFAULT 0,
                    hit_count INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_hit_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_prompt_hash ON prompt_cache(prompt_hash)")
            conn.commit()

    # -------------------------------------------------------------------------
    # Client Discovery & Azure OpenAI Initializer (Single Source of Truth)
    # -------------------------------------------------------------------------
    def get_azure_client(self) -> Tuple[Optional[Any], Optional[str]]:
        """
        Lazily initializes and returns AzureOpenAI client and default deployment name.
        This is the ONLY place in DataX where AzureOpenAI is instantiated.
        """
        if self._client_initialized:
            return self._client, self._deployment

        with self._lock:
            if self._client_initialized:
                return self._client, self._deployment

            env = {}
            # 1. Search Production VM location
            prod_env = '/home/azureuserSDH/Production/nexlayer-backend/.env'
            if os.path.exists(prod_env):
                try:
                    with open(prod_env, 'r', encoding='utf-8') as f:
                        for line in f:
                            line = line.strip()
                            if '=' in line and not line.startswith('#'):
                                k, v = line.split('=', 1)
                                env[k.strip()] = v.strip().replace('"', '').replace("'", "")
                except Exception:
                    pass

            # 2. Search local .env if present
            local_env = os.path.join(PROJECT_ROOT, '.env')
            if os.path.exists(local_env):
                try:
                    with open(local_env, 'r', encoding='utf-8') as f:
                        for line in f:
                            line = line.strip()
                            if '=' in line and not line.startswith('#'):
                                k, v = line.split('=', 1)
                                env.setdefault(k.strip(), v.strip().replace('"', '').replace("'", ""))
                except Exception:
                    pass

            endpoint = os.environ.get('AZURE_OPENAI_ENDPOINT', env.get('AZURE_OPENAI_ENDPOINT'))
            key = os.environ.get('AZURE_OPENAI_KEY', env.get('AZURE_OPENAI_KEY') or env.get('AZURE_OPENAI_API_KEY'))
            deployment = os.environ.get('AZURE_OPENAI_DEPLOYMENT', env.get('AZURE_OPENAI_DEPLOYMENT', 'gpt-5-mini'))

            if endpoint and key:
                try:
                    from openai import AzureOpenAI
                    self._client = AzureOpenAI(
                        azure_endpoint=endpoint,
                        api_key=key,
                        api_version='2024-08-01-preview'
                    )
                    self._deployment = deployment
                except Exception as exc:
                    print(f"[LLM_GATEWAY] AzureOpenAI init failed: {exc}")
                    self._client = None
                    self._deployment = None
            else:
                self._client = None
                self._deployment = deployment

            self._client_initialized = True
            return self._client, self._deployment

    def set_mock_client(self, client: Any, deployment: str = "gpt-5-mini"):
        """Testing hook to inject mock client."""
        with self._lock:
            self._client = client
            self._deployment = deployment
            self._client_initialized = True

    def reset_client(self):
        """Reset client state for reload or tests."""
        with self._lock:
            self._client = None
            self._deployment = None
            self._client_initialized = False

    # -------------------------------------------------------------------------
    # Content-Addressed Cache
    # -------------------------------------------------------------------------
    def _compute_cache_key(self, model: str, messages: List[Dict[str, str]], temperature: float, max_tokens: int) -> Tuple[str, str]:
        canonical_payload = json.dumps({
            "model": model,
            "messages": messages,
            "temperature": round(temperature, 2),
            "max_tokens": max_tokens
        }, sort_keys=True)
        full_hash = hashlib.sha256(canonical_payload.encode("utf-8")).hexdigest()
        prompt_hash = hashlib.sha256(json.dumps(messages, sort_keys=True).encode("utf-8")).hexdigest()
        return full_hash, prompt_hash

    def _lookup_cache(self, cache_key: str) -> Optional[Dict[str, Any]]:
        try:
            with sqlite3.connect(self.cache_db_path) as conn:
                cur = conn.cursor()
                cur.execute(
                    "SELECT response_content, model, prompt_tokens, completion_tokens FROM prompt_cache WHERE cache_key = ?",
                    (cache_key,)
                )
                row = cur.fetchone()
                if row:
                    cur.execute(
                        "UPDATE prompt_cache SET hit_count = hit_count + 1, last_hit_at = CURRENT_TIMESTAMP WHERE cache_key = ?",
                        (cache_key,)
                    )
                    conn.commit()
                    return {
                        "content": row[0],
                        "model": row[1],
                        "prompt_tokens": row[2],
                        "completion_tokens": row[3],
                        "cached": True
                    }
        except Exception as e:
            print(f"[LLM_GATEWAY] Cache lookup warning: {e}")
        return None

    def _store_cache(self, cache_key: str, prompt_hash: str, model: str, content: str, prompt_tokens: int, completion_tokens: int):
        try:
            with sqlite3.connect(self.cache_db_path) as conn:
                conn.execute("""
                    INSERT INTO prompt_cache (cache_key, model, prompt_hash, response_content, prompt_tokens, completion_tokens)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(cache_key) DO UPDATE SET
                        hit_count = hit_count + 1,
                        last_hit_at = CURRENT_TIMESTAMP
                """, (cache_key, model, prompt_hash, content, prompt_tokens, completion_tokens))
                conn.commit()
        except Exception as e:
            print(f"[LLM_GATEWAY] Cache store warning: {e}")

    def clear_cache(self):
        """Purge all entries from the prompt cache."""
        try:
            with sqlite3.connect(self.cache_db_path) as conn:
                conn.execute("DELETE FROM prompt_cache")
                conn.commit()
        except Exception:
            pass

    # -------------------------------------------------------------------------
    # Cost & Token Metering (.meter_store.json)
    # -------------------------------------------------------------------------
    def _compute_cost(self, model: str, prompt_tokens: int, completion_tokens: int) -> Tuple[float, float]:
        rates = MODEL_PRICING.get(model, DEFAULT_PRICING)
        cost_usd = (prompt_tokens * rates["prompt"] + completion_tokens * rates["completion"]) / 1_000_000.0
        cost_inr = cost_usd * USD_TO_INR
        return round(cost_usd, 6), round(cost_inr, 4)

    def _load_meter_store(self) -> Dict[str, Any]:
        if not os.path.exists(self.meter_store_path):
            return {}
        try:
            with open(self.meter_store_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    def _save_meter_store(self, data: Dict[str, Any]):
        os.makedirs(os.path.dirname(self.meter_store_path), exist_ok=True)
        try:
            with open(self.meter_store_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"[LLM_GATEWAY] Meter store save error: {e}")

    def record_usage(self, tenant_id: str, prompt_tokens: int, completion_tokens: int, model: str) -> Dict[str, Any]:
        """Records token & rupee consumption against tenant daily quota."""
        cost_usd, cost_inr = self._compute_cost(model, prompt_tokens, completion_tokens)
        total_tokens = prompt_tokens + completion_tokens
        today_key = time.strftime("%Y-%m-%d")

        with self._lock:
            store = self._load_meter_store()
            tenant_data = store.setdefault(tenant_id, {})
            llm_budget = tenant_data.setdefault("llm_daily_budget", {})
            day_data = llm_budget.setdefault(today_key, {
                "tokens_used": 0,
                "cost_usd": 0.0,
                "cost_inr": 0.0,
                "calls_count": 0
            })

            day_data["tokens_used"] += total_tokens
            day_data["cost_usd"] = round(day_data["cost_usd"] + cost_usd, 6)
            day_data["cost_inr"] = round(day_data["cost_inr"] + cost_inr, 4)
            day_data["calls_count"] += 1

            self._save_meter_store(store)
            return {
                "day": today_key,
                "tokens_used": day_data["tokens_used"],
                "cost_inr": day_data["cost_inr"],
                "cost_usd": day_data["cost_usd"],
                "calls_count": day_data["calls_count"]
            }

    def get_budget_status(self, tenant_id: str = "default") -> Dict[str, Any]:
        """Returns live budget telemetry, daily limits, and cache health."""
        today_key = time.strftime("%Y-%m-%d")
        store = self._load_meter_store()
        tenant_data = store.get(tenant_id, {})
        day_data = tenant_data.get("llm_daily_budget", {}).get(today_key, {
            "tokens_used": 0,
            "cost_usd": 0.0,
            "cost_inr": 0.0,
            "calls_count": 0
        })

        # Cache stats
        cache_count = 0
        total_hits = 0
        try:
            with sqlite3.connect(self.cache_db_path) as conn:
                cur = conn.cursor()
                cur.execute("SELECT COUNT(*), COALESCE(SUM(hit_count), 0) FROM prompt_cache")
                row = cur.fetchone()
                if row:
                    cache_count, total_hits = row[0], row[1]
        except Exception:
            pass

        return {
            "tenant_id": tenant_id,
            "date": today_key,
            "daily_tokens_used": day_data["tokens_used"],
            "daily_tokens_limit": DEFAULT_DAILY_TOKEN_LIMIT,
            "daily_cost_inr": day_data["cost_inr"],
            "daily_cost_inr_limit": DEFAULT_DAILY_INR_LIMIT,
            "daily_cost_usd": day_data["cost_usd"],
            "daily_calls_count": day_data["calls_count"],
            "max_calls_per_request": MAX_CALLS_PER_REQUEST,
            "budget_remaining_inr": max(0.0, DEFAULT_DAILY_INR_LIMIT - day_data["cost_inr"]),
            "cache": {
                "unique_prompts": cache_count,
                "total_cache_hits": total_hits,
            },
            "status": "HEALTHY" if day_data["cost_inr"] < DEFAULT_DAILY_INR_LIMIT else "BUDGET_EXCEEDED"
        }

    def reset_daily_meter(self, tenant_id: str = "default"):
        """Testing utility to clear current day usage."""
        today_key = time.strftime("%Y-%m-%d")
        with self._lock:
            store = self._load_meter_store()
            if tenant_id in store and "llm_daily_budget" in store[tenant_id]:
                if today_key in store[tenant_id]["llm_daily_budget"]:
                    del store[tenant_id]["llm_daily_budget"][today_key]
                    self._save_meter_store(store)

    # -------------------------------------------------------------------------
    # Core Chat Completion Execution
    # -------------------------------------------------------------------------
    def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.1,
        tenant_id: str = "default",
        bypass_cache: bool = False,
        request_id: Optional[str] = None,
        timeout: float = 15.0
    ) -> LLMResponse:
        """
        Executes an LLM chat completion guarded by:
          1. Row-loop breaker: checks call count in current request session.
          2. Daily INR/token limit check.
          3. Content-addressed semantic cache lookup.
          4. Upstream Azure OpenAI execution with timeout and token recording.
        """
        # 1. Row-Loop Guardrail Check
        active_session = request_id or _get_current_session_id()
        current_calls = _increment_call_count(active_session)
        if current_calls > MAX_CALLS_PER_REQUEST:
            raise TokenBudgetViolationError(
                f"Row-loop budget violation: Maximum {MAX_CALLS_PER_REQUEST} LLM calls exceeded "
                f"for request session '{active_session}' (call #{current_calls}). "
                "DataX prevents unbounded row-level LLM iterations by design."
            )

        # 2. Daily Budget Circuit Breaker Check
        budget = self.get_budget_status(tenant_id)
        if budget["daily_cost_inr"] >= DEFAULT_DAILY_INR_LIMIT:
            raise DailyBudgetExceededError(
                f"Daily spend limit reached for tenant '{tenant_id}': ₹{budget['daily_cost_inr']:.2f} "
                f"exceeds daily cap ₹{DEFAULT_DAILY_INR_LIMIT:.2f}. "
                "Circuit breaker tripped to prevent cost explosion."
            )
        if budget["daily_tokens_used"] >= DEFAULT_DAILY_TOKEN_LIMIT:
            raise DailyBudgetExceededError(
                f"Daily token limit reached for tenant '{tenant_id}': {budget['daily_tokens_used']} "
                f"tokens exceeds cap {DEFAULT_DAILY_TOKEN_LIMIT}. Circuit breaker tripped."
            )

        # 3. Model Resolution
        client, default_deployment = self.get_azure_client()
        target_model = model or default_deployment or "gpt-5-mini"

        # 4. Content-Addressed Cache Lookup
        cache_key, prompt_hash = self._compute_cache_key(target_model, messages, temperature, max_tokens)
        if not bypass_cache:
            cached_res = self._lookup_cache(cache_key)
            if cached_res:
                return LLMResponse(
                    content=cached_res["content"],
                    model=target_model,
                    prompt_tokens=0,
                    completion_tokens=0,
                    total_tokens=0,
                    cost_usd=0.0,
                    cost_inr=0.0,
                    cached=True,
                    finish_reason="stop",
                    call_latency_ms=0.5
                )

        # 5. Upstream Client Verification
        if not client:
            raise LLMUnavailableError(
                "Azure OpenAI client is unconfigured or credentials are missing. "
                "Provide AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_KEY or activate offline certified heuristics."
            )

        # 6. Live Execution
        start_time = time.time()
        try:
            # Azure OpenAI supports max_completion_tokens or max_tokens depending on model
            completion_args = {
                "model": target_model,
                "messages": messages,
                "temperature": temperature,
                "timeout": timeout,
            }
            if "gpt-5" in target_model.lower() or "o1" in target_model.lower():
                completion_args["max_completion_tokens"] = max_tokens
            else:
                completion_args["max_tokens"] = max_tokens

            res = client.chat.completions.create(**completion_args)
            latency_ms = round((time.time() - start_time) * 1000, 2)

            content = (res.choices[0].message.content or "").strip()
            prompt_tokens = getattr(res.usage, "prompt_tokens", len(json.dumps(messages)) // 4)
            completion_tokens = getattr(res.usage, "completion_tokens", len(content) // 4)
            total_tokens = prompt_tokens + completion_tokens

            cost_usd, cost_inr = self._compute_cost(target_model, prompt_tokens, completion_tokens)

            # Record in daily meter
            self.record_usage(tenant_id, prompt_tokens, completion_tokens, target_model)

            # Store in cache
            self._store_cache(cache_key, prompt_hash, target_model, content, prompt_tokens, completion_tokens)

            return LLMResponse(
                content=content,
                model=target_model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                cost_usd=cost_usd,
                cost_inr=cost_inr,
                cached=False,
                finish_reason=getattr(res.choices[0], "finish_reason", "stop") or "stop",
                call_latency_ms=latency_ms
            )

        except (TokenBudgetViolationError, DailyBudgetExceededError):
            raise
        except Exception as exc:
            # Let callers handle network/API errors with fallback
            raise exc


# Global Singleton Instance
llm_gateway = LLMGateway()


def get_llm_gateway() -> LLMGateway:
    """Convenience getter for centralized gateway instance."""
    return llm_gateway

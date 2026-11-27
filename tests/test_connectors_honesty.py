"""
Unit Tests for Database Connector Honesty (Task S1-11 Gate)
===========================================================
Verifies that:
  1. Unconfigured or bogus Snowflake endpoints return honest success: False.
  2. Unconfigured or bogus MySQL endpoints return honest success: False.
  3. Unconfigured or bogus SAP HANA endpoints return honest success: False.
  4. Unsupported or arbitrary database engines return honest success: False.
  5. Only explicitly requested demo sandbox connections return sample data.
"""

import os
import sys
import pytest

# Ensure backend and its subdirectories are in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
for d in [backend_dir, os.path.join(backend_dir, "connectors"), os.path.join(backend_dir, "models")]:
    if d not in sys.path:
        sys.path.insert(0, d)

from connectors import test_database_connection as check_db_connection
from models import StoreCredentialRequest


def test_bogus_snowflake_returns_honest_failure():
    """Confirms bogus Snowflake host returns success: False."""
    req = StoreCredentialRequest(
        engine="snowflake",
        host="bogus-account-998877.snowflakecomputing.com",
        user="fake_user",
        password="bad_password",
        database="PRODUCTION_DW"
    )
    res = check_db_connection(req)
    assert res["success"] is False
    assert res["engine"] == "snowflake"
    assert "error" in res or "message" in res


def test_bogus_mysql_returns_honest_failure():
    """Confirms unreachable MySQL endpoint returns success: False."""
    req = StoreCredentialRequest(
        engine="mysql",
        host="fake-nonexistent-host.internal.net",
        port="3306",
        user="root",
        password="wrong_password",
        database="orders_db"
    )
    res = check_db_connection(req)
    assert res["success"] is False
    assert res["engine"] == "mysql"
    assert "error" in res or "message" in res


def test_bogus_sap_returns_honest_failure():
    """Confirms unreachable SAP HANA endpoint returns success: False."""
    req = StoreCredentialRequest(
        engine="sap_bw",
        host="unreachable.sap.hana.ondemand.com",
        port="443",
        user="bwp_user",
        password="secret_password",
        database="DATAX_STAGING"
    )
    res = check_db_connection(req)
    assert res["success"] is False
    assert res["engine"] == "sap_bw"
    assert "error" in res or "message" in res


def test_unsupported_engine_returns_honest_failure():
    """Confirms random unsupported engine names return success: False."""
    req = StoreCredentialRequest(
        engine="some_fictional_db",
        host="db.example.com",
        database="test"
    )
    res = check_db_connection(req)
    assert res["success"] is False
    assert "Unsupported or unconfigured" in res["error"]


def test_explicit_demo_sandbox_returns_success():
    """Confirms that explicit demo sandbox requests return demo data with demo_mode: True."""
    req = StoreCredentialRequest(
        engine="mysql",
        host="demo-sandbox",
        database="demo_sandbox"
    )
    res = check_db_connection(req)
    assert res["success"] is True
    assert res.get("demo_mode") is True
    assert len(res["tables"]) > 0

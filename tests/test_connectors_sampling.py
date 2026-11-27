import pytest
from unittest.mock import MagicMock, patch
import sys
import os

# Add backend directory to sys.path
_TEST_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_TEST_DIR)
_BACKEND_DIR = os.path.join(_PROJECT_ROOT, "backend")
for d in [_BACKEND_DIR, os.path.join(_BACKEND_DIR, "connectors"), os.path.join(_BACKEND_DIR, "engines")]:
    if d not in sys.path:
        sys.path.insert(0, d)

from connectors import sample_table_data
from models import SampleDataRequest
from studio_io_engine import list_database_tables, extract_database_records


def test_mysql_demo_sandbox_sampling():
    """Verifies that MySQL demo sandbox returns 5 structured demo rows."""
    req = SampleDataRequest(
        engine="mysql",
        host="demo-sandbox",
        database="demo_sandbox",
        table="orders",
        limit=5
    )
    result = sample_table_data(req)
    assert result["success"] is True
    assert result["engine"] == "mysql"
    assert result["count"] == 5
    assert "order_id" in result["columns"]
    assert "amount" in result["columns"]
    assert len(result["rows"]) == 5


def test_mysql_unconfigured_host_sampling_fails_honestly():
    """Verifies that bogus MySQL credentials return honest failure, not fake stubs."""
    req = SampleDataRequest(
        engine="mysql",
        host="fake-mysql.internal",
        user="nobody",
        password="badpassword",
        database="test_db",
        table="orders",
        limit=10
    )
    result = sample_table_data(req)
    assert result["success"] is False
    assert result["engine"] == "mysql"
    assert "error" in result
    assert result["rows"] == []


def test_mysql_live_sampling_with_mocked_driver():
    """Verifies that pymysql driver executes proper SELECT LIMIT queries."""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

    mock_cursor.fetchall.side_effect = [
        [{"TABLE_NAME": "customers"}, {"TABLE_NAME": "orders"}],  # SHOW TABLES
        [
            {"id": 1, "name": "Infosys", "revenue": 1000000.0},
            {"id": 2, "name": "Wipro", "revenue": 850000.0}
        ]  # SELECT * LIMIT 5
    ]
    mock_cursor.fetchone.return_value = {"cnt": 2}

    with patch("pymysql.connect", return_value=mock_conn):
        req = SampleDataRequest(
            engine="mysql",
            host="127.0.0.1",
            user="root",
            password="secret_password",
            database="prod_db",
            table="customers",
            limit=5
        )
        res = sample_table_data(req)
        assert res["success"] is True
        assert res["engine"] == "mysql"
        assert res["count"] == 2
        assert "revenue" in res["columns"]
        assert res["rows"][0]["name"] == "Infosys"


def test_studio_io_list_database_tables_mysql():
    """Verifies studio_io_engine.list_database_tables handles MySQL engine."""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

    mock_cursor.fetchall.return_value = [
        {"name": "customers", "approx_rows": 1500},
        {"name": "orders", "approx_rows": 45000}
    ]

    with patch("pymysql.connect", return_value=mock_conn):
        res = list_database_tables(
            engine="mysql",
            connection_uri="mysql://test_user:pass@127.0.0.1:3306/prod_db",
            database="prod_db"
        )
        assert res["status"] == "success"
        assert res["engine"] == "mysql"
        assert "customers" in res["tables"]
        assert "orders" in res["tables"]
        assert res["tableDetails"][1]["approxRows"] == 45000


def test_studio_io_extract_database_records_mysql():
    """Verifies studio_io_engine.extract_database_records extracts records with LIMIT."""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

    mock_cursor.fetchone.return_value = {"cnt": 500}
    mock_cursor.fetchall.return_value = [
        {"id": 1, "sku": "P-100", "price": 49.99},
        {"id": 2, "sku": "P-101", "price": 89.99}
    ]

    with patch("pymysql.connect", return_value=mock_conn):
        res = extract_database_records(
            engine="mysql",
            table_name="products",
            connection_uri="mysql://test_user:pass@127.0.0.1:3306/prod_db",
            limit=100
        )
        assert res["status"] == "success"
        assert res["engine"] == "mysql"
        assert res["table"] == "products"
        assert res["totalRowsInTable"] == 500
        assert res["extractedCount"] == 2
        assert "sku" in res["columns"]

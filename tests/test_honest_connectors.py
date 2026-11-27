from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
from contextlib import contextmanager
from types import SimpleNamespace

from backend.connectors import connectors as connector_module
verify_database_connection = connector_module.test_database_connection
sample_database_table = connector_module.sample_table_data
from backend.models.models import SampleDataRequest, StoreCredentialRequest


@pytest.mark.parametrize(
    ("engine", "status"),
    [
        ("mysql", "PYMYSQL_NOT_INSTALLED"),
        ("mariadb", "PYMYSQL_NOT_INSTALLED"),
        ("mssql", "PYMSSQL_NOT_INSTALLED"),
        ("sqlserver", "PYMSSQL_NOT_INSTALLED"),
    ],
)
def test_missing_optional_drivers_are_reported(monkeypatch, engine, status):
    if "mssql" in engine or "sqlserver" in engine:
        monkeypatch.setattr(connector_module, "pymssql", None)
    else:
        monkeypatch.setattr(connector_module, "pymysql", None)

    req = StoreCredentialRequest(
        engine=engine,
        host="127.0.0.1",
        port="3306" if engine in ("mysql", "mariadb") else "1433",
        database="datax_test",
        user="datax_test",
        password="datax_test",
    )
    result = verify_database_connection(req)
    assert result["success"] is False
    assert result["status"] == status


def test_sap_missing_hdbcli_is_honest(monkeypatch):
    monkeypatch.setattr(connector_module, "hdbcli", None)
    req = StoreCredentialRequest(
        engine="sap",
        host="hana.example.invalid",
        port="443",
        database="DATAX",
        user="test",
        password="test",
    )
    result = verify_database_connection(req)
    assert result["success"] is False
    assert result["status"] == "HDBCLI_NOT_INSTALLED"
    assert result["driverStatus"] == "HDBCLI_NOT_INSTALLED"
    assert result["sandboxAction"] == "Load Certified SAP Sandbox Dataset"
    assert "hdbcli" in result["error"]


def test_sap_sample_never_returns_fake_catalog_rows():
    req = SampleDataRequest(
        engine="sap",
        host="hana.example.invalid",
        port="443",
        table="MARA",
        user="test",
        password="test",
        limit=25,
    )
    result = sample_database_table(req)
    assert result["success"] is False
    assert result["rows"] == []
    assert result["columns"] == []


def test_fake_or_placeholder_credentials_are_rejected():
    req = StoreCredentialRequest(
        engine="postgres",
        host="target-db.internal",
        port="5432",
        database="datax",
        user="user",
        password="password",
    )
    result = verify_database_connection(req)
    assert result["success"] is False
    assert "placeholder" in result["message"].lower()


def test_missing_postgres_credentials_do_not_attempt_internal_storage(monkeypatch):
    def fail_if_called(_uri):
        raise AssertionError("database connection must not be attempted")

    monkeypatch.setattr(connector_module.db_pool, "get_connection", fail_if_called)
    test_result = verify_database_connection(StoreCredentialRequest(engine="postgres"))
    sample_result = sample_database_table(SampleDataRequest(engine="postgres"))

    assert test_result["success"] is False
    assert sample_result["success"] is False
    assert sample_result["rows"] == []


def test_unsupported_engine_does_not_claim_success():
    req = StoreCredentialRequest(
        engine="oracle",
        host="127.0.0.1",
        port="1521",
        database="ORCL",
        user="test",
        password="test",
    )
    result = verify_database_connection(req)
    assert result["success"] is False
    assert result["status"] == "UNSUPPORTED_OR_UNCONFIGURED_DRIVER"


def test_test_database_compose_seeds_postgres_and_mysql():
    compose_path = ROOT / "deploy" / "docker-compose.test-dbs.yml"
    postgres_seed = ROOT / "deploy" / "test-db-init" / "postgres" / "001_seed.sql"
    mysql_seed = ROOT / "deploy" / "test-db-init" / "mysql" / "001_seed.sql"
    compose = compose_path.read_text(encoding="utf-8")

    assert "postgres:16-alpine" in compose
    assert "mysql:8.0" in compose
    assert postgres_seed.is_file()
    assert mysql_seed.is_file()
    assert "customers" in postgres_seed.read_text(encoding="utf-8")
    assert "customers" in mysql_seed.read_text(encoding="utf-8")


class FakeCursor:
    def __init__(self):
        self.query = ""
        self.params = None
        self.executions = []

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, query, params=None):
        self.query = query
        self.params = params
        self.executions.append((query, params))

    def fetchall(self):
        if "information_schema" in self.query.lower():
            return [{"table_name": "customers"}]
        if "INFORMATION_SCHEMA" in self.query.upper():
            return [{"TABLE_NAME": "customers"}]
        if self.query.lower().startswith("select *"):
            return [{"id": 1, "name": "Ada Example"}]
        if self.query.upper().startswith("SELECT TOP"):
            return [{"id": 1, "name": "Ada Example"}]
        return []

    def fetchone(self):
        return {"cnt": 2}

    def close(self):
        pass


class FakeConnection:
    def __init__(self):
        self.last_cursor = None
        self.cursors = []

    def cursor(self, **_kwargs):
        self.last_cursor = FakeCursor()
        self.cursors.append(self.last_cursor)
        return self.last_cursor

    def close(self):
        pass


class FakePostgresCursor(FakeCursor):
    def fetchall(self):
        if "information_schema.tables" in self.query.lower():
            return [{"table_name": "customers"}]
        if self.query.lower().startswith("select *"):
            return [{"id": 1, "name": "Ada Example"}]
        return []


class FakePostgresConnection:
    def cursor(self, **_kwargs):
        return FakePostgresCursor()


def test_postgres_structured_credentials_do_not_fall_back_to_app_storage(monkeypatch):
    seen_uris = []

    @contextmanager
    def fake_get_connection(uri):
        seen_uris.append(uri)
        yield FakePostgresConnection()

    monkeypatch.setattr(connector_module.db_pool, "get_connection", fake_get_connection)
    result = sample_database_table(SampleDataRequest(
        engine="postgres",
        host="postgres.example.invalid",
        port="5433",
        database="datax_test",
        user="test_user",
        password="test@pass",
        table="customers",
        limit=2,
    ))

    assert result["success"] is True
    assert result["rows"] == [{"id": 1, "name": "Ada Example"}]
    assert seen_uris == [
        "postgresql://test_user:test%40pass@postgres.example.invalid:5433/datax_test"
    ]


def test_mysql_uri_discovery_and_bounded_live_sampling(monkeypatch):
    connection = FakeConnection()
    connect_args = {}

    def fake_connect(**kwargs):
        connect_args.update(kwargs)
        return connection

    monkeypatch.setattr(connector_module, "pymysql", SimpleNamespace(
        connect=fake_connect,
        cursors=SimpleNamespace(DictCursor=object()),
    ))
    uri = "mysql://test_user:test%40pass@mysql.example.invalid:3307/datax_test"
    connect_result = verify_database_connection(StoreCredentialRequest(
        engine="mysql",
        connectionUri=uri,
    ))
    assert connect_result["success"] is True
    assert connect_result["tables"] == ["customers"]
    assert connect_args["host"] == "mysql.example.invalid"
    assert connect_args["port"] == 3307
    assert connect_args["user"] == "test_user"
    assert connect_args["password"] == "test@pass"
    assert connect_args["database"] == "datax_test"

    sample_result = sample_database_table(SampleDataRequest(
        engine="mysql",
        connectionUri=uri,
        table="customers",
        limit=500,
    ))
    assert sample_result["success"] is True
    assert sample_result["columns"] == ["id", "name"]
    assert sample_result["rows"] == [{"id": 1, "name": "Ada Example"}]
    assert sample_result["totalRows"] == 2
    assert any(
        params == (50,) and "LIMIT %s" in query
        for cursor in connection.cursors
        for query, params in cursor.executions
    )


def test_mysql_rejects_unknown_table_before_sampling(monkeypatch):
    connection = FakeConnection()
    monkeypatch.setattr(connector_module, "pymysql", SimpleNamespace(
        connect=lambda **_kwargs: connection,
        cursors=SimpleNamespace(DictCursor=object()),
    ))

    result = sample_database_table(SampleDataRequest(
        engine="mysql",
        connectionUri="mysql://test_user:test_pass@mysql.example.invalid/datax_test",
        table="customers` ; DROP TABLE customers; --",
    ))
    assert result["success"] is False
    assert result["rows"] == []
    assert connection.last_cursor.query.strip().lower().startswith("select table_name")


def test_sql_server_uri_discovery_and_bounded_live_sampling(monkeypatch):
    connection = FakeConnection()
    connect_args = {}

    def fake_connect(**kwargs):
        connect_args.update(kwargs)
        return connection

    monkeypatch.setattr(connector_module, "pymssql", SimpleNamespace(connect=fake_connect))
    uri = "mssql+pymssql://test_user:test%3Apass@sql.example.invalid:1444/datax_test"
    connect_result = verify_database_connection(StoreCredentialRequest(
        engine="mssql",
        connectionUri=uri,
    ))
    assert connect_result["success"] is True
    assert connect_result["tables"] == ["customers"]
    assert connect_args["server"] == "sql.example.invalid"
    assert connect_args["port"] == "1444"
    assert connect_args["password"] == "test:pass"

    sample_result = sample_database_table(SampleDataRequest(
        engine="mssql",
        connectionUri=uri,
        table="customers",
        limit=500,
    ))
    assert sample_result["success"] is True
    assert sample_result["rows"] == [{"id": 1, "name": "Ada Example"}]
    assert sample_result["totalRows"] == 2
    assert any(
        "TOP (50)" in query
        for cursor in connection.cursors
        for query, _params in cursor.executions
    )

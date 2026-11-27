import os

import pytest

from backend.connectors.connectors import (
    sample_table_data,
    test_database_connection as verify_database_connection,
)
from backend.models.models import SampleDataRequest, StoreCredentialRequest


MYSQL_URI = os.environ.get("DATAX_TEST_MYSQL_URI")
POSTGRES_URI = os.environ.get("DATAX_TEST_POSTGRES_URI")
MSSQL_URI = os.environ.get("DATAX_TEST_MSSQL_URI")


@pytest.mark.parametrize(
    ("engine", "uri"),
    [
        ("mysql", MYSQL_URI),
        ("postgres", POSTGRES_URI),
        ("mssql", MSSQL_URI),
    ],
)
def test_live_relational_connector_discovers_and_samples_seeded_table(engine, uri):
    if not uri:
        pytest.skip(f"DATAX_TEST_{engine.upper()}_URI is not configured.")

    connection = verify_database_connection(StoreCredentialRequest(
        engine=engine,
        connectionUri=uri,
    ))
    assert connection["success"] is True
    assert "customers" in connection["tables"]

    sample = sample_table_data(SampleDataRequest(
        engine=engine,
        connectionUri=uri,
        table="customers",
        limit=2,
    ))
    assert sample["success"] is True
    assert sample["table"] == "customers"
    assert sample["count"] == 2
    assert sample["totalRows"] == 2
    assert sample["columns"] == ["id", "name", "email"]
    assert {row["name"] for row in sample["rows"]} == {"Ada Example", "Lin Example"}

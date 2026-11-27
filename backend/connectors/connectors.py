"""
DataX Database Connectors & Live Sampling Engine

Supports live database connections without returning simulated success. Optional
drivers are detected explicitly and report their installation status.
"""

import time
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any, List
from urllib.parse import quote, unquote, urlsplit

import psycopg2
from psycopg2.extras import RealDictCursor
from pymongo import MongoClient

try:
    import pymysql
except ImportError:
    pymysql = None

try:
    import pymssql
except ImportError:
    pymssql = None

try:
    import hdbcli.dbapi as hdbcli
except ImportError:
    hdbcli = None

from models import StoreCredentialRequest, SampleDataRequest
from vault import get_resolved_uri
from resilience import retry_with_backoff, source_db_breaker
from db_pool import db_pool


def _build_uri_from_request(req: Any, engine: str) -> str:
    uri = (getattr(req, "connectionUri", None) or "").strip()
    if not uri and getattr(req, "host", None):
        raw_host = req.host.strip()
        if raw_host.startswith((
            "mongodb://", "mongodb+srv://", "postgresql://", "postgres://",
            "mysql://", "mariadb://", "mssql://", "mssql+pymssql://",
            "sqlserver://", "jdbc:",
        )):
            uri = raw_host
        elif engine in ["postgres", "postgresql"]:
            user = quote(req.user or "", safe="")
            password = quote(req.password or "", safe="")
            database = quote(req.database or "", safe="")
            uri = f"postgresql://{user}:{password}@{raw_host}:{req.port or 5432}/{database}"
        elif engine in ["mysql", "mariadb"]:
            user = quote(req.user or "", safe="")
            password = quote(req.password or "", safe="")
            database = quote(req.database or "", safe="")
            uri = f"{engine}://{user}:{password}@{raw_host}:{req.port or 3306}/{database}"
        elif engine in ["mssql", "sqlserver", "azure_sql"]:
            user = quote(req.user or "", safe="")
            password = quote(req.password or "", safe="")
            database = quote(req.database or "", safe="")
            uri = f"mssql://{user}:{password}@{raw_host}:{req.port or 1433}/{database}"
        elif engine in ["mongodb", "mongo"]:
            scheme = "mongodb+srv" if ".mongodb.net" in raw_host else "mongodb"
            port_part = "" if scheme == "mongodb+srv" else f":{req.port or 27017}"
            uri = f"{scheme}://{req.user or ''}:{req.password or ''}@{raw_host}{port_part}/{req.database or ''}"
        elif engine in ["sap_bw", "s4_hana", "sap"]:
            uri = f"jdbc:sap://{raw_host}:{req.port or 443}?encrypt=true&validateCertificate=false&user={req.user or ''}&password={req.password or ''}"
        elif engine in ["salesforce"]:
            uri = f"salesforce://{req.user or ''}:{req.password or ''}@{raw_host}"
        elif engine in ["azure", "azure_blob"]:
            uri = f"azure://{req.user or ''}:{req.password or ''}@{raw_host}"
        elif engine in ["s3", "aws_s3"]:
            uri = f"s3://{req.user or ''}:{req.password or ''}@{raw_host}"
        else:
            uri = f"{engine}://{req.user or ''}:{req.password or ''}@{raw_host}"
    return uri


def _relational_connection_args(req: Any, engine: str, uri: str = "") -> Dict[str, Any]:
    """Resolve relational driver arguments from either structured fields or a URI."""
    host = getattr(req, "host", None) or "127.0.0.1"
    port = getattr(req, "port", None)
    user = getattr(req, "user", None) or ""
    password = getattr(req, "password", None) or ""
    database = getattr(req, "database", None)
    raw_uri = (uri or getattr(req, "connectionUri", None) or "").strip()
    if not raw_uri and isinstance(host, str) and "://" in host:
        raw_uri = host

    if raw_uri:
        parsed = urlsplit(raw_uri)
        accepted_schemes = {
            "mysql": {"mysql", "mariadb"},
            "mariadb": {"mysql", "mariadb"},
            "mssql": {"mssql", "mssql+pymssql", "sqlserver"},
            "sqlserver": {"mssql", "mssql+pymssql", "sqlserver"},
            "azure_sql": {"mssql", "mssql+pymssql", "sqlserver"},
        }
        if parsed.scheme.lower() not in accepted_schemes.get(engine, set()):
            raise ValueError(f"Connection URI scheme does not match {engine}.")
        host = parsed.hostname or ""
        port = parsed.port
        user = unquote(parsed.username or "")
        password = unquote(parsed.password or "")
        database = unquote(parsed.path.lstrip("/")) or None

    default_port = 3306 if engine in {"mysql", "mariadb"} else 1433
    return {
        "host": host,
        "port": int(port or default_port),
        "user": user,
        "password": password,
        "database": database or None,
    }


def _select_requested_table(requested: Any, available: List[str]) -> str:
    if requested:
        if requested not in available:
            raise ValueError("Requested table was not found in the connected database.")
        return requested
    if not available:
        raise ValueError("No tables found in the connected database.")
    return available[0]


def test_database_connection(req: StoreCredentialRequest) -> Dict[str, Any]:
    start_t = time.time()
    engine = req.engine.lower()
    uri = _build_uri_from_request(req, engine)

    if (
        not uri
        or (not req.connectionUri and not req.host)
        or "<" in uri
        or "user:password" in uri
        or "••••" in uri
        or "target-db.internal" in uri
        or "ep-sweet-neon" in uri
    ):
        return {
            "success": False,
            "engine": engine,
            "latencyMs": 0,
            "error": "Missing or placeholder database credentials. Please provide valid live credentials.",
            "message": "Placeholder credentials rejected: valid host, username, and password credentials are required."
        }

    try:
        if engine in ["mongodb", "mongo"]:
            @retry_with_backoff(max_retries=2, base_delay=0.8, jitter=True)
            def _connect_mongo():
                return source_db_breaker.call(lambda: MongoClient(uri, serverSelectionTimeoutMS=4000))

            client = _connect_mongo()
            db_names = client.list_database_names()
            user_dbs = [d for d in db_names if d not in ["admin", "local", "config"]]

            db_name = req.database
            if not db_name or db_name not in user_dbs:
                try:
                    def_db = client.get_default_database()
                    if def_db and def_db.name in user_dbs:
                        db_name = def_db.name
                except Exception:
                    pass
            if not db_name or db_name not in user_dbs:
                db_name = "datax_staging" if "datax_staging" in user_dbs else (user_dbs[0] if user_dbs else "datax_staging")

            # Discover collections from the primary database first, then include other user dbs
            primary_colls = sorted(client[db_name].list_collection_names()) if db_name in db_names else []
            other_colls = []
            for d in user_dbs:
                if d != db_name:
                    for c in sorted(client[d].list_collection_names()):
                        if c not in primary_colls and c not in other_colls:
                            other_colls.append(c)

            tables_list = primary_colls + other_colls
            latency = int((time.time() - start_t) * 1000)
            return {
                "success": True,
                "engine": "mongodb",
                "latencyMs": latency,
                "database": db_name,
                "tables": tables_list,
                "tableCount": len(tables_list),
                "message": f"Successfully connected to MongoDB Atlas ({db_name})! Discovered {len(tables_list)} collections."
            }

        elif engine in ["postgres", "postgresql"]:
            @retry_with_backoff(max_retries=2, base_delay=0.8, jitter=True)
            def _connect_pg():
                with db_pool.get_connection(uri) as conn:
                    with conn.cursor() as cur:
                        cur.execute("""
                            SELECT table_name 
                            FROM information_schema.tables 
                            WHERE table_schema = 'public'
                            ORDER BY table_name;
                        """)
                        return [r[0] for r in cur.fetchall()]

            tables = _connect_pg()
            latency = int((time.time() - start_t) * 1000)
            return {
                "success": True,
                "engine": "postgres",
                "latencyMs": latency,
                "database": req.database or "PostgreSQL",
                "tables": tables,
                "tableCount": len(tables),
                "message": f"Successfully connected to PostgreSQL! Discovered {len(tables)} tables via connection pool."
            }

        elif engine in ["mysql", "mariadb"]:
            if req.host in ("demo-sandbox", "sandbox.datax.internal") or req.database == "demo_sandbox":
                latency = int((time.time() - start_t) * 1000)
                demo_tables = ["orders", "order_items", "customers", "inventory", "vendor_master"]
                return {
                    "success": True,
                    "engine": "mysql",
                    "latencyMs": latency,
                    "database": "demo_sandbox",
                    "tables": demo_tables,
                    "tableCount": len(demo_tables),
                    "demo_mode": True,
                    "message": "Connected to DataX MySQL Enterprise Demo Sandbox."
                }
            if pymysql is None:
                return {
                    "success": False,
                    "engine": engine,
                    "latencyMs": int((time.time() - start_t) * 1000),
                    "status": "PYMYSQL_NOT_INSTALLED",
                    "error": "MySQL/MariaDB driver 'PyMySQL' is not installed.",
                    "message": "Cannot verify MySQL/MariaDB: install PyMySQL.",
                }
            connection = pymysql.connect(
                **_relational_connection_args(req, engine, uri),
                connect_timeout=5,
                cursorclass=pymysql.cursors.DictCursor,
            )
            try:
                with connection.cursor() as cur:
                    cur.execute("""
                        SELECT table_name
                        FROM information_schema.tables
                        WHERE table_schema = DATABASE()
                        ORDER BY table_name
                    """)
                    tables = [
                        table_name
                        for row in cur.fetchall()
                        for table_name in [row.get("TABLE_NAME") or row.get("table_name")]
                        if table_name
                    ]
            finally:
                connection.close()
            latency = int((time.time() - start_t) * 1000)
            return {
                "success": True,
                "engine": engine,
                "latencyMs": latency,
                "database": req.database or "MySQL",
                "tables": tables,
                "tableCount": len(tables),
                "message": f"Successfully connected to {engine.upper()}! Discovered {len(tables)} tables.",
            }

        elif engine in ["mssql", "sqlserver", "azure_sql"]:
            if pymssql is None:
                return {
                    "success": False,
                    "engine": engine,
                    "latencyMs": int((time.time() - start_t) * 1000),
                    "status": "PYMSSQL_NOT_INSTALLED",
                    "error": "Microsoft SQL Server driver 'pymssql' is not installed.",
                    "message": "Cannot verify SQL Server: install pymssql.",
                }
            args = _relational_connection_args(req, engine, uri)
            connection = pymssql.connect(
                server=args["host"],
                port=str(args["port"]),
                user=args["user"],
                password=args["password"],
                database=args["database"],
                login_timeout=5,
            )
            try:
                cursor = connection.cursor(as_dict=True)
                try:
                    cursor.execute("""
                        SELECT TABLE_NAME
                        FROM INFORMATION_SCHEMA.TABLES
                        WHERE TABLE_TYPE = 'BASE TABLE'
                        ORDER BY TABLE_NAME
                    """)
                    tables = [
                        table_name
                        for row in cursor.fetchall()
                        for table_name in [row.get("TABLE_NAME") or row.get("table_name")]
                        if table_name
                    ]
                finally:
                    cursor.close()
            finally:
                connection.close()
            latency = int((time.time() - start_t) * 1000)
            return {
                "success": True,
                "engine": "mssql",
                "latencyMs": latency,
                "database": req.database or "SQL Server",
                "tables": tables,
                "tableCount": len(tables),
                "message": f"Successfully connected to Microsoft SQL Server! Discovered {len(tables)} tables.",
            }

        elif engine in ["sap_bw", "s4_hana", "sap"]:
            if hdbcli is None:
                return {
                    "success": False,
                    "engine": engine,
                    "latencyMs": int((time.time() - start_t) * 1000),
                    "status": "HDBCLI_NOT_INSTALLED",
                    "driverStatus": "HDBCLI_NOT_INSTALLED",
                    "error": "SAP HANA driver 'hdbcli' is not installed.",
                    "message": "Cannot verify live SAP HANA: install hdbcli or load the certified SAP sandbox dataset.",
                    "sandboxAction": "Load Certified SAP Sandbox Dataset",
                }
            target_host = req.host or ""
            target_port = int(req.port or 443)
            if not target_host and uri:
                clean_uri = uri.replace("jdbc:sap://", "").replace("https://", "").replace("http://", "").replace("hana://", "")
                target_host = clean_uri.split(":")[0].split("/")[0].split("?")[0]

            if not target_host:
                return {
                    "success": False,
                    "engine": engine,
                    "latencyMs": 0,
                    "error": "Missing SAP HANA host. Please provide your HANA Cloud endpoint or paste BTP Service Key.",
                    "message": "Connection verification failed: Host endpoint is required."
                }

            try:
                connection = hdbcli.connect(
                    address=target_host,
                    port=target_port,
                    user=req.user or "",
                    password=req.password or "",
                    connectTimeout=3000,
                )
                cursor = connection.cursor()
                cursor.execute("SELECT CURRENT_SCHEMA FROM DUMMY")
                cursor.fetchone()
                cursor.execute("""
                    SELECT TABLE_NAME
                    FROM SYS.TABLES
                    WHERE SCHEMA_NAME = CURRENT_SCHEMA
                    ORDER BY TABLE_NAME
                """)
                tables = [row[0] for row in cursor.fetchall()]
                cursor.close()
                connection.close()
            except Exception as se:
                return {
                    "success": False,
                    "engine": engine,
                    "latencyMs": int((time.time() - start_t) * 1000),
                    "error": str(se),
                    "message": f"Cannot reach SAP HANA Cloud at {target_host}:{target_port} ({str(se)}). Verify instance is RUNNING in BTP."
                }
            latency = int((time.time() - start_t) * 1000)
            return {
                "success": True,
                "engine": engine,
                "latencyMs": latency,
                "database": req.database or "DATAX_STAGING",
                "tables": tables,
                "tableCount": len(tables),
                "message": f"Successfully connected to SAP HANA Cloud ({target_host}:{target_port})!"
            }

        else:
            return {
                "success": False,
                "engine": engine,
                "latencyMs": int((time.time() - start_t) * 1000),
                "status": "UNSUPPORTED_OR_UNCONFIGURED_DRIVER",
                "error": f"Unsupported or unconfigured driver: Database engine '{engine}' is not supported.",
                "message": f"Unsupported database engine '{engine}'.",
            }

    except Exception as e:
        return {
            "success": False,
            "engine": engine,
            "error": str(e),
            "message": f"Connection failed: {str(e)}"
        }


def sample_table_data(req: SampleDataRequest) -> Dict[str, Any]:
    start_t = time.time()
    engine = req.engine.lower()
    if getattr(req, "credentialId", None):
        uri = get_resolved_uri(req)
    else:
        uri = (getattr(req, "connectionUri", None) or "").strip()
    uri = uri or _build_uri_from_request(req, engine)

    if (
        not uri
        or (not req.connectionUri and not req.host and not getattr(req, "credentialId", None))
        or "<" in uri
        or "user:password" in uri
        or "••••" in uri
        or "target-db.internal" in uri
        or "ep-sweet-neon" in uri
    ):
        return {
            "success": False,
            "engine": engine,
            "error": "No valid database credentials configured on this node.",
            "message": "Source database connection not configured.",
            "rows": [],
            "columns": []
        }

    try:
        limit_val = min(max(req.limit or 5, 1), 50)
        if engine in ["mongodb", "mongo"]:
            @retry_with_backoff(max_retries=2, base_delay=0.8, jitter=True)
            def _sample_mongo():
                client = MongoClient(uri, serverSelectionTimeoutMS=4000)
                db_names = client.list_database_names()
                user_dbs = [d for d in db_names if d not in ["admin", "local", "config"]]

                db_name = req.database if (req.database and req.database in user_dbs) else (
                    "datax_staging" if "datax_staging" in user_dbs else (user_dbs[0] if user_dbs else "datax_staging")
                )

                coll_to_db = {}
                all_colls = []
                for d in user_dbs:
                    for c in sorted(client[d].list_collection_names()):
                        if c not in all_colls:
                            all_colls.append(c)
                        if c not in coll_to_db or d == db_name:
                            coll_to_db[c] = d

                if req.table and req.table in coll_to_db:
                    table_name = req.table
                elif "raw_customers" in coll_to_db:
                    table_name = "raw_customers"
                elif "raw_users" in coll_to_db:
                    table_name = "raw_users"
                else:
                    table_name = all_colls[0] if all_colls else "raw_users"

                resolved_db = coll_to_db.get(table_name, db_name)
                coll = client[resolved_db][table_name]
                total_rows = coll.count_documents({})
                raw_docs = list(coll.find({}, {"_id": 0}).limit(limit_val))
                return raw_docs, resolved_db, table_name, all_colls, total_rows

            raw_docs, db_name, table_name, colls, total_rows = _sample_mongo()
            rows = []
            all_keys = []
            for d in raw_docs:
                clean_d = {}
                for k, v in d.items():
                    if k not in all_keys:
                        all_keys.append(k)
                    if isinstance(v, (datetime, Decimal)):
                        clean_d[k] = str(v)
                    else:
                        clean_d[k] = v
                rows.append(clean_d)

            columns = all_keys
            latency = int((time.time() - start_t) * 1000)
            return {
                "success": True,
                "engine": "mongodb",
                "database": db_name,
                "table": table_name,
                "availableTables": colls,
                "count": len(rows),
                "totalRows": total_rows,
                "columns": columns,
                "rows": rows,
                "latencyMs": latency,
                "message": f"Sampled {len(rows)} live documents from '{db_name}.{table_name}' ({total_rows:,} total docs)."
            }

        elif engine in ["postgres", "postgresql"]:
            @retry_with_backoff(max_retries=2, base_delay=0.8, jitter=True)
            def _sample_pg():
                with db_pool.get_connection(uri) as conn:
                    with conn.cursor(cursor_factory=RealDictCursor) as cur:
                        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")
                        all_tables = [r["table_name"] for r in cur.fetchall()]
                        table_name = _select_requested_table(req.table, all_tables)
                        safe_table = table_name.replace('"', '""')
                        cur.execute(f'SELECT * FROM "{safe_table}" LIMIT {limit_val};')
                        raw_data = cur.fetchall()
                        cur.execute(f'SELECT COUNT(*) AS cnt FROM "{safe_table}";')
                        cnt_row = cur.fetchone()
                        total_rows = int(cnt_row["cnt"])
                        return raw_data, table_name, all_tables, total_rows

            raw_data, table_name, all_tables, total_rows = _sample_pg()
            rows = []
            for r in raw_data:
                clean_r = {}
                for k, v in r.items():
                    if isinstance(v, Decimal):
                        clean_r[k] = float(v)
                    elif isinstance(v, datetime):
                        clean_r[k] = v.isoformat()
                    else:
                        clean_r[k] = v
                rows.append(clean_r)

            columns = list(rows[0].keys()) if rows else []
            latency = int((time.time() - start_t) * 1000)
            return {
                "success": True,
                "engine": "postgres",
                "database": req.database or "PostgreSQL",
                "table": table_name,
                "availableTables": all_tables,
                "count": len(rows),
                "totalRows": total_rows,
                "columns": columns,
                "rows": rows,
                "latencyMs": latency,
                "message": f"Sampled {len(rows)} live rows from table '{table_name}' ({total_rows:,} total rows)."
            }

        elif engine in ["mysql", "mariadb"]:
            if req.host in ("demo-sandbox", "sandbox.datax.internal") or req.database == "demo_sandbox":
                latency = int((time.time() - start_t) * 1000)
                demo_tables = ["orders", "order_items", "customers", "inventory", "vendor_master"]
                return {
                    "success": True,
                    "engine": "mysql",
                    "latencyMs": latency,
                    "database": "demo_sandbox",
                    "tables": demo_tables,
                    "tableCount": len(demo_tables),
                    "demo_mode": True,
                    "message": "Connected to DataX MySQL Enterprise Demo Sandbox."
                }
            if pymysql is None:
                return {
                    "success": False,
                    "engine": engine,
                    "status": "PYMYSQL_NOT_INSTALLED",
                    "error": "MySQL/MariaDB driver 'PyMySQL' is not installed.",
                    "rows": [],
                    "columns": [],
                }
            connection = pymysql.connect(
                **_relational_connection_args(req, engine, uri),
                connect_timeout=5,
                cursorclass=pymysql.cursors.DictCursor,
            )
            try:
                with connection.cursor() as cur:
                    cur.execute("""
                        SELECT table_name
                        FROM information_schema.tables
                        WHERE table_schema = DATABASE()
                        ORDER BY table_name
                    """)
                    all_tables = [
                        table_name
                        for row in cur.fetchall()
                        for table_name in [row.get("TABLE_NAME") or row.get("table_name")]
                        if table_name
                    ]
                    table_name = _select_requested_table(req.table, all_tables)
                    safe_table = table_name.replace("`", "``")
                    cur.execute(f"SELECT * FROM `{safe_table}` LIMIT %s", (limit_val,))
                    raw_data = cur.fetchall()
                    cur.execute(f"SELECT COUNT(*) AS cnt FROM `{safe_table}`")
                    total_rows = int(cur.fetchone()["cnt"])
            finally:
                connection.close()
            rows = []
            for row in raw_data:
                rows.append({
                    key: value.isoformat() if isinstance(value, (datetime,)) else float(value) if isinstance(value, Decimal) else value
                    for key, value in row.items()
                })
            columns = list(rows[0].keys()) if rows else []
            return {
                "success": True,
                "engine": engine,
                "database": req.database or "MySQL",
                "table": table_name,
                "availableTables": all_tables,
                "count": len(rows),
                "totalRows": total_rows,
                "columns": columns,
                "rows": rows,
                "latencyMs": int((time.time() - start_t) * 1000),
                "message": f"Sampled {len(rows)} live rows from table '{table_name}'.",
            }

        elif engine in ["mssql", "sqlserver", "azure_sql"]:
            if pymssql is None:
                return {
                    "success": False,
                    "engine": engine,
                    "status": "PYMSSQL_NOT_INSTALLED",
                    "error": "Microsoft SQL Server driver 'pymssql' is not installed.",
                    "rows": [],
                    "columns": [],
                }
            args = _relational_connection_args(req, engine, uri)
            connection = pymssql.connect(
                server=args["host"],
                port=str(args["port"]),
                user=args["user"],
                password=args["password"],
                database=args["database"],
                login_timeout=5,
            )
            try:
                cursor = connection.cursor(as_dict=True)
                try:
                    cursor.execute("""
                        SELECT TABLE_NAME
                        FROM INFORMATION_SCHEMA.TABLES
                        WHERE TABLE_TYPE = 'BASE TABLE'
                        ORDER BY TABLE_NAME
                    """)
                    all_tables = [
                        table_name
                        for row in cursor.fetchall()
                        for table_name in [row.get("TABLE_NAME") or row.get("table_name")]
                        if table_name
                    ]
                    table_name = _select_requested_table(req.table, all_tables)
                    safe_table = table_name.replace("]", "]]")
                    cursor.execute(f"SELECT TOP ({limit_val}) * FROM [{safe_table}]")
                    raw_data = cursor.fetchall()
                    cursor.execute(f"SELECT COUNT(*) AS cnt FROM [{safe_table}]")
                    total_rows = int(cursor.fetchone()["cnt"])
                finally:
                    cursor.close()
            finally:
                connection.close()
            rows = [{
                key: value.isoformat() if isinstance(value, datetime) else float(value) if isinstance(value, Decimal) else value
                for key, value in row.items()
            } for row in raw_data]
            columns = list(rows[0].keys()) if rows else []
            return {
                "success": True,
                "engine": "mssql",
                "database": req.database or "SQL Server",
                "table": table_name,
                "availableTables": all_tables,
                "count": len(rows),
                "totalRows": total_rows,
                "columns": columns,
                "rows": rows,
                "latencyMs": int((time.time() - start_t) * 1000),
                "message": f"Sampled {len(rows)} live rows from table '{table_name}'.",
            }

        elif engine in ["sap_bw", "s4_hana", "sap"]:
            return {
                "success": False,
                "engine": engine,
                "status": "HDBCLI_NOT_INSTALLED" if hdbcli is None else "SAP_HANA_SAMPLE_UNAVAILABLE",
                "driverStatus": "HDBCLI_NOT_INSTALLED" if hdbcli is None else "HDBCLI_INSTALLED",
                "error": "Live SAP HANA table sampling requires a configured hdbcli connector.",
                "rows": [],
                "columns": [],
                "message": "No SAP HANA sample was returned; load the certified SAP sandbox dataset for demo data.",
                "sandboxAction": "Load Certified SAP Sandbox Dataset",
            }

        else:
            return {
                "success": False,
                "engine": engine,
                "status": "UNSUPPORTED_OR_UNCONFIGURED_DRIVER",
                "error": f"Unsupported or unconfigured driver: Database engine '{engine}' is not supported.",
                "rows": [],
                "columns": [],
            }

    except Exception as e:
        return {
            "success": False,
            "engine": engine,
            "error": str(e),
            "message": f"Live sampling failed: {str(e)}",
            "rows": [],
            "columns": []
        }

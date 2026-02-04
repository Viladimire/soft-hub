import os
import sys
from pathlib import Path

try:
    import psycopg2  # type: ignore
except Exception as exc:  # pragma: no cover
    raise SystemExit(
        "Missing dependency 'psycopg2-binary'. Install it with: pip install psycopg2-binary"
    ) from exc


def split_sql_statements(sql: str):
    statements = []
    buf = []

    in_single = False
    in_double = False
    in_line_comment = False
    in_block_comment = False

    in_dollar = False
    dollar_tag = None

    i = 0
    n = len(sql)
    while i < n:
        ch = sql[i]
        nxt = sql[i + 1] if i + 1 < n else ""

        if in_line_comment:
            buf.append(ch)
            if ch == "\n":
                in_line_comment = False
            i += 1
            continue

        if in_block_comment:
            buf.append(ch)
            if ch == "*" and nxt == "/":
                buf.append(nxt)
                i += 2
                in_block_comment = False
                continue
            i += 1
            continue

        if not in_single and not in_double and not in_dollar:
            if ch == "-" and nxt == "-":
                buf.append(ch)
                buf.append(nxt)
                i += 2
                in_line_comment = True
                continue
            if ch == "/" and nxt == "*":
                buf.append(ch)
                buf.append(nxt)
                i += 2
                in_block_comment = True
                continue

        if not in_double and not in_dollar and ch == "'":
            buf.append(ch)
            if in_single:
                if nxt == "'":
                    buf.append(nxt)
                    i += 2
                    continue
                in_single = False
                i += 1
                continue
            in_single = True
            i += 1
            continue

        if not in_single and not in_dollar and ch == '"':
            buf.append(ch)
            in_double = not in_double
            i += 1
            continue

        if not in_single and not in_double:
            if ch == "$":
                j = i + 1
                while j < n and (sql[j].isalnum() or sql[j] == "_"):
                    j += 1
                if j < n and sql[j] == "$":
                    tag = sql[i : j + 1]
                    buf.append(tag)
                    if in_dollar and dollar_tag == tag:
                        in_dollar = False
                        dollar_tag = None
                    elif not in_dollar:
                        in_dollar = True
                        dollar_tag = tag
                    i = j + 1
                    continue

        if not in_single and not in_double and not in_dollar and ch == ";":
            statement = "".join(buf).strip()
            if statement:
                statements.append(statement)
            buf = []
            i += 1
            continue

        buf.append(ch)
        i += 1

    tail = "".join(buf).strip()
    if tail:
        statements.append(tail)

    return statements


def main():
    repo_root = Path(__file__).resolve().parents[1]
    migration_path = repo_root / "supabase" / "migrations" / "005_admin_config.sql"

    database_url = os.environ.get("DATABASE_URL")
    supabase_parts = {}
    if not database_url:
        env_local = repo_root / ".env.local"
        if env_local.exists():
            for raw_line in env_local.read_text(encoding="utf-8").splitlines():
                line = raw_line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" not in line:
                    continue
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")

                if key == "DATABASE_URL":
                    database_url = value
                    break

                if key.startswith("SUPABASE_DB_"):
                    supabase_parts[key] = value

    if not database_url and supabase_parts:
        host = supabase_parts.get("SUPABASE_DB_HOST")
        port = supabase_parts.get("SUPABASE_DB_PORT", "5432")
        user = supabase_parts.get("SUPABASE_DB_USER")
        name = supabase_parts.get("SUPABASE_DB_NAME", "postgres")
        password = supabase_parts.get("SUPABASE_DB_PASSWORD")

        if host and user and password:
            database_url = f"postgresql://{user}:{password}@{host}:{port}/{name}?sslmode=require"

    if not database_url:
        raise SystemExit(
            "DATABASE_URL is not set. Add it to .env.local or set it in the environment before running this script."
        )

    if not migration_path.exists():
        raise SystemExit(f"Migration file not found: {migration_path}")

    sql = migration_path.read_text(encoding="utf-8")
    statements = split_sql_statements(sql)

    conn = psycopg2.connect(database_url)
    conn.autocommit = True

    try:
        with conn.cursor() as cur:
            for idx, stmt in enumerate(statements, start=1):
                cur.execute(stmt)
                print(f"OK {idx}/{len(statements)}")
    finally:
        conn.close()

    print("Done. 005_admin_config.sql applied.")


if __name__ == "__main__":
    main()

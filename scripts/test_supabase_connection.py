#!/usr/bin/env python3
"""Quick Supabase connectivity checker.

This script verifies that the Supabase REST endpoint is reachable and that the
provided API key grants access to the `software` table. It can read credentials
from the current environment or from a `.env`-style file (default: `.env.local`).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Dict, Optional

import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

REQUIRED_ENV_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]
DEFAULT_ENV_FILE = Path(".env.local")


def parse_env_file(path: Path) -> Dict[str, str]:
    if not path.exists():
        raise FileNotFoundError(f"Environment file not found: {path}")

    env: Dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        env[key.strip()] = value.strip().strip("'\"")
    return env


def resolve_credentials(env_file: Optional[Path]) -> Dict[str, str]:
    env: Dict[str, str] = {}

    missing = [key for key in REQUIRED_ENV_KEYS if not os.environ.get(key)]
    if not missing:
        return {key: os.environ[key] for key in REQUIRED_ENV_KEYS}

    if env_file is None:
        raise RuntimeError(
            "Missing required Supabase environment variables and no env file provided."
        )

    env.update(parse_env_file(env_file))

    missing = [key for key in REQUIRED_ENV_KEYS if key not in env or not env[key]]
    if missing:
        raise RuntimeError(
            "Environment file does not contain the required keys: " + ", ".join(missing)
        )

    return {key: env[key] for key in REQUIRED_ENV_KEYS}


def fetch_sample_row(url: str, api_key: str) -> Dict[str, object]:
    query = urlencode({"select": "id,name,slug", "limit": 1})
    endpoint = f"{url.rstrip('/')}/rest/v1/software?{query}"
    request = Request(endpoint, headers={
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
    })

    with urlopen(request, timeout=10) as response:
        payload = response.read().decode("utf-8")

    data = json.loads(payload)
    if not isinstance(data, list):
        raise ValueError("Unexpected response format from Supabase REST API")
    return {"count": len(data), "sample": data[0] if data else None}


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Check Supabase connectivity from Python.")
    parser.add_argument(
        "--env-file",
        type=Path,
        default=DEFAULT_ENV_FILE,
        help="Path to a .env-style file containing Supabase credentials (default: .env.local)",
    )
    args = parser.parse_args(argv)

    try:
        creds = resolve_credentials(args.env_file)
    except Exception as error:  # noqa: BLE001
        print(f"❌ Failed to resolve Supabase credentials: {error}", file=sys.stderr)
        return 1

    url = creds["NEXT_PUBLIC_SUPABASE_URL"].strip()
    api_key = creds["NEXT_PUBLIC_SUPABASE_ANON_KEY"].strip()

    if not url or not api_key:
        print("❌ Supabase URL or API key is empty.", file=sys.stderr)
        return 1

    print("🔍 Testing Supabase REST access...")
    try:
        result = fetch_sample_row(url, api_key)
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="ignore")
        print("❌ HTTP error while querying Supabase:", detail or str(error), file=sys.stderr)
        return 1
    except URLError as error:
        print(f"❌ Network error while contacting Supabase: {error}", file=sys.stderr)
        return 1
    except json.JSONDecodeError as error:
        print(f"❌ Failed to parse Supabase response: {error}", file=sys.stderr)
        return 1
    except Exception as error:  # noqa: BLE001
        print(f"❌ Unexpected error: {error}", file=sys.stderr)
        return 1

    print("✅ Supabase connection succeeded.")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())

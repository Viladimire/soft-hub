#!/usr/bin/env python3
"""List Vercel projects accessible by the provided token."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

API_BASE = "https://api.vercel.com"


def load_env_file(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}

    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        values[key.strip()] = value.strip().strip('"\'')
    return values


def load_vercel_token_from_local_admin_config() -> str | None:
    config_path = os.environ.get("LOCAL_ADMIN_CONFIG_PATH")
    path = Path(config_path) if config_path else Path(".local") / "soft-hub-admin-config.json"
    if not path.exists():
        return None

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None

    if not isinstance(payload, dict):
        return None

    vercel = payload.get("vercel")
    if not isinstance(vercel, dict):
        return None

    token = vercel.get("token")
    return token if isinstance(token, str) and token.strip() else None


def main() -> int:
    token = os.environ.get("VERCEL_TOKEN")
    if not token:
        token = load_env_file(Path(".env.local")).get("VERCEL_TOKEN")
    if not token:
        token = load_vercel_token_from_local_admin_config()
    if not token:
        print("VERCEL_TOKEN env variable is required", file=sys.stderr)
        return 1

    url = f"{API_BASE}/v9/projects?limit=100"
    request = Request(url, headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    })

    try:
        with urlopen(request, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="ignore")
        print(f"HTTP error: {detail or error}", file=sys.stderr)
        return 1
    except URLError as error:
        print(f"Network error: {error}", file=sys.stderr)
        return 1

    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

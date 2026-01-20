#!/usr/bin/env python3
"""Synchronize Supabase credentials to a Vercel project via REST API.

Usage example:
    python scripts/configure_vercel_env.py --project soft-hub --env-file .env.local \
        --token $VERCEL_TOKEN --target production

The script reads Supabase keys from the provided env file (default `.env.local`)
then upserts them as plain environment variables on the specified Vercel project.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Dict, Iterable, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API_BASE = "https://api.vercel.com"
REQUIRED_SUPABASE_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]
OPTIONAL_SUPABASE_KEYS = ["SUPABASE_SERVICE_ROLE_KEY"]
DEFAULT_ENV_FILE = Path(".env.local")
DEFAULT_TARGETS = ["production"]


def load_env_file(path: Path) -> Dict[str, str]:
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
        env[key.strip()] = value.strip().strip('"\'')
    return env


def resolve_supabase_values(env_file: Path) -> Dict[str, str]:
    env_file_values = load_env_file(env_file)

    values: Dict[str, str] = {}
    missing: list[str] = []

    for key in REQUIRED_SUPABASE_KEYS:
        value = env_file_values.get(key) or os.environ.get(key)
        if value:
            values[key] = value
        else:
            missing.append(key)

    if missing:
        raise RuntimeError(
            "Missing required Supabase keys: " + ", ".join(missing)
        )

    for key in OPTIONAL_SUPABASE_KEYS:
        value = env_file_values.get(key) or os.environ.get(key)
        if value:
            values[key] = value

    return values


def build_url(path: str, params: Optional[Dict[str, str]] = None) -> str:
    url = f"{API_BASE}{path}"
    if params:
        query = urlencode(params)
        url = f"{url}?{query}"
    return url


def vercel_request(
    method: str,
    path: str,
    token: str,
    *,
    params: Optional[Dict[str, str]] = None,
    payload: Optional[Dict[str, object]] = None,
) -> Dict[str, object]:
    url = build_url(path, params)
    data = json.dumps(payload).encode("utf-8") if payload is not None else None

    request = Request(url, data=data, method=method.upper())
    request.add_header("Authorization", f"Bearer {token}")
    request.add_header("Accept", "application/json")
    if data is not None:
        request.add_header("Content-Type", "application/json")

    with urlopen(request, timeout=15) as response:
        body = response.read()
        if not body:
            return {}
        return json.loads(body.decode("utf-8"))


def list_environment_variables(
    project: str,
    token: str,
    *,
    team_id: Optional[str],
) -> Iterable[Dict[str, object]]:
    params: Dict[str, str] = {"decrypt": "true"}
    if team_id:
        params["teamId"] = team_id
    result = vercel_request("GET", f"/v9/projects/{project}/env", token, params=params)
    return result.get("envs", [])


def delete_environment_variable(
    project: str,
    env_id: str,
    token: str,
    *,
    team_id: Optional[str],
) -> None:
    params: Dict[str, str] = {}
    if team_id:
        params["teamId"] = team_id
    vercel_request("DELETE", f"/v9/projects/{project}/env/{env_id}", token, params=params)


def create_environment_variable(
    project: str,
    key: str,
    value: str,
    targets: Iterable[str],
    token: str,
    *,
    team_id: Optional[str],
) -> None:
    params: Dict[str, str] = {}
    if team_id:
        params["teamId"] = team_id
    payload = {
        "key": key,
        "value": value,
        "target": list(targets),
        "type": "plain",
    }
    vercel_request("POST", f"/v9/projects/{project}/env", token, params=params, payload=payload)


def sync_environment_variable(
    project: str,
    key: str,
    value: str,
    targets: Iterable[str],
    token: str,
    *,
    team_id: Optional[str],
) -> None:
    existing_envs = list_environment_variables(project, token, team_id=team_id)
    targets_set = set(targets)

    for env in existing_envs:
        if env.get("key") != key:
            continue
        env_targets = set(env.get("target", []))
        if env_targets & targets_set:
            env_id = env.get("id")
            if env_id:
                print(f"- Removing existing Vercel env '{key}' ({','.join(env_targets)})")
                delete_environment_variable(project, env_id, token, team_id=team_id)

    print(f"+ Setting {key} for targets: {', '.join(targets_set)}")
    create_environment_variable(project, key, value, targets_set, token, team_id=team_id)


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Sync Supabase env vars to Vercel")
    parser.add_argument("--project", required=True, help="Vercel project name or ID")
    parser.add_argument("--token", help="Vercel access token (defaults to VERCEL_TOKEN env)")
    parser.add_argument("--env-file", type=Path, default=DEFAULT_ENV_FILE)
    parser.add_argument(
        "--target",
        action="append",
        dest="targets",
        help="Deployment target to update (can be provided multiple times). Defaults to production",
    )
    parser.add_argument("--team-id", help="Optional Vercel team ID")

    args = parser.parse_args(argv)

    token = args.token or os.environ.get("VERCEL_TOKEN")
    if not token:
        print("❌ Missing Vercel token. Provide --token or set VERCEL_TOKEN.", file=sys.stderr)
        return 1

    targets = args.targets or DEFAULT_TARGETS

    try:
        supabase_values = resolve_supabase_values(args.env_file)
    except Exception as error:  # noqa: BLE001
        print(f"❌ Failed to load Supabase credentials: {error}", file=sys.stderr)
        return 1

    print(f"🔧 Syncing environment variables to Vercel project '{args.project}'")
    if args.team_id:
        print(f"   Team ID: {args.team_id}")
    print(f"   Targets: {', '.join(targets)}")

    for key in REQUIRED_SUPABASE_KEYS + OPTIONAL_SUPABASE_KEYS:
        value = supabase_values.get(key)
        if value is None:
            continue
        try:
            sync_environment_variable(
                args.project,
                key,
                value,
                targets,
                token,
                team_id=args.team_id,
            )
        except (HTTPError, URLError) as error:
            if isinstance(error, HTTPError):
                detail = error.read().decode("utf-8", errors="ignore")
            else:
                detail = str(error)
            print(f"❌ Failed to set {key}: {detail}", file=sys.stderr)
            return 1
        except Exception as error:  # noqa: BLE001
            print(f"❌ Unexpected error while setting {key}: {error}", file=sys.stderr)
            return 1

    print("✅ Environment variables synchronized successfully.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

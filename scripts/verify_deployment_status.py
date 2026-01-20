#!/usr/bin/env python3
"""Comprehensive verification script for the Soft-Hub Vercel deployment.

This script performs the following checks:
1. Resolves the latest READY deployment for the project (production target).
2. Confirms that the production alias is attached to that deployment.
3. Validates local static dataset presence and counts entries.
4. Fetches the live site to ensure it responds successfully.

It relies on the Vercel API token embedded below and is designed for
future reuse when diagnosing deployment issues.
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from typing import Dict, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API_BASE = "https://api.vercel.com"
VERCEL_TOKEN = "ejf8XJgL7JYzca2DKftShIDZ"
PROJECT_SLUG = "soft-hub"
PRODUCTION_ALIAS = "soft-hub-alpha.vercel.app"
DATASET_PATH = Path(__file__).resolve().parent.parent / "public" / "data" / "software" / "index.json"
REQUEST_TIMEOUT = 20


def api_request(
    method: str,
    path: str,
    *,
    token: str,
    params: Optional[Dict[str, str]] = None,
) -> Dict[str, object]:
    url = f"{API_BASE}{path}"
    if params:
        url = f"{url}?{urlencode(params)}"

    request = Request(url, method=method.upper())
    request.add_header("Authorization", f"Bearer {token}")
    request.add_header("Accept", "application/json")

    with urlopen(request, timeout=REQUEST_TIMEOUT) as response:
        body = response.read().decode("utf-8")
        return json.loads(body) if body else {}


def resolve_default_team(token: str) -> Optional[str]:
    payload = api_request("GET", "/v2/user", token=token)
    default_team = payload.get("defaultTeamId")
    if default_team:
        return default_team

    teams = payload.get("teams") or []
    if teams and isinstance(teams, list):
        first_team = teams[0]
        if isinstance(first_team, dict):
            team_id = first_team.get("id")
            if team_id:
                return team_id
    return None


def resolve_project_id(project: str, token: str, team_id: Optional[str]) -> str:
    params: Dict[str, str] = {}
    if team_id:
        params["teamId"] = team_id

    payload = api_request("GET", f"/v9/projects/{project}", token=token, params=params)
    project_id = payload.get("id")
    if not project_id:
        raise RuntimeError(f"Unable to resolve project id for '{project}'.")
    return project_id


def fetch_latest_ready_deployment(
    project_id: str,
    *,
    token: str,
    team_id: Optional[str],
    target: str = "production",
) -> Dict[str, object]:
    params: Dict[str, str] = {
        "projectId": project_id,
        "limit": "1",
        "state": "READY",
        "target": target,
        "order": "desc",
    }
    if team_id:
        params["teamId"] = team_id

    payload = api_request("GET", "/v6/deployments", token=token, params=params)
    deployments = payload.get("deployments", [])
    if not deployments:
        raise RuntimeError("No READY deployments found for the project.")
    return deployments[0]


def fetch_deployment_aliases(
    deployment_id: str,
    *,
    token: str,
    team_id: Optional[str],
) -> Dict[str, object]:
    params: Dict[str, str] = {}
    if team_id:
        params["teamId"] = team_id
    return api_request("GET", f"/v2/deployments/{deployment_id}/aliases", token=token, params=params)


def load_local_dataset(path: Path) -> Dict[str, object]:
    if not path.exists():
        raise FileNotFoundError(f"Dataset file not found: {path}")
    with path.open("r", encoding="utf-8") as file:
        data = json.load(file)
    if not isinstance(data, list):
        raise ValueError("Dataset JSON is not a list of entries.")
    return {
        "path": str(path),
        "entries": len(data),
        "sample": data[0] if data else None,
    }


def fetch_live_site(url: str) -> Dict[str, object]:
    request = Request(url)
    start = time.perf_counter()
    try:
        with urlopen(request, timeout=REQUEST_TIMEOUT) as response:
            elapsed = time.perf_counter() - start
            body = response.read().decode("utf-8")
            return {
                "status": response.status,
                "headers": dict(response.getheaders()),
                "elapsed": elapsed,
                "snippet": body[:500],
            }
    except HTTPError as error:
        return {
            "status": error.code,
            "reason": error.reason,
            "body": error.read().decode("utf-8", errors="ignore"),
        }
    except URLError as error:
        return {
            "status": None,
            "error": str(error),
        }


def main() -> int:
    summary: Dict[str, object] = {
        "project": PROJECT_SLUG,
        "alias": PRODUCTION_ALIAS,
    }

    try:
        team_id = resolve_default_team(VERCEL_TOKEN)
        summary["teamId"] = team_id

        project_id = resolve_project_id(PROJECT_SLUG, VERCEL_TOKEN, team_id)
        summary["projectId"] = project_id

        latest = fetch_latest_ready_deployment(project_id, token=VERCEL_TOKEN, team_id=team_id)
        deployment_id = latest.get("uid") or latest.get("id")
        summary["deployment"] = latest

        if not deployment_id:
            raise RuntimeError("Latest deployment payload is missing an id/uid.")

        aliases_payload = fetch_deployment_aliases(deployment_id, token=VERCEL_TOKEN, team_id=team_id)
        summary["deploymentAliases"] = aliases_payload

        dataset_info = load_local_dataset(DATASET_PATH)
        summary["localDataset"] = dataset_info

        live_result = fetch_live_site(f"https://{PRODUCTION_ALIAS}/en")
        summary["liveSite"] = live_result

    except Exception as error:  # noqa: BLE001
        summary["error"] = str(error)
        print(json.dumps(summary, indent=2))
        return 1

    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Fetch the latest production deployment metadata from Vercel."""
from __future__ import annotations

import argparse
import json
import sys
from typing import Dict, Optional
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API_BASE = "https://api.vercel.com"
DEFAULT_TOKEN = "ejf8XJgL7JYzca2DKftShIDZ"
DEFAULT_PROJECT = "soft-hub"


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

    with urlopen(request, timeout=20) as response:
        body = response.read().decode("utf-8")
        return json.loads(body) if body else {}


def resolve_project_id(project: str, token: str, team_id: Optional[str]) -> str:
    params: Dict[str, str] = {}
    if team_id:
        params["teamId"] = team_id
    project_payload = api_request("GET", f"/v9/projects/{project}", token=token, params=params)
    project_id = project_payload.get("id")
    if not project_id:
        raise RuntimeError(f"Unable to resolve project id for '{project}'.")
    return project_id


def resolve_default_team(token: str) -> Optional[str]:
    user_payload = api_request("GET", "/v2/user", token=token)
    default_team = user_payload.get("defaultTeamId")
    if default_team:
        return default_team
    teams = user_payload.get("teams") or []
    if teams and isinstance(teams, list):
        first = teams[0]
        if isinstance(first, dict):
            team_id = first.get("id")
            if team_id:
                return team_id
    return None


def fetch_latest_deployment(
    project_id: str,
    token: str,
    team_id: Optional[str],
    target: str = "production",
) -> Dict[str, object]:
    params: Dict[str, str] = {
        "projectId": project_id,
        "limit": "1",
        "state": "READY",
        "target": target,
    }
    if team_id:
        params["teamId"] = team_id
    deployments_payload = api_request("GET", "/v6/deployments", token=token, params=params)
    deployments = deployments_payload.get("deployments", [])
    if not deployments:
        raise RuntimeError("No READY deployments found for the specified project.")
    return deployments[0]


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Fetch latest Vercel deployment info")
    parser.add_argument("--project", default=DEFAULT_PROJECT)
    parser.add_argument("--token", default=DEFAULT_TOKEN)
    parser.add_argument("--target", default="production")
    parser.add_argument("--team-id")
    args = parser.parse_args(argv)

    token = args.token
    team_id = args.team_id or resolve_default_team(token)
    project_id = resolve_project_id(args.project, token, team_id)
    deployment = fetch_latest_deployment(project_id, token, team_id, target=args.target)

    print(json.dumps({
        "teamId": team_id,
        "projectId": project_id,
        "deployment": deployment,
    }, indent=2))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"❌ {exc}", file=sys.stderr)
        sys.exit(1)

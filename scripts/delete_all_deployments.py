#!/usr/bin/env python3
"""Delete every deployment for the configured Vercel project."""
from __future__ import annotations

import json
import sys
from typing import Dict, Iterable, Optional
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API_BASE = "https://api.vercel.com"
VERCEL_TOKEN = "ejf8XJgL7JYzca2DKftShIDZ"
PROJECT_SLUG = "soft-hub"
BATCH_LIMIT = 50


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


def resolve_default_team(token: str) -> Optional[str]:
    payload = api_request("GET", "/v2/user", token=token)
    default_team = payload.get("defaultTeamId")
    if default_team:
        return default_team
    teams = payload.get("teams") or []
    if teams and isinstance(teams, list):
        first = teams[0]
        if isinstance(first, dict):
            team_id = first.get("id")
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


def list_deployments(
    project_id: str,
    *,
    token: str,
    team_id: Optional[str],
    limit: int = BATCH_LIMIT,
    until: Optional[str] = None,
) -> Iterable[Dict[str, object]]:
    params: Dict[str, str] = {
        "projectId": project_id,
        "limit": str(limit),
        "order": "desc",
    }
    if team_id:
        params["teamId"] = team_id
    if until:
        params["until"] = until

    payload = api_request("GET", "/v6/deployments", token=token, params=params)
    return payload.get("deployments", [])


def delete_deployment(
    deployment_id: str,
    *,
    token: str,
    team_id: Optional[str],
) -> None:
    params: Dict[str, str] = {}
    if team_id:
        params["teamId"] = team_id
    try:
        api_request("DELETE", f"/v13/deployments/{deployment_id}", token=token, params=params)
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Failed to delete deployment {deployment_id}: {detail}") from error


def main() -> int:
    summary = {
        "deleted": 0,
        "failures": [],
    }
    try:
        team_id = resolve_default_team(VERCEL_TOKEN)
        project_id = resolve_project_id(PROJECT_SLUG, VERCEL_TOKEN, team_id)

        cursor: Optional[str] = None
        while True:
            deployments = list(list_deployments(project_id, token=VERCEL_TOKEN, team_id=team_id, until=cursor))
            if not deployments:
                break

            for deployment in deployments:
                deployment_id = deployment.get("uid") or deployment.get("id")
                if not deployment_id:
                    continue
                try:
                    delete_deployment(deployment_id, token=VERCEL_TOKEN, team_id=team_id)
                    summary["deleted"] += 1
                except Exception as error:  # noqa: BLE001
                    summary["failures"].append({
                        "deploymentId": deployment_id,
                        "error": str(error),
                    })
            # prepare cursor for next page (oldest timestamp)
            oldest = deployments[-1]
            cursor = str(oldest.get("created")) if oldest.get("created") else None
            if not cursor:
                break

    except Exception as error:  # noqa: BLE001
        summary["error"] = str(error)
        print(json.dumps(summary, indent=2))
        return 1

    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

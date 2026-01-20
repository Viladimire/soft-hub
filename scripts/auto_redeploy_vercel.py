#!/usr/bin/env python3
"""Trigger a Vercel redeploy using a fixed API token.

This script resolves the default team automatically, finds the latest READY
production deployment for the target project, and invokes the redeploy
endpoint. It is tailored for the soft-hub project.
"""
from __future__ import annotations

import json
import sys
from typing import Dict, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API_BASE = "https://api.vercel.com"
DEFAULT_TOKEN = "ejf8XJgL7JYzca2DKftShIDZ"
DEFAULT_PROJECT_SLUG = "soft-hub"
DEFAULT_TARGET = "production"


def api_request(
    method: str,
    path: str,
    *,
    token: str,
    params: Optional[Dict[str, str]] = None,
    payload: Optional[Dict[str, object]] = None,
) -> Dict[str, object]:
    url = f"{API_BASE}{path}"
    if params:
        url = f"{url}?{urlencode(params)}"

    data = json.dumps(payload).encode("utf-8") if payload is not None else None

    request = Request(url, data=data, method=method.upper())
    request.add_header("Authorization", f"Bearer {token}")
    request.add_header("Accept", "application/json")
    if data is not None:
        request.add_header("Content-Type", "application/json")

    with urlopen(request, timeout=20) as response:
        body = response.read()
        if not body:
            return {}
        return json.loads(body.decode("utf-8"))


def resolve_default_team(token: str) -> Optional[str]:
    """Return the default team id for the token, if any."""
    user = api_request("GET", "/v2/user", token=token)
    default_team = user.get("defaultTeamId")
    if default_team:
        return default_team

    teams = user.get("teams") or []
    if teams:
        team = teams[0]
        if isinstance(team, dict):
            team_id = team.get("id")
            if team_id:
                return team_id
    return None


def resolve_project_id(project_slug: str, token: str, team_id: Optional[str]) -> str:
    params: Dict[str, str] = {}
    if team_id:
        params["teamId"] = team_id

    try:
        project = api_request("GET", f"/v9/projects/{project_slug}", token=token, params=params)
    except HTTPError as error:  # pragma: no cover - network error path
        detail = error.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Failed to fetch project '{project_slug}': {detail}") from error

    project_id = project.get("id")
    if not project_id:
        raise RuntimeError(f"Project response missing id: {project}")
    return project_id


def fetch_latest_deployment(
    project_id: str,
    *,
    token: str,
    team_id: Optional[str],
    target: str,
) -> Dict[str, object]:
    params: Dict[str, str] = {
        "limit": "1",
        "projectId": project_id,
        "state": "READY",
        "target": target,
    }
    if team_id:
        params["teamId"] = team_id

    result = api_request("GET", "/v6/deployments", token=token, params=params)
    deployments = result.get("deployments", [])
    if not deployments:
        raise RuntimeError("No READY deployments found for the specified project/target")
    return deployments[0]


def trigger_redeploy(
    deployment_id: str,
    *,
    deployment_name: str,
    project_id: str,
    target: str,
    token: str,
    team_id: Optional[str],
) -> Dict[str, object]:
    """Request Vercel to redeploy an existing deployment.

    The official redeploy flow is to POST to `/v13/deployments` supplying the
    original deployment id. This instructs Vercel to create a new deployment
    based on the stored snapshot, effectively performing a redeploy.
    """

    params: Dict[str, str] = {}
    if team_id:
        params["teamId"] = team_id

    payload = {
        "deploymentId": deployment_id,
        "name": deployment_name,
        "project": project_id,
        "target": target,
        "source": "cli",
    }

    try:
        return api_request(
            "POST",
            "/v13/deployments",
            token=token,
            params=params,
            payload=payload,
        )
    except HTTPError as error:  # pragma: no cover - network error path
        detail = error.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Redeploy request failed: {detail}") from error


def main() -> int:
    token = DEFAULT_TOKEN
    target = DEFAULT_TARGET

    try:
        team_id = resolve_default_team(token)
        if team_id:
            print(f"ℹ️ Using team id: {team_id}")
        else:
            print("ℹ️ No team id detected; operating in personal scope")

        project_id = resolve_project_id(DEFAULT_PROJECT_SLUG, token, team_id)
        print(f"ℹ️ Resolved project id: {project_id}")

        latest = fetch_latest_deployment(
            project_id,
            token=token,
            team_id=team_id,
            target=target,
        )
        deployment_id = latest.get("uid") or latest.get("id")
        deployment_url = latest.get("url")
        print("ℹ️ Latest READY deployment:")
        print(json.dumps(latest, indent=2))

        if not deployment_id:
            raise RuntimeError("Latest deployment payload missing id/uid")

        print(f"ℹ️ Triggering redeploy for deployment {deployment_id} ({deployment_url})")
        response = trigger_redeploy(
            deployment_id,
            deployment_name=latest.get("name", DEFAULT_PROJECT_SLUG),
            project_id=project_id,
            target=target,
            token=token,
            team_id=team_id,
        )

    except URLError as error:  # pragma: no cover - network error path
        print(f"❌ Network error: {error}", file=sys.stderr)
        return 1
    except Exception as error:  # noqa: BLE001
        print(f"❌ {error}", file=sys.stderr)
        return 1

    new_id = response.get("deploymentId") or response.get("id")
    new_url = response.get("url")
    print("✅ Redeploy request dispatched successfully")
    if new_id:
        print(f"   Deployment ID: {new_id}")
    if new_url:
        print(f"   Deployment URL: {new_url}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

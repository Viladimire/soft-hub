#!/usr/bin/env python3
"""Delete older Vercel deployments while preserving the most recent production one."""
from __future__ import annotations

import json
import sys
from typing import Dict, Iterable, Optional
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API_BASE = "https://api.vercel.com"
DEFAULT_TOKEN = "ejf8XJgL7JYzca2DKftShIDZ"
DEFAULT_PROJECT_SLUG = "soft-hub"
KEEP_COUNT = 1


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

    project = api_request("GET", f"/v9/projects/{project_slug}", token=token, params=params)
    project_id = project.get("id")
    if not project_id:
        raise RuntimeError(f"Project response missing id: {project}")
    return project_id


def list_deployments(
    project_id: str,
    *,
    token: str,
    team_id: Optional[str],
    limit: int = 50,
) -> Iterable[Dict[str, object]]:
    params: Dict[str, str] = {
        "projectId": project_id,
        "limit": str(limit),
        "state": "READY",
        "order": "desc",
    }
    if team_id:
        params["teamId"] = team_id
    result = api_request("GET", "/v6/deployments", token=token, params=params)
    return result.get("deployments", [])


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
    except HTTPError as error:  # pragma: no cover - network path
        detail = error.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Failed to delete deployment {deployment_id}: {detail}") from error


def main() -> int:
    token = DEFAULT_TOKEN
    project_slug = DEFAULT_PROJECT_SLUG

    team_id = resolve_default_team(token)
    if team_id:
        print(f"ℹ️ Using team id: {team_id}")
    else:
        print("ℹ️ No team id detected; operating in personal scope")

    project_id = resolve_project_id(project_slug, token, team_id)
    print(f"ℹ️ Resolved project id: {project_id}")

    deployments = list(list_deployments(project_id, token=token, team_id=team_id))
    if not deployments:
        print("⚠️ No deployments found; nothing to delete.")
        return 0

    print(f"ℹ️ Total READY deployments found: {len(deployments)}")

    keep = deployments[:KEEP_COUNT]
    keep_ids = {d.get("uid") or d.get("id") for d in keep}
    print("ℹ️ Keeping the most recent deployment(s):")
    for dep in keep:
        print(f"   - {dep.get('uid') or dep.get('id')} ({dep.get('url')})")

    deleted = 0
    for dep in deployments[KEEP_COUNT:]:
        dep_id = dep.get("uid") or dep.get("id")
        if not dep_id:
            continue
        print(f"🗑️  Deleting deployment {dep_id} ({dep.get('url')})")
        delete_deployment(dep_id, token=token, team_id=team_id)
        deleted += 1

    print(f"✅ Cleanup complete. Removed {deleted} deployment(s).")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"❌ {exc}", file=sys.stderr)
        sys.exit(1)

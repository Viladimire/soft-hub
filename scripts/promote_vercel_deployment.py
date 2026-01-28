#!/usr/bin/env python3
"""Promote a Vercel deployment to production by assigning the production alias.

This script promotes the latest READY deployment (or a specific deployment via
flag) by reassigning the production alias to it. It relies on the Vercel token
already provisioned for the workspace.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Dict, Optional
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API_BASE = "https://api.vercel.com"
DEFAULT_PROJECT_SLUG = "soft-hub"
PRODUCTION_ALIAS = "soft-hub-alpha.vercel.app"


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


def fetch_latest_ready_deployment(
    project_id: str,
    *,
    token: str,
    team_id: Optional[str],
    target: Optional[str] = "production",
) -> Dict[str, object]:
    params: Dict[str, str] = {
        "limit": "1",
        "projectId": project_id,
        "state": "READY",
    }
    if target:
        params["target"] = target
    if team_id:
        params["teamId"] = team_id

    result = api_request("GET", "/v6/deployments", token=token, params=params)
    deployments = result.get("deployments", [])
    if not deployments:
        raise RuntimeError("No READY deployments found to promote")
    return deployments[0]


def fetch_deployment(
    deployment_id: str,
    *,
    token: str,
    team_id: Optional[str],
) -> Dict[str, object]:
    params: Dict[str, str] = {}
    if team_id:
        params["teamId"] = team_id
    return api_request("GET", f"/v13/deployments/{deployment_id}", token=token, params=params)


def assign_alias(
    deployment_id: str,
    alias: str,
    *,
    token: str,
    team_id: Optional[str],
) -> Dict[str, object]:
    params: Dict[str, str] = {}
    if team_id:
        params["teamId"] = team_id

    payload = {"alias": alias}
    try:
        return api_request(
            "POST",
            f"/v2/deployments/{deployment_id}/aliases",
            token=token,
            params=params,
            payload=payload,
        )
    except HTTPError as error:  # pragma: no cover - network path
        detail = error.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Failed to assign alias: {detail}") from error


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Promote a Vercel deployment to production")
    parser.add_argument("--project", default=DEFAULT_PROJECT_SLUG, help="Vercel project slug")
    parser.add_argument("--deployment-id", help="Optional deployment id to promote")
    parser.add_argument("--alias", default=PRODUCTION_ALIAS, help="Alias/domain to assign")
    parser.add_argument("--token", help="Vercel access token (defaults to VERCEL_TOKEN env)")
    parser.add_argument("--team-id", help="Optional team id override")
    args = parser.parse_args(argv)

    token = args.token or os.environ.get("VERCEL_TOKEN")
    if not token:
        print("❌ Missing Vercel token. Provide --token or set VERCEL_TOKEN.", file=sys.stderr)
        return 1
    team_id = args.team_id or resolve_default_team(token)

    if team_id:
        print(f"ℹ️ Using team id: {team_id}")
    else:
        print("ℹ️ No team id detected; operating in personal scope")

    project_id = resolve_project_id(args.project, token, team_id)
    print(f"ℹ️ Resolved project id: {project_id}")

    if args.deployment_id:
        deployment = fetch_deployment(args.deployment_id, token=token, team_id=team_id)
    else:
        deployment = fetch_latest_ready_deployment(project_id, token=token, team_id=team_id)

    deployment_id = deployment.get("uid") or deployment.get("id")
    deployment_url = deployment.get("url")
    if not deployment_id:
        raise RuntimeError("Deployment payload missing id/uid")

    print("ℹ️ Deployment selected for promotion:")
    print(json.dumps(deployment, indent=2))

    print(f"ℹ️ Assigning alias {args.alias} to deployment {deployment_id} ({deployment_url})")
    assign_alias(deployment_id, args.alias, token=token, team_id=team_id)
    print("✅ Alias assignment completed. Production domain now points to the selected deployment.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

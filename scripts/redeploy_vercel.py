#!/usr/bin/env python3
"""Trigger a redeploy for the latest Vercel deployment of a project."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Dict, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API_BASE = "https://api.vercel.com"


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

    with urlopen(request, timeout=20) as response:
        raw = response.read()
        if not raw:
            return {}
        return json.loads(raw.decode("utf-8"))


def get_latest_deployment(
    project: str,
    token: str,
    *,
    target: str,
    team_id: Optional[str],
) -> Dict[str, object]:
    project_id = resolve_project_id(project, token, team_id=team_id)

    params: Dict[str, str] = {
        "limit": "1",
        "target": target,
        "state": "READY",
        "projectId": project_id,
    }
    if team_id:
        params["teamId"] = team_id

    result = vercel_request("GET", "/v6/deployments", token, params=params)
    deployments = result.get("deployments", [])
    if not deployments:
        raise RuntimeError(
            f"No deployments found for project '{project}' with target '{target}'."
        )
    return deployments[0]


def resolve_project_id(project: str, token: str, *, team_id: Optional[str]) -> str:
    """Return Vercel project ID from either a project id or a project name."""

    params: Dict[str, str] = {}
    if team_id:
        params["teamId"] = team_id

    try:
        result = vercel_request("GET", f"/v9/projects/{project}", token, params=params)
    except HTTPError as error:
        if error.code != 404:
            raise
        detail = error.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Project '{project}' not found. Details: {detail}") from error

    project_id = result.get("id")
    if not isinstance(project_id, str) or not project_id:
        raise RuntimeError(f"Unable to resolve project id for '{project}'.")

    return project_id


def trigger_redeploy(
    deployment_id: str,
    token: str,
    *,
    target: str,
    team_id: Optional[str],
) -> Dict[str, object]:
    params: Dict[str, str] = {}
    if team_id:
        params["teamId"] = team_id

    payload = {"source": "cascade-script"}

    # Vercel redeploy endpoint ignores the target parameter; including it causes
    # a "Not Found" response for some accounts. Omitting to rely on the original
    # deployment target.

    return vercel_request(
        "POST",
        f"/v13/deployments/{deployment_id}/redeploy",
        token,
        params=params,
        payload=payload,
    )


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Redeploy the latest Vercel deployment")
    parser.add_argument("--project", required=True, help="Vercel project name")
    parser.add_argument("--token", help="Vercel access token (defaults to VERCEL_TOKEN env)")
    parser.add_argument("--target", default="production", help="Deployment target (default: production)")
    parser.add_argument("--team-id", help="Optional Vercel team ID")
    parser.add_argument(
        "--deployment-id",
        help="Redeploy a specific deployment ID instead of fetching the latest",
    )

    args = parser.parse_args(argv)

    token = args.token or os.environ.get("VERCEL_TOKEN")
    if not token:
        print("❌ Missing Vercel token. Provide --token or set VERCEL_TOKEN.", file=sys.stderr)
        return 1

    try:
        deployment_id = args.deployment_id
        if not deployment_id:
            latest = get_latest_deployment(
                args.project,
                token,
                target=args.target,
                team_id=args.team_id,
            )
            deployment_id = latest.get("uid") or latest.get("id")
            if not deployment_id:
                raise RuntimeError("Latest deployment response missing ID")
            deployment_url = latest.get("url")
            print("ℹ️ Latest deployment metadata:", json.dumps(latest, indent=2), flush=True)
            print(f"ℹ️ Redeploying deployment: {deployment_id} ({deployment_url})", flush=True)
        else:
            print(f"ℹ️ Using provided deployment ID: {deployment_id}", flush=True)

        response = trigger_redeploy(
            deployment_id,
            token,
            target=args.target,
            team_id=args.team_id,
        )
    except (HTTPError, URLError) as error:
        if isinstance(error, HTTPError):
            detail = error.read().decode("utf-8", errors="ignore")
        else:
            detail = str(error)
        print(f"❌ Failed to trigger redeploy: {detail}", file=sys.stderr)
        return 1
    except Exception as error:  # noqa: BLE001
        print(f"❌ Unexpected error: {error}", file=sys.stderr)
        return 1

    new_id = response.get("deploymentId") or response.get("id")
    new_url = response.get("url")
    print("✅ Redeploy request sent successfully.")
    if new_id:
        print(f"   Deployment ID: {new_id}")
    if new_url:
        print(f"   Deployment URL: {new_url}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

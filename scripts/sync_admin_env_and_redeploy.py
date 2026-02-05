#!/usr/bin/env python3
"""Sync admin/runtime env vars to Vercel and trigger a redeploy.

Reads a JSON config file (soft-hub-admin-config.json) that contains:
- github.owner/repo/token/branch
- supabase.url/anonKey/serviceRoleKey
- vercel.token/projectId/teamId/deployHookUrl

Then upserts required Vercel environment variables and triggers a deploy hook.

Security:
- Never prints secret values.
- Prints only which keys were set and high-level status.

Usage:
  python scripts/sync_admin_env_and_redeploy.py --config-path "D:/Users/.../soft-hub-admin-config.json" \
    --admin-secret-env ADMIN_API_SECRET --site-url https://soft-hub-alpha.vercel.app --targets production preview

Notes:
- Requires Vercel token with permission to edit project env.
- After redeploy, new env vars will be available.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, Iterable, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

VERCEL_API_BASE = "https://api.vercel.com"


def read_json(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def get_nested_str(cfg: Dict[str, Any], *keys: str) -> Optional[str]:
    cur: Any = cfg
    for k in keys:
        if not isinstance(cur, dict) or k not in cur:
            return None
        cur = cur[k]

    if isinstance(cur, str) and cur.strip():
        return cur.strip()
    return None


def resolve_admin_secret(cfg: Dict[str, Any], env_key: str) -> Optional[str]:
    # Preferred: process env
    from_env = os.environ.get(env_key)
    if isinstance(from_env, str) and from_env.strip():
        return from_env.strip()

    # Optional: config file keys (kept out of repo, e.g. Downloads)
    candidates = [
        get_nested_str(cfg, "admin", "apiSecret"),
        get_nested_str(cfg, "admin", "secret"),
        get_nested_str(cfg, "adminApiSecret"),
    ]
    for value in candidates:
        if value:
            return value

    return None


def vercel_request(
    method: str,
    path: str,
    *,
    token: str,
    params: Optional[Dict[str, str]] = None,
    payload: Optional[Dict[str, Any]] = None,
    timeout: int = 20,
) -> Dict[str, Any]:
    url = f"{VERCEL_API_BASE}{path}"
    if params:
        url = f"{url}?{urlencode(params)}"

    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = Request(url, data=data, method=method.upper())
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", "application/json")
    if data is not None:
        req.add_header("Content-Type", "application/json")

    with urlopen(req, timeout=timeout) as resp:
        raw = resp.read()
        if not raw:
            return {}
        return json.loads(raw.decode("utf-8"))


def list_env(project_id: str, *, token: str, team_id: Optional[str]) -> list[Dict[str, Any]]:
    params: Dict[str, str] = {"decrypt": "false"}
    if team_id:
        params["teamId"] = team_id
    res = vercel_request("GET", f"/v9/projects/{project_id}/env", token=token, params=params)
    envs = res.get("envs", [])
    return envs if isinstance(envs, list) else []


def delete_env(project_id: str, env_id: str, *, token: str, team_id: Optional[str]) -> None:
    params: Dict[str, str] = {}
    if team_id:
        params["teamId"] = team_id
    vercel_request("DELETE", f"/v9/projects/{project_id}/env/{env_id}", token=token, params=params)


def create_env(
    project_id: str,
    *,
    token: str,
    team_id: Optional[str],
    key: str,
    value: str,
    targets: Iterable[str],
) -> None:
    params: Dict[str, str] = {}
    if team_id:
        params["teamId"] = team_id
    payload = {
        "key": key,
        "value": value,
        "target": list(dict.fromkeys(targets)),
        "type": "plain",
    }
    vercel_request("POST", f"/v9/projects/{project_id}/env", token=token, params=params, payload=payload)


def sync_env(
    project_id: str,
    *,
    token: str,
    team_id: Optional[str],
    key: str,
    value: Optional[str],
    targets: list[str],
    existing_envs: list[Dict[str, Any]],
) -> bool:
    if not value:
        return False

    # Remove existing entries that overlap targets.
    targets_set = set(targets)
    for env in existing_envs:
        if not isinstance(env, dict) or env.get("key") != key:
            continue
        env_targets = env.get("target")
        env_id = env.get("id")
        if not env_id or not isinstance(env_targets, list):
            continue
        if set(env_targets) & targets_set:
            try:
                delete_env(project_id, str(env_id), token=token, team_id=team_id)
            except Exception:
                pass

    create_env(project_id, token=token, team_id=team_id, key=key, value=value, targets=targets)
    return True


def trigger_deploy_hook(url: str) -> None:
    req = Request(url, data=b"{}", method="POST")
    req.add_header("Content-Type", "application/json")
    with urlopen(req, timeout=30) as resp:
        _ = resp.read()


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Sync Vercel env vars and redeploy")
    parser.add_argument("--config-path", type=Path, required=True)
    parser.add_argument("--targets", nargs="*", default=["production", "preview"])
    parser.add_argument("--site-url", default="https://soft-hub-alpha.vercel.app")
    parser.add_argument("--admin-secret-env", default="ADMIN_API_SECRET")
    parser.add_argument("--sleep-after-hook", type=int, default=10)
    args = parser.parse_args(argv)

    cfg = read_json(args.config_path)

    vercel_token = get_nested_str(cfg, "vercel", "token") or os.environ.get("VERCEL_TOKEN")
    project_id = get_nested_str(cfg, "vercel", "projectId") or os.environ.get("VERCEL_PROJECT_ID")
    team_id = get_nested_str(cfg, "vercel", "teamId") or os.environ.get("VERCEL_TEAM_ID")
    deploy_hook = get_nested_str(cfg, "vercel", "deployHookUrl") or os.environ.get("VERCEL_DEPLOY_HOOK_URL")

    if not vercel_token or not project_id:
        print("❌ Missing Vercel token or project id.", file=sys.stderr)
        return 1

    admin_secret = resolve_admin_secret(cfg, args.admin_secret_env)

    existing = list_env(project_id, token=vercel_token, team_id=team_id)

    github_owner = get_nested_str(cfg, "github", "owner")
    github_repo = get_nested_str(cfg, "github", "repo")
    github_token = get_nested_str(cfg, "github", "token")
    github_branch = get_nested_str(cfg, "github", "branch") or "main"
    github_repo_url = get_nested_str(cfg, "github", "repoUrl")

    supabase_url = get_nested_str(cfg, "supabase", "url")
    supabase_anon = get_nested_str(cfg, "supabase", "anonKey")
    supabase_service = get_nested_str(cfg, "supabase", "serviceRoleKey")

    # Keys to sync.
    to_sync: list[tuple[str, Optional[str]]] = [
        ("NEXT_PUBLIC_SITE_URL", args.site_url),
        ("GITHUB_DATA_REPO_OWNER", github_owner),
        ("GITHUB_DATA_REPO_NAME", github_repo),
        ("GITHUB_CONTENT_TOKEN", github_token),
        ("GITHUB_DATA_REPO_BRANCH", github_branch),
        ("GITHUB_DATA_REPO_URL", github_repo_url),
        ("NEXT_PUBLIC_SUPABASE_URL", supabase_url),
        ("NEXT_PUBLIC_SUPABASE_ANON_KEY", supabase_anon),
        ("SUPABASE_SERVICE_ROLE_KEY", supabase_service),
        # Optional Vercel vars used by some scripts
        ("VERCEL_PROJECT_ID", project_id),
    ]

    if admin_secret:
        to_sync.insert(0, ("ADMIN_API_SECRET", admin_secret))
    if team_id:
        to_sync.append(("VERCEL_TEAM_ID", team_id))

    changed: list[str] = []
    for key, value in to_sync:
        try:
            ok = sync_env(
                project_id,
                token=vercel_token,
                team_id=team_id,
                key=key,
                value=value,
                targets=list(args.targets),
                existing_envs=existing,
            )
            if ok:
                changed.append(key)
        except HTTPError as e:
            detail = e.read().decode("utf-8", errors="ignore") if hasattr(e, "read") else ""
            print(f"❌ Failed to set {key}: HTTP {getattr(e, 'code', '?')} {detail[:400]}", file=sys.stderr)
            return 1
        except (URLError, Exception) as e:
            print(f"❌ Failed to set {key}: {e}", file=sys.stderr)
            return 1

    print("✅ Synced env keys:")
    for k in changed:
        print(f"- {k}")

    if not deploy_hook:
        print("⚠️ No deployHookUrl found; env synced but no redeploy triggered.")
        return 0

    print("↻ Triggering redeploy hook...")
    try:
        trigger_deploy_hook(deploy_hook)
    except Exception as e:
        print(f"❌ Failed to trigger deploy hook: {e}", file=sys.stderr)
        return 1

    if args.sleep_after_hook > 0:
        time.sleep(args.sleep_after_hook)

    print("✅ Redeploy triggered.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

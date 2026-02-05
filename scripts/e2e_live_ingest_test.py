#!/usr/bin/env python3
"""End-to-end live ingest + publish test.

- Loads non-secret defaults from .local/soft-hub-admin-config.json when present.
- Reads ADMIN_API_SECRET from env or prompts securely (no echo).
- Performs POST /api/admin/ingest with publish=true.
- Polls public endpoints until the new item is visible.

Never prints secrets.
"""

from __future__ import annotations

import argparse
import json
import os
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

REPO_ROOT = Path(__file__).resolve().parents[1]
LOCAL_CONFIG_PATH = REPO_ROOT / ".local" / "soft-hub-admin-config.json"
DEFAULT_BASE_URL = "https://soft-hub-alpha.vercel.app"
DEFAULT_LOCALE = "en"
VERCEL_API_BASE = "https://api.vercel.com"


@dataclass
class Timings:
    ingest_ms: int
    seen_in_search_ms: Optional[int]
    seen_in_detail_ms: Optional[int]


def load_local_config() -> Dict[str, Any]:
    if not LOCAL_CONFIG_PATH.exists():
        return {}
    try:
        return json.loads(LOCAL_CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def load_json_config_file(path: Optional[str]) -> Dict[str, Any]:
    if not path:
        return {}
    p = Path(path)
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {}


def merge_config(primary: Dict[str, Any], fallback: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(primary, dict):
        primary = {}
    if not isinstance(fallback, dict):
        fallback = {}
    out: Dict[str, Any] = {**fallback, **primary}
    # deep merge for known top-level keys
    for key in ("github", "supabase", "vercel"):
        a = primary.get(key)
        b = fallback.get(key)
        if isinstance(a, dict) or isinstance(b, dict):
            out[key] = {**(b if isinstance(b, dict) else {}), **(a if isinstance(a, dict) else {})}
    return out


def get_nested_str(data: Dict[str, Any], *keys: str) -> Optional[str]:
    cur: Any = data
    for key in keys:
        if not isinstance(cur, dict) or key not in cur:
            return None
        cur = cur[key]
    return cur if isinstance(cur, str) and cur.strip() else None


def prompt_secret(name: str) -> str:
    value = os.environ.get(name)
    if value:
        return value

    # getpass keeps input hidden
    import getpass

    entered = getpass.getpass(f"{name}: ")
    if not entered:
        raise RuntimeError(f"Missing {name}")
    return entered


def prompt_optional_secret(name: str) -> Optional[str]:
    value = os.environ.get(name)
    if value:
        return value

    import getpass

    entered = getpass.getpass(f"{name} (leave empty to skip): ")
    if not entered:
        return None
    return entered


def http_json(method: str, url: str, *, headers: Optional[Dict[str, str]] = None, payload: Any = None, timeout: int = 25) -> Any:
    data = None
    request_headers = {"Accept": "application/json"}
    if headers:
        request_headers.update(headers)
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        request_headers["Content-Type"] = "application/json"

    req = Request(url, data=data, method=method.upper())
    for k, v in request_headers.items():
        req.add_header(k, v)

    with urlopen(req, timeout=timeout) as resp:
        raw = resp.read()
        if not raw:
            return None
        return json.loads(raw.decode("utf-8"))


def vercel_request(method: str, path: str, *, token: str, params: Optional[Dict[str, str]] = None, payload: Any = None) -> Any:
    url = f"{VERCEL_API_BASE}{path}"
    if params:
        url = f"{url}?{urlencode(params)}"

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }
    return http_json(method, url, headers=headers, payload=payload, timeout=30)


def set_vercel_env_var(
    *,
    token: str,
    project_id: str,
    team_id: Optional[str],
    key: str,
    value: str,
    targets: list[str],
) -> None:
    params: Dict[str, str] = {}
    if team_id:
        params["teamId"] = team_id

    # Remove existing env entries for this key (best-effort) then create.
    existing = vercel_request("GET", f"/v9/projects/{project_id}/env", token=token, params={**params, "decrypt": "false"})
    envs = existing.get("envs", []) if isinstance(existing, dict) else []
    for env in envs:
        if not isinstance(env, dict) or env.get("key") != key:
            continue
        env_id = env.get("id")
        env_targets = env.get("target") or []
        if not env_id or not isinstance(env_targets, list):
            continue
        if set(env_targets) & set(targets):
            try:
                vercel_request("DELETE", f"/v9/projects/{project_id}/env/{env_id}", token=token, params=params)
            except Exception:
                pass

    create_payload = {
        "key": key,
        "value": value,
        "target": targets,
        "type": "plain",
    }
    vercel_request("POST", f"/v9/projects/{project_id}/env", token=token, params=params, payload=create_payload)


def ensure_vercel_env(
    *,
    local_config: Dict[str, Any],
    admin_secret: str,
    site_url: str,
    targets: list[str],
) -> bool:
    token = os.environ.get("VERCEL_TOKEN") or get_nested_str(local_config, "vercel", "token")
    project_id = os.environ.get("VERCEL_PROJECT_ID") or get_nested_str(local_config, "vercel", "projectId")
    team_id = os.environ.get("VERCEL_TEAM_ID") or get_nested_str(local_config, "vercel", "teamId")

    if not token:
        token = prompt_optional_secret("VERCEL_TOKEN")

    if not token or not project_id:
        return False

    set_vercel_env_var(token=token, project_id=project_id, team_id=team_id, key="ADMIN_API_SECRET", value=admin_secret, targets=targets)
    set_vercel_env_var(token=token, project_id=project_id, team_id=team_id, key="NEXT_PUBLIC_SITE_URL", value=site_url, targets=targets)
    return True


def trigger_redeploy(*, local_config: Dict[str, Any]) -> bool:
    hook = os.environ.get("VERCEL_DEPLOY_HOOK_URL") or get_nested_str(local_config, "vercel", "deployHookUrl")
    if not hook:
        hook = prompt_optional_secret("VERCEL_DEPLOY_HOOK_URL")
    if not hook:
        return False

    try:
        # Deploy hook expects POST with optional payload.
        req = Request(hook, data=b"{}", method="POST")
        req.add_header("Content-Type", "application/json")
        with urlopen(req, timeout=30) as resp:
            _ = resp.read()
        return True
    except Exception:
        return False


def http_text(url: str, *, timeout: int = 25) -> str:
    req = Request(url, method="GET")
    with urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="ignore")


def now_ms() -> int:
    return int(time.time() * 1000)


def poll_until(fn, *, timeout_s: int, interval_s: float) -> Optional[int]:
    start = now_ms()
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        ok = False
        try:
            ok = bool(fn())
        except Exception:
            ok = False
        if ok:
            return now_ms() - start
        time.sleep(interval_s)
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="E2E live ingest + publish test")
    parser.add_argument(
        "--config-path",
        help="Optional path to soft-hub-admin-config.json (e.g. Downloads). Values are merged with .local config.",
    )
    parser.add_argument("--base", default=os.environ.get("SOFTHUB_BASE_URL") or DEFAULT_BASE_URL)
    parser.add_argument("--locale", default=DEFAULT_LOCALE)
    parser.add_argument("--timeout", type=int, default=180, help="Polling timeout in seconds")
    parser.add_argument("--interval", type=float, default=2.0, help="Polling interval in seconds")
    parser.add_argument("--deploy", action="store_true", help="Request deploy=true during ingest")
    parser.add_argument("--no-publish", action="store_true", help="Request publish=false during ingest")
    parser.add_argument(
        "--ensure-vercel",
        action="store_true",
        help="If ingest returns 401, try to set ADMIN_API_SECRET + NEXT_PUBLIC_SITE_URL on Vercel (needs VERCEL_TOKEN + project id) and trigger a redeploy hook, then retry once.",
    )
    parser.add_argument("--site-url", default=os.environ.get("NEXT_PUBLIC_SITE_URL") or DEFAULT_BASE_URL, help="Site canonical URL to set when --ensure-vercel is enabled")
    args = parser.parse_args()

    base = args.base.rstrip("/")
    secret = prompt_secret("ADMIN_API_SECRET")
    local_config = merge_config(load_json_config_file(args.config_path), load_local_config())

    slug = f"test-ingest-{int(time.time())}-{uuid.uuid4().hex[:6]}"

    software = {
        "slug": slug,
        "name": "Test Ingest App",
        "description": "Test via ingest endpoint",
        "version": "1.0.0",
        "downloadUrl": "https://example.com/download",
        "websiteUrl": "https://example.com",
        "type": "software",
        "platforms": ["windows"],
        "categories": ["utilities"],
        "releaseDate": "2026-02-04",
    }

    ingest_payload = {
        "software": software,
        "publish": (not args.no_publish),
        "deploy": bool(args.deploy),
    }

    ingest_url = f"{base}/api/admin/ingest"
    headers = {"Authorization": f"Bearer {secret}"}

    t0 = now_ms()
    try:
        ingest_resp = http_json("POST", ingest_url, headers=headers, payload=ingest_payload, timeout=45)
    except HTTPError as e:
        detail = e.read().decode("utf-8", errors="ignore") if hasattr(e, "read") else ""
        status = getattr(e, "code", None)
        if status == 401 and args.ensure_vercel:
            targets = ["production", "preview"]
            env_ok = ensure_vercel_env(local_config=local_config, admin_secret=secret, site_url=args.site_url, targets=targets)
            redeploy_ok = trigger_redeploy(local_config=local_config)
            if env_ok and redeploy_ok:
                time.sleep(20)
                try:
                    t1 = now_ms()
                    ingest_resp = http_json("POST", ingest_url, headers=headers, payload=ingest_payload, timeout=45)
                    ingest_ms = now_ms() - t1
                except Exception:
                    print(json.dumps({"ok": False, "stage": "ingest", "status": 401, "detail": "Unauthorized (after ensure-vercel)", "hint": "Confirm Vercel env ADMIN_API_SECRET is set for Production and redeployed."}, indent=2))
                    return 1
            else:
                print(
                    json.dumps(
                        {
                            "ok": False,
                            "stage": "ensure-vercel",
                            "status": 401,
                            "detail": "Unauthorized",
                            "hint": "Missing VERCEL_TOKEN/projectId or VERCEL_DEPLOY_HOOK_URL; cannot auto-fix env/redeploy.",
                        },
                        indent=2,
                    )
                )
                return 1
        else:
            print(json.dumps({"ok": False, "stage": "ingest", "status": status, "detail": detail[:1000]}, indent=2))
            return 1
    except URLError as e:
        print(json.dumps({"ok": False, "stage": "ingest", "error": str(e)}, indent=2))
        return 1

    ingest_ms = now_ms() - t0

    def seen_in_search() -> bool:
        params = urlencode({"query": slug, "page": "1", "perPage": "12"})
        url = f"{base}/api/search?{params}"
        data = http_json("GET", url, timeout=25)
        if not isinstance(data, dict):
            return False
        items = data.get("items")
        if not isinstance(items, list):
            return False
        return any(isinstance(it, dict) and it.get("slug") == slug for it in items)

    def seen_in_detail() -> bool:
        url = f"{base}/{args.locale}/software/{slug}"
        html = http_text(url, timeout=25)
        # Basic signal: slug appears in HTML
        return slug in html

    search_ms = poll_until(seen_in_search, timeout_s=args.timeout, interval_s=args.interval)
    detail_ms = poll_until(seen_in_detail, timeout_s=args.timeout, interval_s=args.interval)

    result = {
        "ok": True,
        "base": base,
        "slug": slug,
        "timings": {
            "ingest_ms": ingest_ms,
            "seen_in_search_ms": search_ms,
            "seen_in_detail_ms": detail_ms,
        },
        "ingest": {
            "status": "done",
            "steps": ingest_resp.get("steps") if isinstance(ingest_resp, dict) else None,
            "message": ingest_resp.get("message") if isinstance(ingest_resp, dict) else None,
        },
    }

    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

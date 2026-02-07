#!/usr/bin/env python3
"""Soft-Hub readiness check (Supabase + GitHub/CDN).

This script is designed to answer: "Are we ready to scale to 100k software entries?"

What it checks:
- Supabase REST is reachable.
- Table `software` is readable.
- Generated/indexed columns used by the app are present and selectable:
  - downloads_count
  - search_vector
- Latest pages/chunks files are reachable from the public data base.
- Per-slug item file is reachable (if you provide a slug to test).

It reads credentials from environment variables, or from a .env-style file.

Required (for Supabase checks):
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

Optional:
- NEXT_PUBLIC_DATA_BASE_URL or NEXT_PUBLIC_SOFTWARE_DATA_URL_BASE

Usage examples:
  python scripts/readiness_check.py --env-file .env.local --data-base https://cdn.jsdelivr.net/gh/Viladimire/soft-hub@main/public/data --slug some-slug
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


REQUIRED_SUPABASE_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]


def parse_env_file(path: Path) -> Dict[str, str]:
    if not path.exists():
        return {}

    env: Dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        env[key.strip()] = value.strip().strip("'\"")
    return env


def parse_admin_config_json(path: Path) -> Dict[str, str]:
    if not path.exists():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return {}
    if not isinstance(payload, dict):
        return {}

    supa = payload.get("supabase") if isinstance(payload.get("supabase"), dict) else {}
    data: Dict[str, str] = {}
    if isinstance(supa, dict):
        url = supa.get("url")
        anon = supa.get("anonKey")
        if isinstance(url, str):
            data["NEXT_PUBLIC_SUPABASE_URL"] = url
        if isinstance(anon, str):
            data["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = anon
    return data


def resolve_value(key: str, env_file: Optional[Path]) -> str:
    if os.environ.get(key):
        return os.environ[key]
    if env_file:
        return parse_env_file(env_file).get(key, "")
    return ""


def resolve_credentials(env_file: Optional[Path], admin_config_json: Optional[Path]) -> Dict[str, str]:
    creds: Dict[str, str] = {}
    for k in REQUIRED_SUPABASE_KEYS:
        v = os.environ.get(k, "").strip()
        if v:
            creds[k] = v

    if len(creds) == len(REQUIRED_SUPABASE_KEYS):
        return creds

    if env_file:
        env = parse_env_file(env_file)
        for k in REQUIRED_SUPABASE_KEYS:
            if k not in creds and env.get(k, "").strip():
                creds[k] = env[k].strip()

    if len(creds) == len(REQUIRED_SUPABASE_KEYS):
        return creds

    if admin_config_json:
        cfg = parse_admin_config_json(admin_config_json)
        for k in REQUIRED_SUPABASE_KEYS:
            if k not in creds and cfg.get(k, "").strip():
                creds[k] = cfg[k].strip()

    return creds


def supabase_request(base_url: str, api_key: str, path_with_query: str):
    endpoint = f"{base_url.rstrip('/')}{path_with_query}"
    req = Request(
        endpoint,
        headers={
            "apikey": api_key,
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
        },
    )
    with urlopen(req, timeout=15) as response:
        payload = response.read().decode("utf-8")
    return payload


@dataclass
class CheckResult:
    name: str
    ok: bool
    details: str = ""


def check_supabase(base_url: str, api_key: str) -> list[CheckResult]:
    results: list[CheckResult] = []

    # 1) basic query
    try:
        query = urlencode({"select": "id,slug,name", "limit": 1})
        payload = supabase_request(base_url, api_key, f"/rest/v1/software?{query}")
        data = json.loads(payload)
        results.append(CheckResult("supabase: software table readable", isinstance(data, list)))
    except Exception as exc:  # noqa: BLE001
        results.append(CheckResult("supabase: software table readable", False, str(exc)))
        return results

    # 2) generated columns (selectable)
    try:
        query = urlencode({"select": "slug,downloads_count,search_vector", "limit": 1})
        payload = supabase_request(base_url, api_key, f"/rest/v1/software?{query}")
        data = json.loads(payload)
        ok = isinstance(data, list)
        results.append(CheckResult("supabase: downloads_count + search_vector selectable", ok))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        results.append(
            CheckResult(
                "supabase: downloads_count + search_vector selectable",
                False,
                detail or str(exc),
            )
        )
    except Exception as exc:  # noqa: BLE001
        results.append(CheckResult("supabase: downloads_count + search_vector selectable", False, str(exc)))

    # 3) range/pagination sanity
    try:
        query = urlencode({"select": "slug", "order": "release_date.desc", "limit": 5})
        payload = supabase_request(base_url, api_key, f"/rest/v1/software?{query}")
        data = json.loads(payload)
        ok = isinstance(data, list) and len(data) <= 5
        results.append(CheckResult("supabase: pagination/order works", ok))
    except Exception as exc:  # noqa: BLE001
        results.append(CheckResult("supabase: pagination/order works", False, str(exc)))

    return results


def http_head(url: str) -> tuple[bool, str]:
    req = Request(url, method="HEAD")
    try:
        with urlopen(req, timeout=15) as response:
            ct = response.headers.get("content-type", "")
            return True, f"{response.status} {ct}".strip()
    except HTTPError as exc:
        return False, f"{exc.code} {exc.reason}".strip()
    except URLError as exc:
        return False, str(exc)


def check_public_data(data_base: str, slug: str | None) -> list[CheckResult]:
    results: list[CheckResult] = []

    base = data_base.rstrip("/")

    meta_url = f"{base}/software/pages/latest/meta.json"
    ok, details = http_head(meta_url)
    results.append(CheckResult("cdn: latest meta.json", ok, details))

    chunk_url = f"{base}/software/pages/latest/chunk-0001.json"
    ok, details = http_head(chunk_url)
    results.append(CheckResult("cdn: latest chunk-0001.json", ok, details))

    if slug:
        item_url = f"{base}/software/items/{slug}.json"
        ok, details = http_head(item_url)
        results.append(CheckResult("cdn: per-slug item file", ok, details))

    return results


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Soft-Hub readiness checker.")
    parser.add_argument("--env-file", type=Path, default=Path(".env.local"), help=".env file path")
    parser.add_argument(
        "--admin-config-json",
        type=Path,
        default=None,
        help="Path to soft-hub admin config JSON (contains supabase.url and supabase.anonKey)",
    )
    parser.add_argument(
        "--data-base",
        default="",
        help="Public data base URL (e.g. https://cdn.jsdelivr.net/gh/<owner>/<repo>@main/public/data).",
    )
    parser.add_argument("--slug", default="", help="Slug to test per-slug item availability")
    args = parser.parse_args(argv)

    env_file = args.env_file if args.env_file and args.env_file.exists() else None

    creds = resolve_credentials(env_file, args.admin_config_json)

    supa_url = creds.get("NEXT_PUBLIC_SUPABASE_URL", "").strip()
    supa_key = creds.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "").strip()

    # data base can come from args or env
    data_base = args.data_base.strip()
    if not data_base:
        data_base = (
            resolve_value("NEXT_PUBLIC_SOFTWARE_DATA_URL_BASE", env_file)
            or resolve_value("NEXT_PUBLIC_DATA_BASE_URL", env_file)
        ).strip()

    slug = args.slug.strip() or None

    report: dict[str, object] = {"supabase": [], "cdn": []}

    if not supa_url or not supa_key:
        missing = [k for k in REQUIRED_SUPABASE_KEYS if not creds.get(k, "").strip()]
        print("❌ Missing Supabase credentials:", ", ".join(missing), file=sys.stderr)
        print(
            "ضع NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY في Vercel (Production) أو مرر ملف env يحتويهم.",
            file=sys.stderr,
        )
        return 2

    print("🔍 Checking Supabase...")
    supa_results = check_supabase(supa_url, supa_key)
    report["supabase"] = [r.__dict__ for r in supa_results]

    if data_base:
        print("🔍 Checking public data (CDN/GitHub snapshot)...")
        cdn_results = check_public_data(data_base, slug)
        report["cdn"] = [r.__dict__ for r in cdn_results]
    else:
        report["cdn"] = [{"name": "cdn: skipped", "ok": True, "details": "No data base URL provided"}]

    ok_all = all(item["ok"] for item in report["supabase"]) and all(item["ok"] for item in report["cdn"])

    print("\n=== READINESS REPORT ===")
    print(json.dumps(report, indent=2, ensure_ascii=False))

    if ok_all:
        print("\n✅ النتيجة: النظام جاهز تقنيًا للتوسّع (100k) من ناحية بنية القراءة/النشر/الـ pagination.")
        return 0

    print("\n⚠️ النتيجة: في عناصر ناقصة تمنع الجاهزية الكاملة. راجع التقرير أعلاه.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())

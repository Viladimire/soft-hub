#!/usr/bin/env python3
"""Trigger a Vercel deploy via Git integration.

This script creates an empty commit and pushes it to the configured remote branch.
It is useful when Vercel REST API deploy endpoints are rate-limited.

Usage (PowerShell):
  python scripts/trigger_vercel_git_deploy.py --branch main

Notes:
- Requires git to be installed and the repo to have a remote named 'origin'.
- Will refuse to run if the working tree is dirty unless --allow-dirty is passed.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from datetime import datetime
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


def run(cmd: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        cmd,
        cwd=str(REPO_ROOT),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=check,
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Trigger deploy via git empty commit + push")
    parser.add_argument("--branch", default="main", help="Branch to push (default: main)")
    parser.add_argument("--remote", default="origin", help="Git remote name (default: origin)")
    parser.add_argument(
        "--allow-dirty",
        action="store_true",
        help="Allow running even if working tree has changes (not recommended)",
    )
    parser.add_argument(
        "--message",
        default="chore: trigger vercel deploy",
        help="Commit message prefix (default: 'chore: trigger vercel deploy')",
    )

    args = parser.parse_args(argv)

    try:
        status = run(["git", "status", "--porcelain"]).stdout.strip()
        if status and not args.allow_dirty:
            print("❌ Working tree is dirty. Commit or stash changes first (or use --allow-dirty).")
            print(status)
            return 2

        # Ensure we are on the intended branch (but don't force checkout if detached).
        head = run(["git", "rev-parse", "--abbrev-ref", "HEAD"]).stdout.strip()
        if head != args.branch:
            print(f"⚠️ You are on branch '{head}', expected '{args.branch}'.")
            print("   This script will still create an empty commit on the current branch.")

        ts = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        msg = f"{args.message} ({ts})"

        print("ℹ️ Creating empty commit:")
        print(f"   {msg}")
        run(["git", "commit", "--allow-empty", "-m", msg])

        print(f"ℹ️ Pushing to {args.remote} {args.branch}...")
        push = run(["git", "push", args.remote, f"HEAD:{args.branch}"])
        print(push.stdout.rstrip())

        print("✅ Push complete. Vercel Git integration should start a new deployment shortly.")
        print("   Next: run smoke test to verify /api/admin/auto-fill and /api/admin/scrape on alpha.")
        return 0

    except subprocess.CalledProcessError as exc:
        print("❌ Command failed:")
        print(exc.stdout or str(exc))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

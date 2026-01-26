#!/usr/bin/env python3
"""Automate database migrations, type generation, Git push, and Vercel deployment.

This script orchestrates the most common release workflow for the project by:
  1. Syncing Supabase credentials into `.env.local` (optional).
  2. Applying database migrations via Supabase CLI.
  3. Regenerating `src/lib/supabase/database.types.ts`.
  4. Committing and pushing changes to GitHub.
  5. Syncing Supabase env variables to Vercel (re-uses configure_vercel_env.py).
  6. Triggering a Vercel deployment.

Secrets are never persisted inside the repository; they are consumed from the
current process environment, CLI flags, or interactive prompts.

Example usage (interactive):

    python scripts/deploy_full_stack.py \
      --project-ref vgykkrzjxcpyvcufoybs \
      --db-url postgres://postgres:password@db.host:5432/postgres \
      --vercel-project soft-hub \
      --github-owner your-user --github-repo soft-hub

Environment variables override prompts when present:

    export SUPABASE_SERVICE_ROLE_KEY=... 
    export VERCEL_TOKEN=...
    export GITHUB_TOKEN=...
    python scripts/deploy_full_stack.py --project-ref ... --db-url ...
"""

from __future__ import annotations

import argparse
import getpass
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, Optional

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ENV_FILE = REPO_ROOT / ".env.local"
DEFAULT_CONFIG_FILE = REPO_ROOT / "deploy.secrets.env"
CONFIGURE_VERCEL_SCRIPT = REPO_ROOT / "scripts" / "configure_vercel_env.py"
DATABASE_TYPES_PATH = REPO_ROOT / "src" / "lib" / "supabase" / "database.types.ts"


class StepError(RuntimeError):
    """Raised when a deployment step fails."""


@dataclass
class DeployConfig:
    project_ref: str
    db_url: str
    supabase_url: Optional[str]
    supabase_anon: Optional[str]
    supabase_service_role: Optional[str]
    env_file: Path
    vercel_project: Optional[str]
    vercel_token: Optional[str]
    vercel_targets: Iterable[str]
    vercel_team: Optional[str]
    github_owner: Optional[str]
    github_repo: Optional[str]
    github_token: Optional[str]
    git_branch: str
    commit_message: str
    skip_env: bool
    skip_db: bool
    skip_types: bool
    skip_git: bool
    skip_vercel: bool
    dry_run: bool
    config_values: Dict[str, str]


def prompt_secret(name: str, *, default: Optional[str] = None, is_secret: bool = True) -> str:
    env_value = os.environ.get(name)
    if env_value:
        return env_value

    prompt = f"{name}" + (f" [{default}]" if default else "") + ": "
    value = (
        getpass.getpass(prompt)
        if is_secret
        else input(prompt)
    )

    if not value:
        if default is not None:
            return default
        raise StepError(f"قيمة {name} مطلوبة لإكمال العملية.")

    return value


def write_env_file(path: Path, values: Dict[str, str]) -> None:
    lines = [f"{key}={value}" for key, value in values.items() if value]
    content = "\n".join(lines) + "\n"
    path.write_text(content, encoding="utf-8")


def load_env_like_file(path: Path) -> Dict[str, str]:
    values: Dict[str, str] = {}
    if not path.exists():
        raise StepError(f"الملف {path} غير موجود.")

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip("'\"")

    if not values:
        raise StepError(f"الملف {path} لا يحتوي أي مفاتيح صالحة.")

    return values


def run(cmd: list[str], *, env: Optional[Dict[str, str]] = None, cwd: Path = REPO_ROOT) -> None:
    if not cmd:
        raise StepError("قائمة الأوامر فارغة.")

    display = " ".join(cmd if cmd[0] != "npx" else ["npx", *cmd[1:2]])
    print(f"→ تشغيل الأمر: {display}")
    if env:
        masked_env = {key: ("***" if "KEY" in key or "TOKEN" in key or "PASSWORD" in key else value) for key, value in env.items()}
        print(f"  مع البيئة: {masked_env}")
    if os.environ.get("DEBUG_DEPLOY"):
        print(f"  دليل التنفيذ: {cwd}")

    if os.environ.get("SKIP_COMMANDS"):
        print("  SKIP_COMMANDS=1 → تم التخطي لأغراض التصحيح.")
        return

    resolved_cmd = cmd.copy()
    resolved_path = shutil.which(resolved_cmd[0]) if os.path.sep not in resolved_cmd[0] else resolved_cmd[0]
    if not resolved_path:
        raise StepError(
            f"تعذّر العثور على الأداة '{resolved_cmd[0]}'. تأكد من تثبيتها وإضافتها إلى PATH."
        )
    resolved_cmd[0] = resolved_path

    result = subprocess.run(
        resolved_cmd,
        cwd=cwd,
        env=(env or os.environ),
        check=False,
        capture_output=True,
        text=True,
    )

    if result.stdout:
        print(result.stdout)
    if result.returncode != 0:
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        raise StepError(f"فشل تشغيل الأمر {' '.join(cmd)} (رمز الخروج {result.returncode}).")


def ensure_script_dependencies(config: DeployConfig) -> None:
    if not CONFIGURE_VERCEL_SCRIPT.exists():
        raise StepError("لم يتم العثور على scripts/configure_vercel_env.py")
    if config.vercel_project and not config.vercel_token:
        raise StepError("تم تحديد مشروع Vercel لكن التوكن مفقود.")
    if config.github_repo and not config.github_owner:
        raise StepError("يجب تحديد --github-owner مع --github-repo.")
    if config.config_values:
        print(f"↻ تم تحميل {len(config.config_values)} قيمة من ملف الإعدادات الخارجي.")


def handle_env_sync(config: DeployConfig) -> None:
    if config.skip_env:
        print("↷ تخطي إنشاء ملف البيئة.")
        return

    if not (config.supabase_url and config.supabase_anon):
        raise StepError("يلزم توفير متغيرات Supabase الأساسية لكتابة ملف البيئة.")

    values = {
        "NEXT_PUBLIC_SUPABASE_URL": config.supabase_url,
        "NEXT_PUBLIC_SUPABASE_ANON_KEY": config.supabase_anon,
    }
    if config.supabase_service_role:
        values["SUPABASE_SERVICE_ROLE_KEY"] = config.supabase_service_role

    print(f"↻ تحديث ملف البيئة {config.env_file.relative_to(REPO_ROOT)}")
    write_env_file(config.env_file, values)


def handle_db_migration(config: DeployConfig) -> None:
    if config.skip_db:
        print("↷ تخطي ترحيل قاعدة البيانات.")
        return

    if not config.db_url:
        raise StepError("يجب توفير --db-url لتشغيل الترحيل.")

    cmd = [
        "npx",
        "--yes",
        "supabase@latest",
        "db",
        "push",
        "--db-url",
        config.db_url,
    ]
    run(cmd)


def handle_types_generation(config: DeployConfig) -> None:
    if config.skip_types:
        print("↷ تخطي توليد الأنواع.")
        return

    if not config.db_url:
        raise StepError("يجب توفير --db-url لتوليد الأنواع.")

    cmd = [
        "npx",
        "--yes",
        "supabase@latest",
        "gen",
        "types",
        "typescript",
        "--db-url",
        config.db_url,
    ]
    print(f"↻ توليد الأنواع إلى {DATABASE_TYPES_PATH.relative_to(REPO_ROOT)}")
    with DATABASE_TYPES_PATH.open("w", encoding="utf-8") as handle:
        if os.environ.get("SKIP_COMMANDS"):
            print("// SKIPPED: تم تخطي تنفيذ الأمر أثناء التصحيح", file=handle)
            return
        proc = subprocess.run(
            cmd,
            cwd=REPO_ROOT,
            check=False,
            capture_output=True,
            text=True,
        )
        if proc.returncode != 0:
            if proc.stderr:
                print(proc.stderr, file=sys.stderr)
            raise StepError("فشل توليد الأنواع من Supabase.")
        handle.write(proc.stdout)


def handle_git_push(config: DeployConfig) -> None:
    if config.skip_git:
        print("↷ تخطي إجراءات Git.")
        return

    repo = config.github_repo
    owner = config.github_owner

    run(["git", "status", "--short"])
    run(["git", "add", "-A"])
    run(["git", "commit", "-m", config.commit_message])

    if repo and owner:
        if not config.github_token:
            raise StepError("دفع التحديثات إلى GitHub يتطلب تمرير --github-token أو متغير البيئة GITHUB_TOKEN.")
        remote_url = f"https://{config.github_token}@github.com/{owner}/{repo}.git"
        run(["git", "push", remote_url, f"HEAD:{config.git_branch}"])
    else:
        run(["git", "push", "origin", config.git_branch])


def handle_vercel_env(config: DeployConfig) -> None:
    if config.skip_vercel or not config.vercel_project:
        print("↷ تخطي تهيئة Vercel.")
        return

    args = [
        sys.executable,
        str(CONFIGURE_VERCEL_SCRIPT),
        "--project",
        config.vercel_project,
        "--env-file",
        str(config.env_file),
    ]
    if config.vercel_token:
        args.extend(["--token", config.vercel_token])
    if config.vercel_team:
        args.extend(["--team-id", config.vercel_team])

    run(args)

    env = os.environ.copy()
    if config.vercel_token:
        env["VERCEL_TOKEN"] = config.vercel_token

    deploy_cmd = [
        "npx",
        "--yes",
        "vercel",
        "--prod",
        "--confirm",
    ]
    if config.vercel_project:
        deploy_cmd.extend(["--project", config.vercel_project])
    run(deploy_cmd, env=env)


def parse_args(argv: Optional[list[str]] = None) -> DeployConfig:
    parser = argparse.ArgumentParser(description="تشغيل عملية النشر الكاملة للمنصة.")
    parser.add_argument("--project-ref", required=True, help="معرّف مشروع Supabase (مثال: abcdef123456)")
    parser.add_argument("--db-url", help="سلسلة اتصال Postgres لقاعدة Supabase.")
    parser.add_argument("--supabase-url", help="قيمة NEXT_PUBLIC_SUPABASE_URL.")
    parser.add_argument("--supabase-anon", help="قيمة NEXT_PUBLIC_SUPABASE_ANON_KEY.")
    parser.add_argument("--supabase-service-role", help="قيمة SUPABASE_SERVICE_ROLE_KEY.")
    parser.add_argument("--env-file", type=Path, default=DEFAULT_ENV_FILE, help="مسار ملف البيئة لإعادة إنشائه.")
    parser.add_argument(
        "--config-file",
        type=Path,
        default=None,
        help="ملف مفاتيح بصيغة KEY=VALUE (مثال: deploy.secrets.env) يتم تحميله بدلاً من إدخال القيم يدوياً.",
    )
    parser.add_argument("--vercel-project", help="اسم مشروع Vercel للنشر.")
    parser.add_argument("--vercel-token", help="توكن Vercel للوصول إلى API.")
    parser.add_argument("--vercel-team", help="معرّف فريق Vercel (اختياري).")
    parser.add_argument(
        "--vercel-target",
        action="append",
        default=["production"],
        dest="vercel_targets",
        help="الأهداف التي يجب تحديثها في Vercel (يمكن تكرار الخيار).",
    )
    parser.add_argument("--github-owner", help="مالِك المستودع على GitHub.")
    parser.add_argument("--github-repo", help="اسم المستودع على GitHub.")
    parser.add_argument("--github-token", help="توكن GitHub لدفع التغييرات.")
    parser.add_argument("--git-branch", default="main", help="الفرع الذي سيتم الدفع إليه.")
    parser.add_argument("--commit-message", default="chore: automated deployment", help="رسالة الالتزام.")
    parser.add_argument("--skip-env", action="store_true", help="تخطي كتابة ملف البيئة.")
    parser.add_argument("--skip-db", action="store_true", help="تخطي تشغيل الترحيل.")
    parser.add_argument("--skip-types", action="store_true", help="تخطي توليد الأنواع.")
    parser.add_argument("--skip-git", action="store_true", help="تخطي أوامر Git.")
    parser.add_argument("--skip-vercel", action="store_true", help="تخطي إعداد ونشر Vercel.")
    parser.add_argument("--dry-run", action="store_true", help="إظهار الخطوات دون تنفيذ الأوامر (يضبط SKIP_COMMANDS=1).")

    args = parser.parse_args(argv)

    if args.dry_run:
        os.environ["SKIP_COMMANDS"] = "1"

    config_values: Dict[str, str] = {}
    if args.config_file:
        config_values = load_env_like_file(args.config_file)

    def from_config(key: str, fallback: Optional[str]) -> Optional[str]:
        return fallback or config_values.get(key)

    config = DeployConfig(
        project_ref=args.project_ref,
        db_url=from_config("SUPABASE_DB_URL", args.db_url) or "",
        supabase_url=from_config("NEXT_PUBLIC_SUPABASE_URL", args.supabase_url),
        supabase_anon=from_config("NEXT_PUBLIC_SUPABASE_ANON_KEY", args.supabase_anon),
        supabase_service_role=from_config("SUPABASE_SERVICE_ROLE_KEY", args.supabase_service_role),
        env_file=args.env_file,
        vercel_project=args.vercel_project,
        vercel_token=from_config("VERCEL_TOKEN", args.vercel_token),
        vercel_targets=args.vercel_targets,
        vercel_team=from_config("VERCEL_TEAM_ID", args.vercel_team),
        github_owner=from_config("GITHUB_OWNER", args.github_owner),
        github_repo=from_config("GITHUB_REPO", args.github_repo),
        github_token=from_config("GITHUB_TOKEN", args.github_token),
        git_branch=args.git_branch,
        commit_message=args.commit_message,
        skip_env=args.skip_env,
        skip_db=args.skip_db,
        skip_types=args.skip_types,
        skip_git=args.skip_git,
        skip_vercel=args.skip_vercel,
        dry_run=args.dry_run,
        config_values=config_values,
    )

    return config


def main(argv: Optional[list[str]] = None) -> int:
    try:
        config = parse_args(argv)
        ensure_script_dependencies(config)

        if not config.skip_env:
            config.supabase_url = config.supabase_url or prompt_secret(
                "NEXT_PUBLIC_SUPABASE_URL", is_secret=False
            )
            config.supabase_anon = config.supabase_anon or prompt_secret(
                "NEXT_PUBLIC_SUPABASE_ANON_KEY"
            )
            config.supabase_service_role = config.supabase_service_role or prompt_secret(
                "SUPABASE_SERVICE_ROLE_KEY"
            )

        if not config.db_url:
            config.db_url = prompt_secret("SUPABASE_DB_URL")

        if not config.skip_vercel:
            config.vercel_token = config.vercel_token or os.environ.get("VERCEL_TOKEN")
            if not config.vercel_token and config.vercel_project:
                config.vercel_token = prompt_secret("VERCEL_TOKEN")

        if not config.skip_git and config.github_repo and not config.github_token:
            config.github_token = os.environ.get("GITHUB_TOKEN") or prompt_secret("GITHUB_TOKEN")

        handle_env_sync(config)
        handle_db_migration(config)
        handle_types_generation(config)
        handle_git_push(config)
        handle_vercel_env(config)

        print("✅ اكتملت عملية النشر بنجاح.")
        return 0

    except StepError as error:
        print(f"❌ فشل: {error}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("⚠️ تم الإيقاف اليدوي.")
        return 130


if __name__ == "__main__":
    raise SystemExit(main())

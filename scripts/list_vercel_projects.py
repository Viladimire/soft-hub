#!/usr/bin/env python3
"""List Vercel projects accessible by the provided token."""

from __future__ import annotations

import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

API_BASE = "https://api.vercel.com"


def main() -> int:
    token = os.environ.get("VERCEL_TOKEN")
    if not token:
        print("VERCEL_TOKEN env variable is required", file=sys.stderr)
        return 1

    url = f"{API_BASE}/v9/projects?limit=100"
    request = Request(url, headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    })

    try:
        with urlopen(request, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="ignore")
        print(f"HTTP error: {detail or error}", file=sys.stderr)
        return 1
    except URLError as error:
        print(f"Network error: {error}", file=sys.stderr)
        return 1

    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

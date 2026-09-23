#!/usr/bin/env python3
"""Writes the output of the Supabase MCP `generate_typescript_types` tool (saved JSON/text) to src/types/database.ts.
Usage: python3 scripts/write-db-types.py <saved-output-file>
With the Supabase CLI instead: npx supabase gen types typescript --project-id <ref> > src/types/database.ts
"""
import json, sys
raw = open(sys.argv[1]).read()
try:
    data = json.loads(raw)
    ts = data.get("types", raw) if isinstance(data, dict) else raw
except Exception:
    ts = raw
open("src/types/database.ts", "w").write(ts if ts.endswith("\n") else ts + "\n")
print(f"wrote {len(ts)} chars")

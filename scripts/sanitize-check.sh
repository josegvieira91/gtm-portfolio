#!/usr/bin/env bash
# scripts/sanitize-check.sh
#
# Pre-commit gate over sanitized n8n workflow JSON exports. See
# docs/sanitization-checklist.md for the procedure this script enforces.
#
# Usage: scripts/sanitize-check.sh [target-dir]
#   target-dir defaults to "workflows/"
#
# Exit codes:
#   0  clean — no findings
#   1  dirty — one or more rules matched, findings printed to stdout
#   2  usage error, or the local denylist / node runtime is missing
#
# Structural rules (R1-R4) are enforced via node's JSON.parse so the gate
# understands actual JSON structure instead of guessing with regex across
# raw text. node is already a hard build dependency of this project
# (package.json engines.node), so this adds no new tooling requirement.
# R5 (local denylist) and R6 (known secret shapes) run as plain line-based
# regex over the raw file text, which is sufficient for those two rules and
# keeps the fast path simple.
set -euo pipefail

usage() {
  echo "Usage: $0 [target-dir]" >&2
  echo "Scans *.json files under target-dir (default: workflows/) for n8n export leak patterns." >&2
}

if [ "$#" -gt 1 ]; then
  usage
  exit 2
fi

TARGET_DIR="${1:-workflows/}"
ALLOWLIST=".sanitize-allowlist"
DENYLIST=".sanitize-denylist.local"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is required to run this gate (structural JSON checks) but was not found on PATH." >&2
  exit 2
fi

if [ ! -f "$DENYLIST" ]; then
  echo "ERROR: $DENYLIST not found." >&2
  echo "Copy .sanitize-denylist.local.example to $DENYLIST and fill in the real values before running this gate. The gate is mandatory — a missing denylist is an error, not a skip." >&2
  exit 2
fi

if [ ! -d "$TARGET_DIR" ]; then
  echo "nothing to scan: $TARGET_DIR does not exist yet"
  exit 0
fi

FILES=$(find "$TARGET_DIR" -type f -name '*.json' 2>/dev/null || true)

if [ -z "$FILES" ]; then
  echo "nothing to scan: no *.json files under $TARGET_DIR"
  exit 0
fi

WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT

FINDINGS_FILE="$WORKDIR/findings.txt"
touch "$FINDINGS_FILE"

# --- R5: local denylist, line-based regex over raw file text ---
# Comment lines and blank lines in the denylist are filtered out before use so
# the denylist's own documentation cannot satisfy or trip the rule it defines.
# `|| [ -n "$pattern" ]` is required because bash's `read` returns non-zero on
# the final line of a file that lacks a trailing newline, which would
# otherwise silently drop that line's pattern from R5 (CR-01).
while IFS= read -r pattern || [ -n "$pattern" ]; do
  case "$pattern" in
    ''|'#'*) continue ;;
  esac
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    if grep -nE "$pattern" "$f" > "$WORKDIR/r5.tmp" 2>/dev/null; then
      while IFS= read -r m; do
        ln="${m%%:*}"
        excerpt="${m#*:}"
        printf '%s:%s: R5-DENYLIST: %s\n' "$f" "$ln" "$excerpt" >> "$FINDINGS_FILE"
      done < "$WORKDIR/r5.tmp"
    fi
  done <<< "$FILES"
done < "$DENYLIST"

# --- R6: known secret shapes, raw text ---
SECRET_PATTERN='sk-ant-|xoxb-|xoxp-|pat-na1-|ghp_|gho_|BEGIN .*PRIVATE KEY'
while IFS= read -r f; do
  [ -z "$f" ] && continue
  if grep -nE "$SECRET_PATTERN" "$f" > "$WORKDIR/r6.tmp" 2>/dev/null; then
    while IFS= read -r m; do
      ln="${m%%:*}"
      excerpt="${m#*:}"
      printf '%s:%s: R6-SECRET-SHAPE: %s\n' "$f" "$ln" "$excerpt" >> "$FINDINGS_FILE"
    done < "$WORKDIR/r6.tmp"
  fi
done <<< "$FILES"

# --- R1-R4: structural JSON checks via node ---
NODE_SCRIPT="$WORKDIR/check.cjs"
cat > "$NODE_SCRIPT" <<'JS_EOF'
const fs = require("fs");

const allowlistPath = process.env.SANITIZE_ALLOWLIST_PATH;
const files = (process.env.SANITIZE_TARGET_FILES || "").split("\n").filter(Boolean);

function loadAllowlist(p) {
  if (!p || !fs.existsSync(p)) return [];
  return fs.readFileSync(p, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

const allowlist = loadAllowlist(allowlistPath).map((h) => h.toLowerCase());

function hostAllowed(host) {
  const h = host.toLowerCase();
  if (h.endsWith("example.com")) return true;
  return allowlist.includes(h);
}

const AUTH_KEYS = ["authorization", "x-api-key", "apikey", "api_key", "bearer", "token"];
const findings = [];

function lineOf(raw, needle, fromIndex) {
  const idx = raw.indexOf(needle, fromIndex || 0);
  if (idx === -1) return { line: 1, idx: -1 };
  const line = raw.slice(0, idx).split("\n").length;
  return { line, idx };
}

function scanFile(file) {
  let raw;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch (e) {
    findings.push(file + ":1: R0-READ-ERROR: " + e.message);
    return;
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    findings.push(file + ":1: R0-PARSE-ERROR: " + e.message);
    return;
  }

  const seenIdx = {};
  function report(rule, needle, excerpt) {
    const from = seenIdx[needle] || 0;
    const found = lineOf(raw, needle, from);
    seenIdx[needle] = found.idx === -1 ? from : found.idx + needle.length;
    findings.push(file + ":" + found.line + ": " + rule + ": " + excerpt);
  }

  function checkString(key, val) {
    const urlRegex = /https?:\/\/[^\s"'\\]+/g;
    let um;
    while ((um = urlRegex.exec(val)) !== null) {
      const url = um[0];
      const hostMatch = url.match(/^https?:\/\/([^/:"'\\]+)/);
      const host = hostMatch ? hostMatch[1] : "";
      if (host && !hostAllowed(host)) {
        report("R1-HOST", url, "non-allowlisted host in \"" + key + "\": " + url);
      }
    }
    const webhookRegex = /\/webhook(-test)?\/([^/?"'\\\s]+)/g;
    let wm;
    while ((wm = webhookRegex.exec(val)) !== null) {
      if (wm[2] !== "PLACEHOLDER") {
        report("R2-WEBHOOK-PATH", wm[0], "webhook path segment not PLACEHOLDER: " + wm[2]);
      }
    }
  }

  function walk(node, ctx) {
    if (node === null || node === undefined) return;
    if (Array.isArray(node)) {
      node.forEach((item) => walk(item, ctx));
      return;
    }
    if (typeof node === "object") {
      if (ctx && ctx.inCredentials) {
        for (const [credKey, credVal] of Object.entries(node)) {
          if (credVal && typeof credVal === "object" && typeof credVal.name === "string") {
            if (!credVal.name.startsWith("PLACEHOLDER")) {
              report("R4-CREDENTIAL-NAME", credVal.name, "credential \"" + credKey + "\" name=\"" + credVal.name + "\"");
            }
          }
        }
      }

      if (typeof node.name === "string" && Object.prototype.hasOwnProperty.call(node, "value")) {
        const nameLower = node.name.toLowerCase();
        if (AUTH_KEYS.includes(nameLower)) {
          const val = node.value;
          const valStr = typeof val === "string" ? val : JSON.stringify(val);
          if (valStr !== "" && valStr !== "PLACEHOLDER") {
            report("R3-AUTH-HEADER", valStr, "header \"" + node.name + "\" value=\"" + valStr + "\"");
          }
        }
      }

      // R2 (structural): a Webhook node's real leak surface is the bare
      // `webhookId` field and `parameters.path` string — neither is embedded
      // inside a "/webhook/..." URL, so the regex-based check in checkString
      // never sees it. Flag both directly whenever the node's own `type`
      // names it a webhook node.
      if (typeof node.type === "string" && /webhook/i.test(node.type)) {
        if (typeof node.webhookId === "string" && node.webhookId !== "" && node.webhookId !== "PLACEHOLDER") {
          report("R2-WEBHOOK-ID", node.webhookId, "webhookId not PLACEHOLDER: " + node.webhookId);
        }
        const p = node.parameters && node.parameters.path;
        if (typeof p === "string" && p !== "" && p !== "PLACEHOLDER") {
          report("R2-WEBHOOK-PATH", p, "parameters.path not PLACEHOLDER: " + p);
        }
      }

      for (const [key, val] of Object.entries(node)) {
        if (typeof val === "string") {
          checkString(key, val);
        }
        const nextCtx = { inCredentials: key === "credentials" };
        walk(val, nextCtx);
      }
    }
  }

  walk(data, {});
}

files.forEach(scanFile);
findings.forEach((f) => console.log(f));
process.exit(findings.length > 0 ? 1 : 0);
JS_EOF

set +e
SANITIZE_ALLOWLIST_PATH="$ALLOWLIST" SANITIZE_TARGET_FILES="$FILES" node "$NODE_SCRIPT" >> "$FINDINGS_FILE"
set -e

TOTAL=$(wc -l < "$FINDINGS_FILE" | tr -d ' ')

if [ "$TOTAL" -gt 0 ]; then
  cat "$FINDINGS_FILE"
  echo "SUMMARY: $TOTAL finding(s)"
  exit 1
fi

echo "SUMMARY: 0 findings — clean"
exit 0

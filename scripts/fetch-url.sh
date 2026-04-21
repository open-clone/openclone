#!/usr/bin/env bash
# Fetch a URL and print its main content as markdown to stdout.
#
# Fallback for when Claude Code's WebFetch is unavailable or fails.
# Strategy: try pandoc (best for HTML→MD), then html2text, then curl-only.
#
# Usage: fetch-url.sh <url>
# Exit 0: markdown on stdout
# Exit 1: fetch failed (error on stderr)

set -eu

url="${1:-}"
if [ -z "$url" ]; then
  echo "usage: fetch-url.sh <url>" >&2
  exit 1
fi

tmp=$(mktemp -t openclone-fetch.XXXXXX)
trap 'rm -f "$tmp"' EXIT

if ! curl -fsSL -A "Mozilla/5.0 openclone" --max-time 30 "$url" -o "$tmp"; then
  echo "fetch-url: curl failed for $url" >&2
  exit 1
fi

if command -v pandoc >/dev/null 2>&1; then
  pandoc -f html -t gfm --wrap=none "$tmp" 2>/dev/null || cat "$tmp"
elif command -v html2text >/dev/null 2>&1; then
  html2text -b 0 "$tmp"
else
  # No converter available — emit raw HTML with a warning.
  echo "<!-- fetch-url: neither pandoc nor html2text found; raw HTML below -->"
  cat "$tmp"
fi
